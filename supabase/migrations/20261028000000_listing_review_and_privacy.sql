-- =========================================================
-- LISTING REVIEW, PROFILE PRIVACY, AUDIT LOG INTEGRITY
-- =========================================================
-- Fixes, in order:
--   C1. Any signed-in user could publish a parking listing straight to 'active' (skipping
--       review) because leftover policies "Owners can manage own parking spaces" (FOR ALL)
--       and "Public parking spaces readable by all" (USING true) OR'd with the stricter
--       ones. The legacy parking_locations table had the same holes, and the price
--       lookup reads it first.
--   C2. "Public profiles read" (USING true) exposed every user's email and phone number,
--       including to anonymous visitors.
--   C3. "Authorized owners and system can insert booking events" let any signed-in user
--       write audit-log entries for any booking.
--
-- Listing lifecycle after this migration:
--   owner creates -> 'pending_review' (forced) -> iDAM admin approves -> 'active'
--   An approved owner may pause ('inactive') and reopen ('active') their own listing.
--   Changing the address or map position sends it back to review.
--   Admins approve from the SQL editor (or a service_role backend):
--     UPDATE public.parking_spaces SET is_approved = TRUE, status = 'active' WHERE id = '<space id>';

-- ---------------------------------------------------------
-- C1. Parking listings require admin approval
-- ---------------------------------------------------------
ALTER TABLE public.parking_spaces ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;

DROP POLICY IF EXISTS "Owners can manage own parking spaces" ON public.parking_spaces;
DROP POLICY IF EXISTS "Public parking spaces readable by all" ON public.parking_spaces;
-- Remaining: "Anyone view active spaces" (SELECT), "Owners insert spaces" (INSERT),
-- "Owners update spaces" (UPDATE). Make UPDATE re-check ownership on the new row too.
DROP POLICY IF EXISTS "Owners update spaces" ON public.parking_spaces;
CREATE POLICY "Owners update spaces" ON public.parking_spaces FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.enforce_parking_space_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Admins (SQL editor, no JWT) and trusted backends (service_role) are not restricted
  IF auth.uid() IS NULL OR COALESCE(auth.jwt()->>'role', '') = 'service_role' THEN
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

DROP TRIGGER IF EXISTS trg_enforce_parking_space_review ON public.parking_spaces;
CREATE TRIGGER trg_enforce_parking_space_review
  BEFORE INSERT OR UPDATE ON public.parking_spaces
  FOR EACH ROW EXECUTE FUNCTION public.enforce_parking_space_review();

REVOKE ALL ON FUNCTION public.enforce_parking_space_review() FROM PUBLIC;

-- Legacy parking_locations: read-only for clients (admin-managed only)
DROP POLICY IF EXISTS "Owners can manage own parking locations" ON public.parking_locations;

-- ---------------------------------------------------------
-- C1 (cont.). Bookings only for live listings, and only car/bike
-- Body identical to 20261027000000_payment_verification_hardening.sql except the two
-- validation blocks marked NEW.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_verified_booking(
  p_space_id UUID,
  p_vehicle_type TEXT,
  p_start_time TIMESTAMPTZ,
  p_duration_hours INT,
  p_vehicle_number TEXT,
  p_driver_name TEXT,
  p_driver_phone TEXT,
  p_addons TEXT[],
  p_pass_token_hash TEXT,
  p_pass_code TEXT,
  p_payment_ref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID := auth.uid();
  v_end_time TIMESTAMPTZ;
  v_quote JSONB;
  v_booking_id UUID := gen_random_uuid();
  v_has_capacity BOOLEAN;
  v_space_lock UUID;
  v_target_space_id UUID := NULL;
  v_target_loc_id UUID := NULL;
  v_vehicle_type TEXT := LOWER(TRIM(p_vehicle_type));
BEGIN
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'UNAUTHENTICATED',
      'message', 'You must be signed in to create a verified parking booking.'
    );
  END IF;

  -- NEW: capacity is tracked per vehicle type, so only known types are allowed
  IF v_vehicle_type IS NULL OR v_vehicle_type NOT IN ('car', 'bike') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'INVALID_VEHICLE_TYPE',
      'message', 'Vehicle type must be car or bike.'
    );
  END IF;

  v_end_time := p_start_time + (p_duration_hours || ' hours')::INTERVAL;

  -- Lock the parking space row to serialize simultaneous slot bookings
  IF EXISTS (SELECT 1 FROM public.parking_spaces WHERE id = p_space_id) THEN
    SELECT id INTO v_space_lock
    FROM public.parking_spaces
    WHERE id = p_space_id
      AND status = 'active'  -- NEW: unapproved, paused or suspended listings cannot be booked
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'SPACE_UNAVAILABLE',
        'message', 'This parking space is not open for bookings.'
      );
    END IF;
    v_target_space_id := p_space_id;
  END IF;
  IF EXISTS (SELECT 1 FROM public.parking_locations WHERE id = p_space_id) THEN
    v_target_loc_id := p_space_id;
  END IF;
  -- NEW: the space must exist
  IF v_target_space_id IS NULL AND v_target_loc_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'SPACE_NOT_FOUND',
      'message', 'Parking space not found.'
    );
  END IF;

  v_has_capacity := public.check_capacity_availability(p_space_id, p_start_time, v_end_time, v_vehicle_type);
  IF NOT v_has_capacity THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'CAPACITY_EXCEEDED',
      'message', 'Selected parking spot is fully booked for this time window.'
    );
  END IF;

  v_quote := public.calculate_booking_quote(p_space_id, v_vehicle_type, p_duration_hours, p_addons);

  -- Every booking starts unpaid; it is confirmed only by verified payment
  -- (Edge Function verify-razorpay-payment / razorpay-webhook via service_role).
  INSERT INTO public.bookings (
    id,
    pass_code,
    pass_token_hash,
    parking_space_id,
    parking_location_id,
    driver_id,
    user_id,
    vehicle_type,
    vehicle_number,
    booking_date,
    start_time,
    duration_hours,
    end_time,
    base_price,
    platform_fee,
    total_amount,
    payment_method,
    payment_status,
    booking_status,
    status,
    qr_data,
    created_at
  ) VALUES (
    v_booking_id,
    p_pass_code,
    p_pass_token_hash,
    v_target_space_id,
    v_target_loc_id,
    v_driver_id,
    v_driver_id,
    v_vehicle_type,
    p_vehicle_number,
    p_start_time::DATE,
    p_start_time::TIME,
    p_duration_hours,
    v_end_time::TIME,
    (v_quote->>'base_price')::NUMERIC,
    (v_quote->>'platform_fee')::NUMERIC,
    (v_quote->>'total_amount')::NUMERIC,
    'Razorpay',
    'pending',
    'pending',
    'pending',
    'IDAM:v2:' || p_pass_code,
    NOW()
  );

  INSERT INTO public.booking_events (
    booking_id,
    event_type,
    actor_id,
    details
  ) VALUES (
    v_booking_id,
    'created',
    v_driver_id,
    jsonb_build_object(
      'quote', v_quote,
      'vehicle_number', p_vehicle_number,
      'driver_name', p_driver_name,
      'driver_phone', p_driver_phone,
      'unverified_client_payment_ref', p_payment_ref
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_booking_id,
    'pass_code', p_pass_code,
    'total_amount', (v_quote->>'total_amount')::NUMERIC,
    'start_time', p_start_time,
    'end_time', v_end_time,
    'booking_status', 'pending',
    'payment_status', 'pending'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_verified_booking(UUID, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.create_verified_booking(UUID, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.create_verified_booking(UUID, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT) TO authenticated;
  END IF;
END $$;

-- ---------------------------------------------------------
-- C2. Profiles are private to their owner
--     (pass verification reads driver names through SECURITY DEFINER functions)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- ---------------------------------------------------------
-- C3. Audit log is written only by server-side functions
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Authorized owners and system can insert booking events" ON public.booking_events;
DROP POLICY IF EXISTS "Authorized owners and system insert booking events" ON public.booking_events;
