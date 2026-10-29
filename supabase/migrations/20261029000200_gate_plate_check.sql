-- =========================================================
-- GATE CHECK-IN: QR TOKEN, OR PASS CODE + VEHICLE PLATE
-- =========================================================
-- Before: a typed pass code alone checked a car in. Pass codes are visible in the pass URL,
-- printouts and shared messages, so anyone who saw a code could park on someone else's
-- booking first. Now check-in needs one of:
--   - the secret token from the pass QR (only on the driver's phone), or
--   - the pass code AND the last 4 letters/digits of the booked vehicle's plate,
--     which the owner reads off the car at the gate.
-- Plates are compared ignoring spaces, dashes and case.

DROP FUNCTION IF EXISTS public.confirm_booking_check_in(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.normalize_plate(p_plate TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT upper(regexp_replace(COALESCE(p_plate, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.confirm_booking_check_in(
  p_booking_id UUID,
  p_pass_token_hash TEXT DEFAULT NULL,
  p_pass_code TEXT DEFAULT NULL,
  p_plate_last4 TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_owner_id UUID;
  v_has_qr_token BOOLEAN;
  v_plate TEXT;
  v_last4 TEXT := public.normalize_plate(p_plate_last4);
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'code', 'UNAUTHENTICATED', 'message', 'Authentication required to confirm check-in');
  END IF;

  -- Booking exists and the caller manages its space
  SELECT s.owner_id INTO v_owner_id
  FROM public.bookings b
  JOIN public.parking_spaces s ON b.parking_space_id = s.id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'code', 'NOT_FOUND', 'message', 'Booking not found');
  END IF;

  IF v_owner_id != auth.uid() AND (COALESCE(auth.jwt()->>'role', '') != 'service_role') THEN
    RETURN jsonb_build_object('success', FALSE, 'code', 'UNAUTHORIZED', 'message', 'You do not have permission to check in vehicles for this parking space');
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;

  IF v_booking.payment_status != 'completed' THEN
    RETURN jsonb_build_object('success', FALSE, 'code', 'UNPAID', 'message', 'Cannot check in an unpaid booking');
  END IF;

  -- Credential: the QR's secret token, or the pass code plus the vehicle plate
  v_has_qr_token := v_booking.pass_token_hash IS NOT NULL
    AND p_pass_token_hash IS NOT NULL
    AND v_booking.pass_token_hash = p_pass_token_hash;

  IF NOT v_has_qr_token THEN
    IF p_pass_code IS NULL OR LOWER(v_booking.pass_code) != LOWER(trim(p_pass_code)) THEN
      RETURN jsonb_build_object('success', FALSE, 'code', 'INVALID_PASS', 'message', 'Scan the pass QR, or enter the pass code and vehicle plate');
    END IF;
    IF length(v_last4) < 4 THEN
      RETURN jsonb_build_object('success', FALSE, 'code', 'PLATE_REQUIRED',
        'message', 'Enter the last 4 letters/digits of the vehicle plate to check in with a pass code');
    END IF;
    v_plate := public.normalize_plate(v_booking.vehicle_number);
    IF length(v_plate) < 4 OR right(v_plate, 4) != right(v_last4, 4) THEN
      RETURN jsonb_build_object('success', FALSE, 'code', 'PLATE_MISMATCH',
        'message', 'The vehicle plate does not match this booking. Do not let the vehicle in.');
    END IF;
  END IF;

  -- Atomic state transition only if still 'confirmed'
  UPDATE public.bookings
  SET booking_status = 'active',
      status = 'active',
      check_in_at = v_now,
      checked_in_by = auth.uid()
  WHERE id = p_booking_id
    AND booking_status = 'confirmed'
  RETURNING * INTO v_booking;

  IF NOT FOUND THEN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    IF FOUND AND v_booking.booking_status = 'active' THEN
      RETURN jsonb_build_object('success', TRUE, 'already_active', TRUE, 'message', 'Vehicle already checked in', 'check_in_at', v_booking.check_in_at);
    END IF;
    RETURN jsonb_build_object('success', FALSE, 'message', 'Could not confirm check-in. Booking may be cancelled, completed or invalid.');
  END IF;

  INSERT INTO public.booking_events (booking_id, event_type, actor_id, details)
  VALUES (
    p_booking_id,
    'checked_in',
    auth.uid(),
    jsonb_build_object(
      'check_in_at', v_now,
      'vehicle_number', v_booking.vehicle_number,
      'credential', CASE WHEN v_has_qr_token THEN 'qr_token' ELSE 'pass_code_and_plate' END
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Vehicle checked in successfully',
    'check_in_at', v_now,
    'booking_id', v_booking.id,
    'vehicle_number', v_booking.vehicle_number
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_booking_check_in(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.confirm_booking_check_in(UUID, TEXT, TEXT, TEXT) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.confirm_booking_check_in(UUID, TEXT, TEXT, TEXT) TO authenticated;
  END IF;
END $$;

-- ---------------------------------------------------------
-- Pass verification also returns the absolute slot times (start_at / end_at), so the gate
-- shows the slot in local time instead of the database's UTC time-of-day columns.
-- Body identical to 20261027000100_overnight_booking_window_fix.sql except those two fields.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_parking_pass(
  p_pass_token_hash TEXT,
  p_pass_code TEXT,
  p_owner_space_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_space RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Verify the calling user is the owner of the specified parking space
  SELECT * INTO v_space
  FROM public.parking_spaces
  WHERE id = p_owner_space_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'INVALID_LOCATION',
      'message', 'Parking location not found'
    );
  END IF;

  -- Verify caller is authenticated and owns this space
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'UNAUTHENTICATED',
      'message', 'Authentication required to scan or verify parking passes'
    );
  END IF;

  IF v_space.owner_id != auth.uid() AND (COALESCE(auth.jwt()->>'role', '') != 'service_role') THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'UNAUTHORIZED_SPACE',
      'message', 'You do not have permission to verify passes for this parking space'
    );
  END IF;

  -- Locate matching booking by token hash or legacy pass code
  SELECT b.*, s.title as location_title, s.address as location_address, p.full_name as driver_name
  INTO v_booking
  FROM public.bookings b
  JOIN public.parking_spaces s ON b.parking_space_id = s.id
  LEFT JOIN public.profiles p ON b.driver_id = p.id
  WHERE (p_pass_token_hash IS NOT NULL AND b.pass_token_hash = p_pass_token_hash)
     OR (p_pass_code IS NOT NULL AND LOWER(b.pass_code) = LOWER(p_pass_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'NOT_FOUND',
      'message', 'No valid booking matches this pass'
    );
  END IF;

  -- Check if pass belongs to a different owner's parking space
  IF v_booking.parking_space_id != p_owner_space_id THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'WRONG_LOCATION',
      'message', 'This pass belongs to a different parking location',
      'expected_location', v_space.title
    );
  END IF;

  -- Check status constraints
  IF v_booking.booking_status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'CANCELLED',
      'message', 'This booking was cancelled by the driver'
    );
  END IF;

  IF v_booking.booking_status = 'completed' THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'ALREADY_COMPLETED',
      'message', 'This pass has already been used and checked out',
      'check_out_at', v_booking.check_out_at
    );
  END IF;

  IF v_booking.booking_status = 'active' THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'ALREADY_ACTIVE',
      'message', 'This pass has already been used to check in',
      'check_in_at', v_booking.check_in_at,
      'booking_id', v_booking.id,
      'vehicle_number', v_booking.vehicle_number
    );
  END IF;

  -- Check payment status: only completed payments can check in
  IF v_booking.payment_status != 'completed' THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'UNPAID',
      'message', 'Payment is incomplete or pending for this pass',
      'payment_status', v_booking.payment_status
    );
  END IF;

  -- Verify arrival window (allow early arrival up to 60 minutes before start_time)
  IF v_booking.start_timestamptz - INTERVAL '60 minutes' > v_now THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'EARLY_ARRIVAL',
      'message', 'Vehicle arrived too early for reserved slot window',
      'start_time', v_booking.start_time
    );
  END IF;

  -- Verify reservation hasn't completely passed
  IF v_booking.end_timestamptz + INTERVAL '120 minutes' < v_now THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'EXPIRED',
      'message', 'This reservation window has expired',
      'end_time', v_booking.end_time
    );
  END IF;

  -- Pass is fully valid for check-in!
  RETURN jsonb_build_object(
    'is_valid', TRUE,
    'code', 'VALID',
    'message', 'Valid parking pass ready for check-in',
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'pass_code', v_booking.pass_code,
      'location_title', v_booking.location_title,
      'location_address', v_booking.location_address,
      'driver_name', COALESCE(v_booking.driver_name, 'Driver'),
      'vehicle_number', v_booking.vehicle_number,
      'vehicle_type', v_booking.vehicle_type,
      'start_time', v_booking.start_time,
      'end_time', v_booking.end_time,
      'start_at', v_booking.start_timestamptz,
      'end_at', v_booking.end_timestamptz,
      'duration_hours', v_booking.duration_hours,
      'total_amount', v_booking.total_amount,
      'payment_status', v_booking.payment_status,
      'booking_status', v_booking.booking_status
    )
  );
END;
$$;
