-- =========================================================
-- ADMIN CONSOLE
-- =========================================================
-- Server functions behind the /admin pages. Table RLS stays strict: every function is
-- SECURITY DEFINER and refuses anyone who is not an admin (profiles.role = 'admin').
-- Users cannot change their own role (protect_profile_role), so make an admin from the
-- SQL editor:
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
-- "Today" and daily buckets use India time (Asia/Kolkata).

-- ---------------------------------------------------------
-- Who is an admin
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.require_admin()
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Review bookkeeping on listings
ALTER TABLE public.parking_spaces
  ADD COLUMN IF NOT EXISTS review_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id);

-- ---------------------------------------------------------
-- Listing review trigger: admins may approve/suspend from the app
-- (body identical to 20261028000000_listing_review_and_privacy.sql except the first IF)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_parking_space_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Admins (SQL editor with no JWT, or signed-in iDAM admins) and trusted backends
  -- (service_role) are not restricted
  IF auth.uid() IS NULL OR COALESCE(auth.jwt()->>'role', '') = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_approved := FALSE;
    IF NEW.status IS DISTINCT FROM 'draft' THEN
      NEW.status := 'pending_review';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    RAISE EXCEPTION 'Only iDAM can approve parking listings' USING ERRCODE = '42501';
  END IF;

  -- Moving the listing invalidates the approval
  IF NEW.address IS DISTINCT FROM OLD.address
     OR NEW.latitude IS DISTINCT FROM OLD.latitude
     OR NEW.longitude IS DISTINCT FROM OLD.longitude THEN
    NEW.is_approved := FALSE;
    NEW.status := 'pending_review';
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'suspended' OR NEW.status = 'suspended' THEN
      RAISE EXCEPTION 'Suspended listings can only be changed by iDAM' USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'active' AND NOT OLD.is_approved THEN
      RAISE EXCEPTION 'This listing must be approved by iDAM before it can go live' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------
-- 1. Summary
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_summary()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_start TIMESTAMPTZ := date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
BEGIN
  PERFORM public.require_admin();
  RETURN jsonb_build_object(
    'generated_at', NOW(),
    'users', (SELECT jsonb_build_object(
        'total', COUNT(*),
        'admins', COUNT(*) FILTER (WHERE role = 'admin'),
        'owners', (SELECT COUNT(DISTINCT owner_id) FROM public.parking_spaces WHERE owner_id IS NOT NULL),
        'new_7d', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'))
      FROM public.profiles),
    'listings', (SELECT jsonb_build_object(
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'pending_review', COUNT(*) FILTER (WHERE status = 'pending_review'),
        'inactive', COUNT(*) FILTER (WHERE status = 'inactive'),
        'suspended', COUNT(*) FILTER (WHERE status = 'suspended'),
        'draft', COUNT(*) FILTER (WHERE status = 'draft'),
        'legacy_lots', (SELECT COUNT(*) FROM public.parking_locations))
      FROM public.parking_spaces),
    'bookings', (SELECT jsonb_build_object(
        'total', COUNT(*),
        'today', COUNT(*) FILTER (WHERE created_at >= v_today_start),
        'awaiting_payment', COUNT(*) FILTER (WHERE booking_status = 'pending'),
        'confirmed', COUNT(*) FILTER (WHERE booking_status = 'confirmed'),
        'parked_now', COUNT(*) FILTER (WHERE booking_status = 'active'),
        'completed', COUNT(*) FILTER (WHERE booking_status = 'completed'),
        'cancelled', COUNT(*) FILTER (WHERE booking_status = 'cancelled'))
      FROM public.bookings),
    'money', (SELECT jsonb_build_object(
        'paid_total', COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'completed'), 0),
        'paid_today', COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'completed' AND created_at >= v_today_start), 0),
        'paid_7d', COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'completed' AND created_at >= NOW() - INTERVAL '7 days'), 0),
        'paid_30d', COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'), 0),
        'platform_fees', COALESCE(SUM(platform_fee) FILTER (WHERE payment_status = 'completed'), 0),
        'marked_refunded', COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'refunded'), 0))
      FROM public.bookings)
  );
END;
$$;

-- ---------------------------------------------------------
-- 2. Listing requests
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_spaces(p_status TEXT DEFAULT 'pending_review')
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin();
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', s.id, 'title', s.title, 'address', s.address, 'landmark', s.landmark,
      'latitude', s.latitude, 'longitude', s.longitude, 'status', s.status, 'is_approved', s.is_approved,
      'car_capacity', s.car_capacity, 'bike_capacity', s.bike_capacity,
      'price_per_hour_car', s.price_per_hour_car, 'price_per_hour_bike', s.price_per_hour_bike,
      'image_url', s.image_url, 'created_at', s.created_at,
      'review_note', s.review_note, 'reviewed_at', s.reviewed_at,
      'owner', jsonb_build_object('id', p.id, 'name', p.full_name, 'email', p.email, 'phone', p.phone,
        'other_listings', (SELECT COUNT(*) FROM public.parking_spaces o WHERE o.owner_id = s.owner_id AND o.id <> s.id))
    ) ORDER BY s.created_at ASC)
    FROM public.parking_spaces s
    LEFT JOIN public.profiles p ON p.id = s.owner_id
    WHERE p_status IS NULL OR s.status = p_status
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_space(p_space_id UUID, p_action TEXT, p_note TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space RECORD;
BEGIN
  PERFORM public.require_admin();
  IF p_action NOT IN ('approve', 'reject', 'suspend', 'reinstate') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_ACTION', 'message', 'Action must be approve, reject, suspend or reinstate.');
  END IF;
  IF p_action IN ('reject', 'suspend') AND NULLIF(trim(COALESCE(p_note, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'NOTE_REQUIRED', 'message', 'Add a note so the owner knows why.');
  END IF;

  UPDATE public.parking_spaces
  SET is_approved = CASE p_action WHEN 'approve' THEN TRUE WHEN 'reinstate' THEN TRUE WHEN 'reject' THEN FALSE ELSE is_approved END,
      status = CASE p_action WHEN 'approve' THEN 'active' WHEN 'reinstate' THEN 'active' WHEN 'reject' THEN 'draft' ELSE 'suspended' END,
      review_note = NULLIF(trim(COALESCE(p_note, '')), ''),
      reviewed_at = NOW(),
      reviewed_by = auth.uid(),
      updated_at = NOW()
  WHERE id = p_space_id
  RETURNING id, title, status, is_approved INTO v_space;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'NOT_FOUND', 'message', 'Listing not found.');
  END IF;
  RETURN jsonb_build_object('success', TRUE, 'id', v_space.id, 'title', v_space.title, 'status', v_space.status, 'is_approved', v_space.is_approved);
END;
$$;

-- ---------------------------------------------------------
-- 3. Analytics: daily series, owners, drivers, money
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_analytics(p_days INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INT := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_from DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE - (v_days - 1);
  v_from_ts TIMESTAMPTZ := ((NOW() AT TIME ZONE 'Asia/Kolkata')::DATE - (v_days - 1))::TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
BEGIN
  PERFORM public.require_admin();
  RETURN jsonb_build_object(
    'days', v_days,
    'from', v_from,
    'daily', (
      SELECT jsonb_agg(jsonb_build_object(
        'day', d.day,
        'bookings', COALESCE(x.bookings, 0),
        'paid_bookings', COALESCE(x.paid_bookings, 0),
        'revenue', COALESCE(x.revenue, 0),
        'platform_fees', COALESCE(x.platform_fees, 0)
      ) ORDER BY d.day)
      FROM generate_series(v_from, (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE, INTERVAL '1 day') AS d(day)
      LEFT JOIN (
        SELECT (b.created_at AT TIME ZONE 'Asia/Kolkata')::DATE AS day,
               COUNT(*) AS bookings,
               COUNT(*) FILTER (WHERE b.payment_status = 'completed') AS paid_bookings,
               SUM(b.total_amount) FILTER (WHERE b.payment_status = 'completed') AS revenue,
               SUM(b.platform_fee) FILTER (WHERE b.payment_status = 'completed') AS platform_fees
        FROM public.bookings b
        WHERE b.created_at >= v_from_ts
        GROUP BY 1
      ) x ON x.day = d.day::DATE
    ),
    'totals', (
      SELECT jsonb_build_object(
        'bookings', COUNT(*),
        'paid_bookings', COUNT(*) FILTER (WHERE payment_status = 'completed'),
        'cancelled', COUNT(*) FILTER (WHERE booking_status = 'cancelled'),
        'revenue', COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'completed'), 0),
        'platform_fees', COALESCE(SUM(platform_fee) FILTER (WHERE payment_status = 'completed'), 0),
        'owner_earnings', COALESCE(SUM(total_amount - COALESCE(platform_fee, 0)) FILTER (WHERE payment_status = 'completed'), 0),
        'marked_refunded', COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'refunded'), 0),
        'avg_booking_value', COALESCE(ROUND(AVG(total_amount) FILTER (WHERE payment_status = 'completed'), 2), 0)
      )
      FROM public.bookings WHERE created_at >= v_from_ts
    ),
    'owners', COALESCE((
      SELECT jsonb_agg(row_to_json(o)::jsonb ORDER BY o.revenue DESC, o.bookings DESC)
      FROM (
        SELECT COALESCE(p.full_name, 'No owner (iDAM demo lots)') AS name, p.email, p.phone,
               COUNT(DISTINCT COALESCE(s.id, l.id)) AS listings,
               COUNT(b.id) AS bookings,
               COUNT(b.id) FILTER (WHERE b.payment_status = 'completed') AS paid_bookings,
               COALESCE(SUM(b.total_amount) FILTER (WHERE b.payment_status = 'completed'), 0) AS revenue,
               COALESCE(SUM(b.platform_fee) FILTER (WHERE b.payment_status = 'completed'), 0) AS platform_fees,
               COALESCE(SUM(b.total_amount - COALESCE(b.platform_fee, 0)) FILTER (WHERE b.payment_status = 'completed'), 0) AS earnings
        FROM public.bookings b
        LEFT JOIN public.parking_spaces s ON s.id = b.parking_space_id
        LEFT JOIN public.parking_locations l ON l.id = b.parking_location_id AND b.parking_space_id IS NULL
        LEFT JOIN public.profiles p ON p.id = COALESCE(s.owner_id, l.owner_id)
        WHERE b.created_at >= v_from_ts
        GROUP BY p.id, p.full_name, p.email, p.phone
        LIMIT 50
      ) o
    ), '[]'::jsonb),
    'drivers', COALESCE((
      SELECT jsonb_agg(row_to_json(dv)::jsonb ORDER BY dv.spent DESC, dv.bookings DESC)
      FROM (
        SELECT COALESCE(p.full_name, 'Unknown') AS name, p.email, p.phone,
               COUNT(b.id) AS bookings,
               COUNT(b.id) FILTER (WHERE b.payment_status = 'completed') AS paid_bookings,
               COUNT(b.id) FILTER (WHERE b.booking_status = 'cancelled') AS cancelled,
               COALESCE(SUM(b.total_amount) FILTER (WHERE b.payment_status = 'completed'), 0) AS spent,
               MAX(b.created_at) AS last_booking
        FROM public.bookings b
        LEFT JOIN public.profiles p ON p.id = COALESCE(b.driver_id, b.user_id)
        WHERE b.created_at >= v_from_ts
        GROUP BY p.id, p.full_name, p.email, p.phone
        LIMIT 50
      ) dv
    ), '[]'::jsonb),
    'listings', COALESCE((
      SELECT jsonb_agg(row_to_json(li)::jsonb ORDER BY li.revenue DESC, li.bookings DESC)
      FROM (
        SELECT COALESCE(s.title, l.title, 'Unknown') AS title,
               CASE WHEN s.id IS NOT NULL THEN s.status ELSE 'legacy demo lot' END AS status,
               COUNT(b.id) AS bookings,
               COALESCE(SUM(b.total_amount) FILTER (WHERE b.payment_status = 'completed'), 0) AS revenue
        FROM public.bookings b
        LEFT JOIN public.parking_spaces s ON s.id = b.parking_space_id
        LEFT JOIN public.parking_locations l ON l.id = b.parking_location_id AND b.parking_space_id IS NULL
        WHERE b.created_at >= v_from_ts
        GROUP BY s.id, l.id, s.title, l.title, s.status
        LIMIT 50
      ) li
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------
-- 4. Bookings & payments log
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_bookings(p_status TEXT DEFAULT NULL, p_search TEXT DEFAULT NULL, p_limit INT DEFAULT 100)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search TEXT := NULLIF(lower(trim(COALESCE(p_search, ''))), '');
BEGIN
  PERFORM public.require_admin();
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC)
    FROM (
      SELECT b.id, b.pass_code, b.created_at, b.start_timestamptz AS start_at, b.end_timestamptz AS end_at,
             b.vehicle_type, b.vehicle_number, b.total_amount, b.platform_fee,
             b.booking_status, b.payment_status, b.payment_id, b.razorpay_order_id,
             b.check_in_at, b.check_out_at, b.cancellation_reason,
             COALESCE(s.title, l.title) AS lot,
             p.full_name AS driver_name, p.email AS driver_email
      FROM public.bookings b
      LEFT JOIN public.parking_spaces s ON s.id = b.parking_space_id
      LEFT JOIN public.parking_locations l ON l.id = b.parking_location_id
      LEFT JOIN public.profiles p ON p.id = COALESCE(b.driver_id, b.user_id)
      WHERE (p_status IS NULL OR b.booking_status = p_status OR b.payment_status = p_status)
        AND (v_search IS NULL
             OR lower(b.pass_code) LIKE '%' || v_search || '%'
             OR lower(COALESCE(b.vehicle_number, '')) LIKE '%' || v_search || '%'
             OR lower(COALESCE(p.email, '')) LIKE '%' || v_search || '%'
             OR lower(COALESCE(p.full_name, '')) LIKE '%' || v_search || '%')
      ORDER BY b.created_at DESC
      LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
    ) r
  ), '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------
-- 5. Users
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_users(p_search TEXT DEFAULT NULL, p_limit INT DEFAULT 200)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search TEXT := NULLIF(lower(trim(COALESCE(p_search, ''))), '');
BEGIN
  PERFORM public.require_admin();
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(u)::jsonb ORDER BY u.created_at DESC)
    FROM (
      SELECT p.id, p.full_name AS name, p.email, p.phone, p.role, p.created_at,
             (SELECT COUNT(*) FROM public.parking_spaces s WHERE s.owner_id = p.id) AS listings,
             (SELECT COUNT(*) FROM public.bookings b WHERE COALESCE(b.driver_id, b.user_id) = p.id) AS bookings,
             (SELECT COALESCE(SUM(b.total_amount), 0) FROM public.bookings b
               WHERE COALESCE(b.driver_id, b.user_id) = p.id AND b.payment_status = 'completed') AS spent
      FROM public.profiles p
      WHERE v_search IS NULL
         OR lower(COALESCE(p.full_name, '')) LIKE '%' || v_search || '%'
         OR lower(COALESCE(p.email, '')) LIKE '%' || v_search || '%'
         OR COALESCE(p.phone, '') LIKE '%' || v_search || '%'
      ORDER BY p.created_at DESC
      LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000)
    ) u
  ), '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------
-- Privileges: callable only by signed-in users (each function then checks for admin)
-- ---------------------------------------------------------
DO $$
DECLARE
  f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.is_admin()',
    'public.require_admin()',
    'public.admin_summary()',
    'public.admin_list_spaces(text)',
    'public.admin_review_space(uuid, text, text)',
    'public.admin_analytics(integer)',
    'public.admin_list_bookings(text, text, integer)',
    'public.admin_list_users(text, integer)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
    END IF;
  END LOOP;
  -- The listing review trigger calls is_admin(); backend updates (service_role) run it too
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
  END IF;
END $$;
