-- =========================================================
-- OVERNIGHT BOOKING WINDOW FIX
-- =========================================================
-- bookings.start_time / end_time are TIME-of-day columns next to a single booking_date.
-- For a booking that crosses midnight (e.g. 23:30 + 2h), booking_date + end_time lands
-- *before* the start, so:
--   - verify_parking_pass rejected the pass at the gate as EXPIRED, and
--   - check_capacity_availability's OVERLAPS silently swapped the endpoints and
--     compared the wrong window, allowing or blocking the wrong bookings.
-- The table already has start_timestamptz / end_timestamptz columns that nothing filled in.
-- This migration keeps them in sync with a trigger and uses them for every window check.

-- ---------------------------------------------------------
-- 1. Keep absolute timestamps in sync with date + time + duration
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_booking_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_date IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.start_timestamptz := (NEW.booking_date + NEW.start_time)::TIMESTAMPTZ;
    NEW.end_timestamptz := NEW.start_timestamptz + make_interval(hours => COALESCE(NEW.duration_hours, 2));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_timestamps ON public.bookings;
CREATE TRIGGER trg_sync_booking_timestamps
  BEFORE INSERT OR UPDATE OF booking_date, start_time, duration_hours ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_timestamps();

REVOKE ALL ON FUNCTION public.sync_booking_timestamps() FROM PUBLIC;

-- Backfill existing rows
UPDATE public.bookings
SET start_timestamptz = (booking_date + start_time)::TIMESTAMPTZ,
    end_timestamptz = (booking_date + start_time)::TIMESTAMPTZ + make_interval(hours => COALESCE(duration_hours, 2))
WHERE booking_date IS NOT NULL AND start_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_space_window
  ON public.bookings (parking_space_id, start_timestamptz, end_timestamptz);

-- ---------------------------------------------------------
-- 2. Capacity check compares absolute windows
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_capacity_availability(
  p_space_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_vehicle_type TEXT DEFAULT 'car'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity INT;
  v_overlapping_count INT;
BEGIN
  SELECT
    CASE WHEN LOWER(p_vehicle_type) = 'bike' THEN COALESCE(bike_capacity, 5) ELSE COALESCE(car_capacity, 10) END
  INTO v_capacity
  FROM public.parking_spaces
  WHERE id = p_space_id;

  IF NOT FOUND THEN
    SELECT
      CASE WHEN LOWER(p_vehicle_type) = 'bike' THEN COALESCE(bike_capacity, 5) ELSE COALESCE(car_capacity, 10) END
    INTO v_capacity
    FROM public.parking_locations
    WHERE id = p_space_id;
  END IF;

  IF v_capacity IS NULL THEN
    v_capacity := 10;
  END IF;

  -- Unpaid bookings hold their slot for 15 minutes while the driver pays, so two drivers
  -- cannot both pay for the last bay; abandoned checkouts release the slot afterwards.
  SELECT COUNT(*)
  INTO v_overlapping_count
  FROM public.bookings
  WHERE (parking_space_id = p_space_id OR parking_location_id = p_space_id)
    AND LOWER(vehicle_type) = LOWER(p_vehicle_type)
    AND (
      booking_status IN ('confirmed', 'active')
      OR (booking_status = 'pending' AND created_at > NOW() - INTERVAL '15 minutes')
    )
    AND (
      (start_timestamptz < p_end_time AND end_timestamptz > p_start_time)
      OR (check_in_at IS NOT NULL AND check_out_at IS NULL AND (booking_status = 'active' OR status = 'active'))
    );

  RETURN (v_overlapping_count < v_capacity);
END;
$$;

-- ---------------------------------------------------------
-- 3. Gate pass check uses absolute windows
--    (body identical to 20261010000000_owner_qr_checkin.sql except the two window checks
--     and an explicit search_path for this SECURITY DEFINER function)
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
      'duration_hours', v_booking.duration_hours,
      'total_amount', v_booking.total_amount,
      'payment_status', v_booking.payment_status,
      'booking_status', v_booking.booking_status
    )
  );
END;
$$;
