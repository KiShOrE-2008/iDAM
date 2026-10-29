-- =========================================================
-- PAYMENT VERIFICATION HARDENING
-- =========================================================
-- Closes every path that let a client mark a booking as paid without paying:
--   1. verify_razorpay_payment accepted a caller-supplied secret (p_secret) and, with no
--      secret configured, accepted any signature starting with 'sig_' or 64 chars long.
--      It also never checked that the caller owned the booking.
--   2. record_payment_reconciliation was executable by every client (and by anon through
--      the PUBLIC default), so anyone could mark any booking 'completed'.
--   3. create_verified_booking marked a booking paid whenever p_payment_ref was non-empty.
--   4. Drivers could INSERT bookings directly, and payment_status defaulted to 'completed'.
--   5. Drivers and owners could UPDATE any booking column, including payment_status.
--
-- After this migration a booking only becomes paid when:
--   - verify_razorpay_payment validates Razorpay's HMAC signature using the key secret
--     stored server-side in Supabase Vault (secret name: 'razorpay_key_secret'), AND the
--     order id matches the one recorded on the booking (bookings.razorpay_order_id), or
--   - a trusted backend (service_role, e.g. a webhook Edge Function) calls
--     record_payment_reconciliation.
-- All checks fail closed: with no secret configured, no payment can be verified.

-- ---------------------------------------------------------
-- 1. New bookings start unpaid
-- ---------------------------------------------------------
ALTER TABLE public.bookings ALTER COLUMN payment_status SET DEFAULT 'pending';
ALTER TABLE public.bookings ALTER COLUMN booking_status SET DEFAULT 'pending';
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'pending';

-- ---------------------------------------------------------
-- 2. Bookings are written only through SECURITY DEFINER RPCs
--    (create_verified_booking, cancel_booking, check-in/out, payment verification).
--    Clients keep read access via "Drivers and owners view bookings".
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Drivers insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authorized users update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;

-- ---------------------------------------------------------
-- 3. Server-side Razorpay key secret lookup (Supabase Vault)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_razorpay_key_secret()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  IF to_regclass('vault.decrypted_secrets') IS NULL THEN
    RETURN NULL;
  END IF;
  EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1 LIMIT 1'
    INTO v_secret
    USING 'razorpay_key_secret';
  RETURN NULLIF(v_secret, '');
END;
$$;

-- ---------------------------------------------------------
-- 4. Signature verification: no caller-supplied secret, owner check, order binding
-- ---------------------------------------------------------
DROP FUNCTION IF EXISTS public.verify_razorpay_payment(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.verify_razorpay_payment(
  p_booking_id UUID,
  p_order_id TEXT,
  p_payment_id TEXT,
  p_signature TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_booking RECORD;
  v_secret TEXT;
  v_expected_sig TEXT;
BEGIN
  IF auth.uid() IS NULL AND COALESCE(auth.jwt()->>'role', '') != 'service_role' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHENTICATED', 'message', 'You must be signed in to verify a payment');
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND', 'message', 'Booking not found');
  END IF;

  IF COALESCE(auth.jwt()->>'role', '') != 'service_role'
     AND auth.uid() IS DISTINCT FROM v_booking.driver_id
     AND auth.uid() IS DISTINCT FROM v_booking.user_id THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN', 'message', 'You can only verify payments for your own bookings');
  END IF;

  -- Idempotent retry of an already-verified payment
  IF v_booking.payment_status = 'completed' THEN
    IF v_booking.payment_id = p_payment_id THEN
      RETURN jsonb_build_object('success', TRUE, 'booking_id', p_booking_id, 'transaction_ref', p_payment_id, 'status', 'success');
    END IF;
    RETURN jsonb_build_object('success', FALSE, 'error', 'ALREADY_PAID', 'message', 'This booking has already been paid');
  END IF;

  IF v_booking.payment_status != 'pending' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'NOT_PAYABLE', 'message', 'This booking is no longer awaiting payment');
  END IF;

  -- The order (and therefore the amount charged) must be the one created for this booking
  IF v_booking.razorpay_order_id IS NULL OR v_booking.razorpay_order_id != p_order_id THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'ORDER_MISMATCH', 'message', 'Payment order does not belong to this booking');
  END IF;

  v_secret := public.get_razorpay_key_secret();
  IF v_secret IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PAYMENT_VERIFICATION_UNAVAILABLE', 'message', 'Payment verification is not configured on the server');
  END IF;

  v_expected_sig := encode(hmac(p_order_id || '|' || p_payment_id, v_secret, 'sha256'), 'hex');
  IF p_signature IS NULL OR v_expected_sig != lower(p_signature) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_SIGNATURE', 'message', 'Cryptographic signature verification failed');
  END IF;

  IF EXISTS (SELECT 1 FROM public.payments WHERE transaction_ref = p_payment_id AND booking_id != p_booking_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PAYMENT_ALREADY_USED', 'message', 'Payment reference has already been used for another booking');
  END IF;

  RETURN public.record_payment_reconciliation(
    p_booking_id,
    p_payment_id,
    v_booking.total_amount,
    'Razorpay',
    'success',
    jsonb_build_object('order_id', p_order_id, 'verified', TRUE)
  );
END;
$$;

-- ---------------------------------------------------------
-- 5. Booking creation never trusts a client payment reference
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
BEGIN
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'UNAUTHENTICATED',
      'message', 'You must be signed in to create a verified parking booking.'
    );
  END IF;

  v_end_time := p_start_time + (p_duration_hours || ' hours')::INTERVAL;

  -- Lock the parking space row to serialize simultaneous slot bookings
  IF EXISTS (SELECT 1 FROM public.parking_spaces WHERE id = p_space_id) THEN
    SELECT id INTO v_space_lock
    FROM public.parking_spaces
    WHERE id = p_space_id
    FOR UPDATE;
    v_target_space_id := p_space_id;
  END IF;
  IF EXISTS (SELECT 1 FROM public.parking_locations WHERE id = p_space_id) THEN
    v_target_loc_id := p_space_id;
  END IF;

  v_has_capacity := public.check_capacity_availability(p_space_id, p_start_time, v_end_time, p_vehicle_type);
  IF NOT v_has_capacity THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'CAPACITY_EXCEEDED',
      'message', 'Selected parking spot is fully booked for this time window.'
    );
  END IF;

  v_quote := public.calculate_booking_quote(p_space_id, p_vehicle_type, p_duration_hours, p_addons);

  -- Every booking starts unpaid; it is confirmed only by verify_razorpay_payment
  -- or a service_role reconciliation. p_payment_ref is kept for API compatibility
  -- and recorded in the audit log as unverified client input.
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
    p_vehicle_type,
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

-- ---------------------------------------------------------
-- 6. create_payment_order: pgcrypto lives in the 'extensions' schema on Supabase, so
--    public.gen_random_bytes does not exist there. Use core gen_random_uuid() instead.
--    NOTE: this id is not a real Razorpay order. Real orders must be created by a backend
--    (Edge Function) calling the Razorpay Orders API and storing the id on
--    bookings.razorpay_order_id; until then verify_razorpay_payment fails closed.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_payment_order(
  p_space_id UUID,
  p_vehicle_type TEXT,
  p_duration_hours INT,
  p_vehicle_number TEXT,
  p_addons TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_driver_id UUID := auth.uid();
  v_quote JSONB;
  v_order_id TEXT;
  v_amount_inr NUMERIC;
  v_amount_paise BIGINT;
BEGIN
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'UNAUTHENTICATED',
      'message', 'You must be signed in to initiate a payment order.'
    );
  END IF;

  v_quote := public.calculate_booking_quote(p_space_id, p_vehicle_type, p_duration_hours, p_addons);
  v_amount_inr := (v_quote->>'total_amount')::NUMERIC;
  v_amount_paise := ROUND(v_amount_inr * 100);

  v_order_id := 'order_idam_' || replace(gen_random_uuid()::TEXT, '-', '');

  RETURN jsonb_build_object(
    'success', TRUE,
    'order_id', v_order_id,
    'amount', v_amount_inr,
    'amount_paise', v_amount_paise,
    'currency', 'INR',
    'quote', v_quote
  );
END;
$$;

-- ---------------------------------------------------------
-- 7. Function privileges. New functions are executable by PUBLIC by default (and on
--    Supabase, default privileges also grant anon/authenticated), so revoke explicitly.
-- ---------------------------------------------------------
REVOKE ALL ON FUNCTION public.record_payment_reconciliation(UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_razorpay_key_secret() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_razorpay_payment(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_verified_booking(UUID, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_payment_order(UUID, TEXT, INT, TEXT, TEXT[]) FROM PUBLIC;
-- Earlier migrations revoked these from anon only, which left PUBLIC's default EXECUTE in
-- place. cancel_booking skips its ownership check for a NULL caller, so anonymous visitors
-- could cancel (and mark refunded) any booking.
REVOKE ALL ON FUNCTION public.cancel_booking(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_booking_check_in(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_booking_check_out(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_for_owner_role(TEXT, TEXT) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.record_payment_reconciliation(UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB) FROM anon;
    REVOKE ALL ON FUNCTION public.get_razorpay_key_secret() FROM anon;
    REVOKE ALL ON FUNCTION public.verify_razorpay_payment(UUID, TEXT, TEXT, TEXT) FROM anon;
    REVOKE ALL ON FUNCTION public.create_verified_booking(UUID, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT) FROM anon;
    REVOKE ALL ON FUNCTION public.create_payment_order(UUID, TEXT, INT, TEXT, TEXT[]) FROM anon;
    REVOKE ALL ON FUNCTION public.cancel_booking(UUID, TEXT) FROM anon;
    REVOKE ALL ON FUNCTION public.confirm_booking_check_in(UUID, TEXT, TEXT) FROM anon;
    REVOKE ALL ON FUNCTION public.confirm_booking_check_out(UUID) FROM anon;
    REVOKE ALL ON FUNCTION public.apply_for_owner_role(TEXT, TEXT) FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.record_payment_reconciliation(UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB) FROM authenticated;
    REVOKE ALL ON FUNCTION public.get_razorpay_key_secret() FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.verify_razorpay_payment(UUID, TEXT, TEXT, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.create_verified_booking(UUID, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.create_payment_order(UUID, TEXT, INT, TEXT, TEXT[]) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.confirm_booking_check_in(UUID, TEXT, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.confirm_booking_check_out(UUID) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.apply_for_owner_role(TEXT, TEXT) TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.record_payment_reconciliation(UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB) TO service_role;
    GRANT EXECUTE ON FUNCTION public.verify_razorpay_payment(UUID, TEXT, TEXT, TEXT) TO service_role;
  END IF;
END $$;
