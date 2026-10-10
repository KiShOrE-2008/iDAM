-- Migration: 20261010000000_owner_qr_checkin.sql
-- Description: Adds secure check-in/check-out fields, audit events, and atomic owner verification RPC functions.

-- 1. ADD CHECK-IN & SECURITY FIELDS TO BOOKINGS
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS checked_out_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS pass_token_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_pass_token_hash ON public.bookings(pass_token_hash);
CREATE INDEX IF NOT EXISTS idx_bookings_status_space ON public.bookings(parking_space_id, booking_status);

-- 2. CREATE BOOKING EVENTS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'checked_in', 'checked_out', 'cancelled', 'expired')),
  actor_id UUID REFERENCES public.profiles(id),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON public.booking_events(booking_id);

ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view events for managed bookings"
  ON public.booking_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.parking_spaces s ON b.parking_space_id = s.id
      WHERE b.id = booking_events.booking_id
        AND (s.owner_id = auth.uid() OR b.driver_id = auth.uid())
    )
  );

CREATE POLICY "Authorized owners and system can insert booking events"
  ON public.booking_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. SECURE VERIFICATION RPC FUNCTION
-- Validates a scanned QR pass token against owner's managed parking space.
CREATE OR REPLACE FUNCTION public.verify_parking_pass(
  p_pass_token_hash TEXT,
  p_pass_code TEXT,
  p_owner_space_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

  IF auth.uid() IS NOT NULL AND v_space.owner_id = auth.uid() THEN
    v_is_authorized := TRUE;
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

  -- Verify arrival window (allow early arrival up to 60 minutes before start_time)
  IF v_booking.start_time - INTERVAL '60 minutes' > v_now THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'EARLY_ARRIVAL',
      'message', 'Vehicle arrived too early for reserved slot window',
      'start_time', v_booking.start_time
    );
  END IF;

  -- Verify reservation hasn't completely passed
  IF v_booking.end_time + INTERVAL '120 minutes' < v_now THEN
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

-- 4. ATOMIC CHECK-IN RPC FUNCTION
CREATE OR REPLACE FUNCTION public.confirm_booking_check_in(
  p_booking_id UUID,
  p_pass_token_hash TEXT DEFAULT NULL,
  p_pass_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Perform atomic state transition only if still 'confirmed'
  UPDATE public.bookings
  SET booking_status = 'active',
      check_in_at = v_now,
      checked_in_by = auth.uid()
  WHERE id = p_booking_id
    AND booking_status = 'confirmed'
    AND (
      p_pass_token_hash IS NULL OR pass_token_hash = p_pass_token_hash
      OR p_pass_code IS NULL OR LOWER(pass_code) = LOWER(p_pass_code)
    )
  RETURNING * INTO v_booking;

  IF NOT FOUND THEN
    -- Check if it was already marked active concurrently
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    IF FOUND AND v_booking.booking_status = 'active' THEN
      RETURN jsonb_build_object(
        'success', TRUE,
        'already_active', TRUE,
        'message', 'Vehicle already checked in',
        'check_in_at', v_booking.check_in_at
      );
    ELSE
      RETURN jsonb_build_object(
        'success', FALSE,
        'message', 'Could not confirm check-in. Booking may be cancelled, completed or invalid.'
      );
    END IF;
  END IF;

  -- Record audit event
  INSERT INTO public.booking_events (booking_id, event_type, actor_id, details)
  VALUES (
    p_booking_id,
    'checked_in',
    auth.uid(),
    jsonb_build_object(
      'check_in_at', v_now,
      'vehicle_number', v_booking.vehicle_number
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

-- 5. ATOMIC CHECK-OUT RPC FUNCTION
CREATE OR REPLACE FUNCTION public.confirm_booking_check_out(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Perform atomic state transition only if still 'active'
  UPDATE public.bookings
  SET booking_status = 'completed',
      check_out_at = v_now,
      checked_out_by = auth.uid()
  WHERE id = p_booking_id
    AND booking_status = 'active'
  RETURNING * INTO v_booking;

  IF NOT FOUND THEN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    IF FOUND AND v_booking.booking_status = 'completed' THEN
      RETURN jsonb_build_object(
        'success', TRUE,
        'already_completed', TRUE,
        'message', 'Vehicle already checked out',
        'check_out_at', v_booking.check_out_at
      );
    ELSE
      RETURN jsonb_build_object(
        'success', FALSE,
        'message', 'Could not check out vehicle. Booking is not in active state.'
      );
    END IF;
  END IF;

  -- Record audit event
  INSERT INTO public.booking_events (booking_id, event_type, actor_id, details)
  VALUES (
    p_booking_id,
    'checked_out',
    auth.uid(),
    jsonb_build_object(
      'check_out_at', v_now,
      'duration_minutes', EXTRACT(EPOCH FROM (v_now - COALESCE(v_booking.check_in_at, v_booking.start_time))) / 60
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Vehicle checked out successfully',
    'check_out_at', v_now,
    'booking_id', v_booking.id
  );
END;
$$;
