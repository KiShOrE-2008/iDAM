-- =====================================================================
-- iDAM: complete database setup for a fresh Supabase project
-- =====================================================================
-- HOW TO USE
--   Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   It runs in one transaction: if anything fails, nothing is applied.
--   Safe to run again: every statement is idempotent.
--
-- GENERATED FILE: concatenation of supabase/migrations/*.sql in filename order.
-- Do not edit by hand. Regenerate after changing a migration with:
--   bash scripts/build-setup-sql.sh
--
-- AFTER RUNNING (for real payments, later):
--   Store the Razorpay key secret in Vault (Project Settings -> Vault, or SQL):
--     SELECT vault.create_secret('<your rzp key secret>', 'razorpay_key_secret');
--   Until then, payment verification fails closed and bookings stay 'pending'.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PREAMBLE: remove leftover copies of this app's functions
-- =====================================================================
-- A project that ran an older schema can still hold these functions with a different
-- signature or return type, which makes CREATE OR REPLACE fail ("cannot change return
-- type of existing function"). Drop every overload of exactly the functions defined
-- below (all are recreated by this file). CASCADE also drops triggers that call them;
-- the migrations recreate those too. Functions owned by extensions (e.g. PostGIS) are kept.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY['admin_analytics','admin_list_bookings','admin_list_spaces','admin_list_users','admin_review_space','admin_summary','apply_for_owner_role','calculate_booking_quote','cancel_booking','check_capacity_availability','confirm_booking_check_in','confirm_booking_check_out','create_payment_order','create_verified_booking','enforce_parking_space_review','get_razorpay_key_secret','handle_new_user','is_admin','nearby_parking','normalize_plate','protect_profile_role','record_payment_reconciliation','require_admin','search_nearby_parking','sync_booking_timestamps','update_parking_location_geography','update_parking_space_location','verify_parking_pass','verify_razorpay_payment'])
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;
END $$;


-- =====================================================================
-- MIGRATION: 20260912000000_initial_schema.sql
-- =====================================================================

-- Enable PostGIS extension for geo-spatial distance & radius queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Profiles Table (Drivers & Space Owners)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT 'iDAM User',
  phone TEXT DEFAULT '',
  role TEXT CHECK (role IN ('driver', 'owner', 'admin')) DEFAULT 'driver',
  owner_status TEXT CHECK (owner_status IN ('none', 'pending_review', 'approved', 'rejected')) DEFAULT 'none',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Authoritative Parking Spaces Table
CREATE TABLE IF NOT EXISTS public.parking_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  title_ta TEXT,
  description TEXT,
  address TEXT NOT NULL,
  landmark TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  price_per_hour_car NUMERIC(10, 2) NOT NULL DEFAULT 40.00,
  price_per_hour_bike NUMERIC(10, 2) NOT NULL DEFAULT 20.00,
  car_capacity INTEGER NOT NULL DEFAULT 10,
  bike_capacity INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'pending_review', 'active', 'inactive', 'suspended')),
  rating NUMERIC(3, 2) DEFAULT 4.7,
  reviews_count INTEGER DEFAULT 1,
  amenities TEXT[] DEFAULT ARRAY['Car', 'Bike', 'CCTV', 'Well lit'],
  operating_hours TEXT DEFAULT '8:00 AM - 10:00 PM',
  image_url TEXT,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2b. Parking Locations Table (Maintained for Legacy Compatibility)
CREATE TABLE IF NOT EXISTS public.parking_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  title_ta TEXT,
  address TEXT NOT NULL,
  landmark TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  hourly_rate_car NUMERIC(10, 2) NOT NULL DEFAULT 30.00,
  hourly_rate_bike NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
  total_spots INTEGER NOT NULL DEFAULT 10,
  available_spots INTEGER NOT NULL DEFAULT 10,
  amenities TEXT[] DEFAULT ARRAY['Car', 'Bike', 'CCTV', 'Well lit'],
  operating_hours TEXT DEFAULT '8:00 AM - 10:00 PM',
  image_url TEXT,
  rating NUMERIC(3, 2) DEFAULT 4.7,
  reviews_count INTEGER DEFAULT 38,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for ultrafast radius searches
CREATE INDEX IF NOT EXISTS idx_parking_locations_location ON public.parking_locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_location ON public.parking_spaces USING GIST(location);

-- 3. Bookings Table (Supporting Both Canonical & Legacy Fields)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_code TEXT UNIQUE NOT NULL, -- e.g. IDM-82931
  pass_token_hash TEXT,
  driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  parking_space_id UUID REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  parking_location_id UUID REFERENCES public.parking_locations(id) ON DELETE SET NULL,
  vehicle_type TEXT CHECK (vehicle_type IN ('car', 'bike', 'suv', 'ev')) DEFAULT 'car',
  vehicle_number TEXT DEFAULT 'TN 59 AB 1234',
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 2,
  end_time TIME NOT NULL,
  base_price NUMERIC(10, 2) NOT NULL,
  platform_fee NUMERIC(10, 2) DEFAULT 5.00,
  addons_fee NUMERIC(10, 2) DEFAULT 0.00,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'UPI',
  payment_status TEXT CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'completed',
  payment_id TEXT,
  razorpay_order_id TEXT,
  booking_status TEXT CHECK (booking_status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired')) DEFAULT 'confirmed',
  status TEXT CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired')) DEFAULT 'confirmed',
  qr_data TEXT NOT NULL,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES public.profiles(id),
  checked_out_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto sync location column from lat/lng on insert/update
CREATE OR REPLACE FUNCTION update_parking_location_geography()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_parking_location_geography ON public.parking_locations;
CREATE TRIGGER trg_update_parking_location_geography
BEFORE INSERT OR UPDATE ON public.parking_locations
FOR EACH ROW EXECUTE FUNCTION update_parking_location_geography();

-- PostGIS function to search nearby parking spaces in meters
CREATE OR REPLACE FUNCTION search_nearby_parking(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  title_ta TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  hourly_rate_car NUMERIC,
  hourly_rate_bike NUMERIC,
  available_spots INTEGER,
  distance_meters DOUBLE PRECISION,
  rating NUMERIC,
  image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.title_ta,
    p.address,
    p.latitude,
    p.longitude,
    p.hourly_rate_car,
    p.hourly_rate_bike,
    p.available_spots,
    ST_Distance(p.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) AS distance_meters,
    p.rating,
    p.image_url
  FROM public.parking_locations p
  WHERE ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_meters)
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public parking spaces readable by all" ON public.parking_spaces;
CREATE POLICY "Public parking spaces readable by all" ON public.parking_spaces FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage own parking spaces" ON public.parking_spaces;
CREATE POLICY "Owners can manage own parking spaces" ON public.parking_spaces FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Public parking locations readable by all" ON public.parking_locations;
CREATE POLICY "Public parking locations readable by all" ON public.parking_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage own parking locations" ON public.parking_locations;
CREATE POLICY "Owners can manage own parking locations" ON public.parking_locations FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can read own bookings" ON public.bookings;
CREATE POLICY "Users can read own bookings" ON public.bookings FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = driver_id OR auth.uid() IN (
    SELECT owner_id FROM public.parking_spaces WHERE id = parking_space_id
  ) OR auth.uid() IN (
    SELECT owner_id FROM public.parking_locations WHERE id = parking_location_id
  )
);

DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (auth.uid() = user_id OR auth.uid() = driver_id)
);


-- =====================================================================
-- MIGRATION: 20261010000000_owner_qr_checkin.sql
-- =====================================================================

-- Migration: 20261010000000_owner_qr_checkin.sql
-- Description: Adds secure check-in/check-out fields, audit events, and atomic owner verification RPC functions.

-- 1. ADD CHECK-IN & SECURITY FIELDS TO BOOKINGS
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS parking_space_id UUID REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS booking_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (booking_status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired')),
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS checked_out_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS pass_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_pass_token_hash ON public.bookings(pass_token_hash);
CREATE INDEX IF NOT EXISTS idx_bookings_status_space ON public.bookings(parking_space_id, booking_status);

-- 2. CREATE BOOKING EVENTS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'quote_generated', 'paid', 'checked_in', 'checked_out', 'cancelled', 'expired')),
  actor_id UUID REFERENCES public.profiles(id),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON public.booking_events(booking_id);

ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

-- 2b. CREATE PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL DEFAULT 'Razorpay',
  transaction_ref TEXT UNIQUE NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('pending', 'completed', 'success', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view events for managed bookings" ON public.booking_events;
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

DROP POLICY IF EXISTS "Authorized owners and system can insert booking events" ON public.booking_events;
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
  IF (v_booking.booking_date + v_booking.start_time)::TIMESTAMPTZ - INTERVAL '60 minutes' > v_now THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'EARLY_ARRIVAL',
      'message', 'Vehicle arrived too early for reserved slot window',
      'start_time', v_booking.start_time
    );
  END IF;

  -- Verify reservation hasn't completely passed
  IF (v_booking.booking_date + v_booking.end_time)::TIMESTAMPTZ + INTERVAL '120 minutes' < v_now THEN
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
  v_owner_id UUID;
BEGIN
  -- Reject unauthenticated callers
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'code', 'UNAUTHENTICATED',
      'message', 'Authentication required to confirm check-in'
    );
  END IF;

  -- Verify booking exists and caller manages the space
  SELECT s.owner_id INTO v_owner_id
  FROM public.bookings b
  JOIN public.parking_spaces s ON b.parking_space_id = s.id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'code', 'NOT_FOUND', 'message', 'Booking not found');
  END IF;

  IF v_owner_id != auth.uid() AND (COALESCE(auth.jwt()->>'role', '') != 'service_role') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'code', 'UNAUTHORIZED',
      'message', 'You do not have permission to check in vehicles for this parking space'
    );
  END IF;

  -- Check existing booking state
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;

  -- Reject if payment is incomplete
  IF v_booking.payment_status != 'completed' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'code', 'UNPAID',
      'message', 'Cannot check in an unpaid booking'
    );
  END IF;

  -- Token verification: require matching token hash when pass_token_hash is present on booking
  IF v_booking.pass_token_hash IS NOT NULL THEN
    IF p_pass_token_hash IS NULL OR v_booking.pass_token_hash != p_pass_token_hash THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'code', 'INVALID_TOKEN',
        'message', 'Pass token hash does not match booking credential'
      );
    END IF;
  ELSE
    IF p_pass_code IS NULL OR LOWER(v_booking.pass_code) != LOWER(p_pass_code) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'code', 'INVALID_PASS_CODE',
        'message', 'Pass code does not match booking'
      );
    END IF;
  END IF;

  -- Perform atomic state transition only if still 'confirmed'
  UPDATE public.bookings
  SET booking_status = 'active',
      status = 'active',
      check_in_at = v_now,
      checked_in_by = auth.uid()
  WHERE id = p_booking_id
    AND booking_status = 'confirmed'
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
        'message', 'Could not confirm check-in. Booking may be cancelled, completed, invalid or token mismatched.'
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
  v_owner_id UUID;
BEGIN
  -- Reject unauthenticated callers
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'code', 'UNAUTHENTICATED',
      'message', 'Authentication required to confirm check-out'
    );
  END IF;

  -- Verify booking exists and caller manages the space
  SELECT s.owner_id INTO v_owner_id
  FROM public.bookings b
  JOIN public.parking_spaces s ON b.parking_space_id = s.id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'code', 'NOT_FOUND', 'message', 'Booking not found');
  END IF;

  IF v_owner_id != auth.uid() AND (COALESCE(auth.jwt()->>'role', '') != 'service_role') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'code', 'UNAUTHORIZED',
      'message', 'You do not have permission to check out vehicles for this parking space'
    );
  END IF;

  -- Perform atomic state transition only if still 'active'
  UPDATE public.bookings
  SET booking_status = 'completed',
      status = 'completed',
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
      'duration_minutes', ROUND(EXTRACT(EPOCH FROM (v_now - COALESCE(v_booking.check_in_at, (v_booking.booking_date + v_booking.start_time)::TIMESTAMPTZ, v_now))) / 60)
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


-- =====================================================================
-- MIGRATION: 20261010010000_idam_v2_core_security.sql
-- =====================================================================

-- Migration: 20261010010000_idam_v2_core_security.sql
-- Description: Core security enhancements for iDAM V2:
-- 1. PostGIS and btree_gist extensions
-- 2. Unified parking_locations / parking_spaces compatibility
-- 3. Overlap concurrency prevention function
-- 4. Trusted server-side pricing quote RPC
-- 5. Atomic booking creation RPC
-- 6. Strict RLS preventing client-tampered status/pricing updates

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 1. Ensure parking_locations has all required fields & compatibility
ALTER TABLE IF EXISTS public.parking_locations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'pending_review', 'active', 'inactive', 'suspended')),
  ADD COLUMN IF NOT EXISTS car_capacity INT DEFAULT 10,
  ADD COLUMN IF NOT EXISTS bike_capacity INT DEFAULT 5;

-- 2. Server-side quote calculator RPC
-- Eliminates client price tampering by calculating all totals from database rates
CREATE OR REPLACE FUNCTION public.calculate_booking_quote(
  p_space_id UUID,
  p_vehicle_type TEXT DEFAULT 'car',
  p_duration_hours INT DEFAULT 2,
  p_addons TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate NUMERIC(10,2);
  v_base NUMERIC(10,2);
  v_platform_fee NUMERIC(10,2) := 5.00;
  v_addons_fee NUMERIC(10,2) := 0.00;
  v_total NUMERIC(10,2);
  v_addon TEXT;
  v_title TEXT;
BEGIN
  -- Validate duration
  IF p_duration_hours < 1 OR p_duration_hours > 72 THEN
    RAISE EXCEPTION 'Duration must be between 1 and 72 hours';
  END IF;

  -- Look up rate from parking_locations or parking_spaces
  SELECT 
    CASE WHEN LOWER(p_vehicle_type) = 'bike' THEN COALESCE(hourly_rate_bike, 15.00) ELSE COALESCE(hourly_rate_car, 30.00) END,
    title
  INTO v_rate, v_title
  FROM public.parking_locations
  WHERE id = p_space_id;

  IF NOT FOUND THEN
    -- Fallback to parking_spaces if present
    BEGIN
      SELECT 
        CASE WHEN LOWER(p_vehicle_type) = 'bike' THEN COALESCE(price_per_hour_bike, 15.00) ELSE COALESCE(price_per_hour_car, 30.00) END,
        title
      INTO v_rate, v_title
      FROM public.parking_spaces
      WHERE id = p_space_id;
    EXCEPTION WHEN OTHERS THEN
      v_rate := NULL;
    END;
  END IF;

  IF v_rate IS NULL THEN
    v_rate := CASE WHEN LOWER(p_vehicle_type) = 'bike' THEN 20.00 ELSE 40.00 END;
    v_title := 'Smart Parking Lot';
  END IF;

  v_base := v_rate * p_duration_hours;

  -- Calculate add-ons fee securely on server
  IF p_addons IS NOT NULL THEN
    FOREACH v_addon IN ARRAY p_addons LOOP
      IF LOWER(v_addon) LIKE '%ev%' THEN
        v_addons_fee := v_addons_fee + (30.00 * p_duration_hours);
      ELSIF LOWER(v_addon) LIKE '%wash%' THEN
        v_addons_fee := v_addons_fee + 150.00;
      ELSIF LOWER(v_addon) LIKE '%valet%' THEN
        v_addons_fee := v_addons_fee + 50.00;
      ELSIF LOWER(v_addon) LIKE '%protection%' OR LOWER(v_addon) LIKE '%insurance%' THEN
        v_addons_fee := v_addons_fee + 10.00;
      END IF;
    END LOOP;
  END IF;

  v_total := v_base + v_addons_fee + v_platform_fee;

  RETURN jsonb_build_object(
    'space_id', p_space_id,
    'space_title', v_title,
    'vehicle_type', p_vehicle_type,
    'hourly_rate', v_rate,
    'duration_hours', p_duration_hours,
    'base_price', v_base,
    'addons_fee', v_addons_fee,
    'platform_fee', v_platform_fee,
    'total_amount', v_total
  );
END;
$$;

-- 3. Concurrency Protection & Overlap Check Function
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
  -- Get total capacity for vehicle type from parking_spaces first, then fallback to parking_locations
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

  -- Count existing active or confirmed reservations overlapping this time window
  SELECT COUNT(*)
  INTO v_overlapping_count
  FROM public.bookings
  WHERE (parking_space_id = p_space_id OR parking_location_id = p_space_id)
    AND LOWER(vehicle_type) = LOWER(p_vehicle_type)
    AND (booking_status IN ('confirmed', 'active') OR status IN ('confirmed', 'active'))
    AND (
      ((booking_date + start_time), (booking_date + end_time)) OVERLAPS (p_start_time::TIMESTAMP, p_end_time::TIMESTAMP)
      OR (check_in_at IS NOT NULL AND check_out_at IS NULL AND (booking_status = 'active' OR status = 'active'))
    );

  RETURN (v_overlapping_count < v_capacity);
END;
$$;

-- 4. Atomic Server-Side Booking Creation RPC
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
BEGIN
  -- Reject unauthenticated callers
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'UNAUTHENTICATED',
      'message', 'You must be signed in to create a verified parking booking.'
    );
  END IF;

  v_end_time := p_start_time + (p_duration_hours || ' hours')::INTERVAL;

  -- Concurrency Protection: Lock the target parking space row to serialize simultaneous slot bookings
  IF EXISTS (SELECT 1 FROM public.parking_spaces WHERE id = p_space_id) THEN
    SELECT id INTO v_space_lock
    FROM public.parking_spaces
    WHERE id = p_space_id
    FOR UPDATE;
  END IF;

  -- 1. Check Capacity Lock
  v_has_capacity := public.check_capacity_availability(p_space_id, p_start_time, v_end_time, p_vehicle_type);
  IF NOT v_has_capacity THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'CAPACITY_EXCEEDED',
      'message', 'Selected parking spot is fully booked for this time window.'
    );
  END IF;

  -- 2. Calculate Server Pricing Authoritatively
  v_quote := public.calculate_booking_quote(p_space_id, p_vehicle_type, p_duration_hours, p_addons);

  -- Anti-replay: Reject if payment reference has already been used for another booking
  IF p_payment_ref IS NOT NULL AND p_payment_ref != '' THEN
    IF EXISTS (SELECT 1 FROM public.payments WHERE transaction_ref = p_payment_ref) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'PAYMENT_ALREADY_USED',
        'message', 'Payment reference has already been used for another booking.'
      );
    END IF;
  END IF;

  -- Safely bind canonical and legacy foreign keys
  DECLARE
    v_target_space_id UUID := NULL;
    v_target_loc_id UUID := NULL;
    v_payment_status TEXT := CASE WHEN p_payment_ref IS NOT NULL AND p_payment_ref != '' THEN 'completed' ELSE 'pending' END;
    v_booking_status TEXT := CASE WHEN p_payment_ref IS NOT NULL AND p_payment_ref != '' THEN 'confirmed' ELSE 'pending' END;
  BEGIN
    IF EXISTS (SELECT 1 FROM public.parking_spaces WHERE id = p_space_id) THEN
      v_target_space_id := p_space_id;
    END IF;
    IF EXISTS (SELECT 1 FROM public.parking_locations WHERE id = p_space_id) THEN
      v_target_loc_id := p_space_id;
    END IF;

    -- 3. Insert Booking Record into Canonical Schema
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
      payment_id,
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
      v_payment_status,
      p_payment_ref,
      v_booking_status,
      v_booking_status,
      'IDAM:v2:' || p_pass_code,
      NOW()
    );
  END;

  -- 4. Record Payment Transaction (if transaction reference provided)
  IF p_payment_ref IS NOT NULL AND p_payment_ref != '' THEN
    INSERT INTO public.payments (
      booking_id,
      amount,
      payment_method,
      transaction_ref,
      status,
      created_at
    ) VALUES (
      v_booking_id,
      (v_quote->>'total_amount')::NUMERIC,
      'Razorpay',
      p_payment_ref,
      'success',
      NOW()
    )
    ON CONFLICT (transaction_ref) DO NOTHING;
  END IF;

  -- 5. Audit Log
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
      'payment_ref', p_payment_ref
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_booking_id,
    'pass_code', p_pass_code,
    'total_amount', (v_quote->>'total_amount')::NUMERIC,
    'start_time', p_start_time,
    'end_time', v_end_time,
    'booking_status', CASE WHEN p_payment_ref IS NOT NULL AND p_payment_ref != '' THEN 'confirmed' ELSE 'pending' END,
    'payment_status', CASE WHEN p_payment_ref IS NOT NULL AND p_payment_ref != '' THEN 'completed' ELSE 'pending' END
  );
END;
$$;

-- 5. Server-Side Razorpay Order Creation RPC
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

  -- Authoritatively calculate quote from space rates
  v_quote := public.calculate_booking_quote(p_space_id, p_vehicle_type, p_duration_hours, p_addons);
  v_amount_inr := (v_quote->>'total_amount')::NUMERIC;
  v_amount_paise := ROUND(v_amount_inr * 100);

  -- Deterministic server order ID
  v_order_id := 'order_idam_' || encode(public.gen_random_bytes(10), 'hex');

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

-- 6. Idempotent Payment Reconciliation RPC (Webhooks & Verified Callbacks)
CREATE OR REPLACE FUNCTION public.record_payment_reconciliation(
  p_booking_id UUID,
  p_transaction_ref TEXT,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'Razorpay',
  p_status TEXT DEFAULT 'success',
  p_gateway_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_payment_id UUID;
BEGIN
  -- Verify booking exists
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND', 'message', 'Booking not found');
  END IF;

  -- Anti-replay: Verify transaction reference does not belong to a different booking
  IF EXISTS (SELECT 1 FROM public.payments WHERE transaction_ref = p_transaction_ref AND booking_id != p_booking_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PAYMENT_ALREADY_USED', 'message', 'Payment reference has already been reconciled with another booking');
  END IF;

  -- Insert or update payment idempotently
  INSERT INTO public.payments (
    booking_id,
    amount,
    payment_method,
    transaction_ref,
    status,
    created_at
  ) VALUES (
    p_booking_id,
    p_amount,
    p_payment_method,
    p_transaction_ref,
    p_status,
    NOW()
  )
  ON CONFLICT (transaction_ref) DO UPDATE
    SET status = EXCLUDED.status,
        updated_at = NOW()
  RETURNING id INTO v_payment_id;

  -- Reconcile booking state
  IF p_status IN ('success', 'completed') THEN
    UPDATE public.bookings
    SET payment_status = 'completed',
        payment_id = p_transaction_ref,
        booking_status = CASE WHEN booking_status = 'pending' THEN 'confirmed' ELSE booking_status END,
        status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
        updated_at = NOW()
    WHERE id = p_booking_id;
  ELSIF p_status = 'failed' THEN
    UPDATE public.bookings
    SET payment_status = 'failed',
        booking_status = CASE WHEN booking_status = 'pending' THEN 'cancelled' ELSE booking_status END,
        status = CASE WHEN status = 'pending' THEN 'cancelled' ELSE status END,
        updated_at = NOW()
    WHERE id = p_booking_id;
  ELSIF p_status = 'refunded' THEN
    UPDATE public.bookings
    SET payment_status = 'refunded',
        booking_status = 'cancelled',
        status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_booking_id;
  END IF;

  -- Record audit event
  INSERT INTO public.booking_events (
    booking_id,
    event_type,
    actor_id,
    details
  ) VALUES (
    p_booking_id,
    CASE WHEN p_status = 'refunded' THEN 'cancelled' ELSE 'paid' END,
    auth.uid(),
    jsonb_build_object(
      'payment_id', v_payment_id,
      'transaction_ref', p_transaction_ref,
      'amount', p_amount,
      'status', p_status,
      'gateway_payload', p_gateway_payload
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'payment_id', v_payment_id,
    'booking_id', p_booking_id,
    'transaction_ref', p_transaction_ref,
    'status', p_status
  );
END;
$$;

-- 7. Cryptographic Server-Side Signature Verification RPC
CREATE OR REPLACE FUNCTION public.verify_razorpay_payment(
  p_booking_id UUID,
  p_order_id TEXT,
  p_payment_id TEXT,
  p_signature TEXT,
  p_secret TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_secret TEXT;
  v_expected_sig TEXT;
  v_is_valid BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND', 'message', 'Booking not found');
  END IF;

  -- Anti-replay: Check if payment ID has already been reconciled with another booking
  IF EXISTS (SELECT 1 FROM public.payments WHERE transaction_ref = p_payment_id AND booking_id != p_booking_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PAYMENT_ALREADY_USED', 'message', 'Payment reference has already been used for another booking');
  END IF;

  v_secret := COALESCE(p_secret, NULLIF(current_setting('app.settings.razorpay_secret', true), ''));

  IF v_secret IS NOT NULL AND v_secret != '' THEN
    v_expected_sig := encode(hmac(p_order_id || '|' || p_payment_id, v_secret, 'sha256'), 'hex');
    v_is_valid := (v_expected_sig = p_signature);
  ELSE
    -- Dev / Test / Sandbox verification:
    -- If signature is well-formed hex or sandbox signature
    IF p_signature LIKE 'sig_%' OR length(p_signature) = 64 THEN
      v_is_valid := TRUE;
    END IF;
  END IF;

  IF NOT v_is_valid THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_SIGNATURE', 'message', 'Cryptographic signature verification failed');
  END IF;

  -- Reconcile payment authoritatively
  RETURN public.record_payment_reconciliation(
    p_booking_id,
    p_payment_id,
    v_booking.total_amount,
    'Razorpay',
    'success',
    jsonb_build_object('order_id', p_order_id, 'signature', p_signature, 'verified', TRUE)
  );
END;
$$;


-- =====================================================================
-- MIGRATION: 20261010020000_phase1_database_and_security.sql
-- =====================================================================

-- Migration: 20261010020000_phase1_database_and_security.sql
-- Description: Phase 1 — Supabase Database and Security (Fully Idempotent & Safe for Existing Tables)
-- 1. Profiles auto-creation trigger on auth.users insert
-- 2. Role escalation prevention trigger
-- 3. Complete schema tables: profiles, vehicles, parking_spaces, parking_images, parking_availability, bookings, payments, reviews, booking_events
-- 4. Safe ADD COLUMN IF NOT EXISTS for all existing tables & backfills
-- 5. PostGIS nearby_parking RPC function calculating distances in database
-- 6. Server-controlled cancel_booking RPC function
-- 7. apply_for_owner_role RPC function (no automatic self-promotion)
-- 8. Comprehensive, idempotent Row Level Security (RLS) policies

-- =========================================================
-- EXTENSIONS
-- =========================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =========================================================
-- 1. PROFILES TABLE & AUTH TRIGGER
-- =========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT 'iDAM User',
  email TEXT UNIQUE NOT NULL,
  phone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('driver', 'owner', 'admin')),
  owner_status TEXT DEFAULT 'none' CHECK (owner_status IN ('none', 'pending_review', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was created in an earlier schema
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT 'iDAM User',
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'driver',
  ADD COLUMN IF NOT EXISTS owner_status TEXT DEFAULT 'none';

-- Trigger function to auto-create profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role, owner_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1), 'iDAM User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'driver', -- Enforces driver role by default
    'none'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to prevent normal users from modifying their own role directly
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent role escalation only when an authenticated user attempts to change their own role
  IF TG_OP = 'UPDATE'
     AND NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND COALESCE(auth.jwt()->>'role', '') != 'service_role'
  THEN
    RAISE EXCEPTION 'Users cannot alter their own role directly.';
  END IF;

  -- Prevent unauthorized owner status elevation by authenticated user on their own profile
  IF TG_OP = 'UPDATE'
     AND NEW.owner_status IS DISTINCT FROM OLD.owner_status
     AND auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND COALESCE(auth.jwt()->>'role', '') != 'service_role'
  THEN
    IF NEW.owner_status NOT IN ('pending', 'none') THEN
      RAISE EXCEPTION 'Users cannot approve their own owner status directly. Use apply_for_owner_role() RPC.';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- =========================================================
-- 2. VEHICLES TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'car' CHECK (vehicle_type IN ('car', 'bike', 'suv', 'ev')),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'car',
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);

-- =========================================================
-- 3. PARKING SPACES TABLE & GEOGRAPHY
-- =========================================================
CREATE TABLE IF NOT EXISTS public.parking_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ta TEXT,
  description TEXT,
  address TEXT NOT NULL,
  landmark TEXT,
  latitude DOUBLE PRECISION NOT NULL DEFAULT 9.9195,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 78.1198,
  location GEOGRAPHY(POINT, 4326),
  price_per_hour_car NUMERIC(10,2) NOT NULL DEFAULT 40.00,
  price_per_hour_bike NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  car_capacity INT NOT NULL DEFAULT 10,
  bike_capacity INT NOT NULL DEFAULT 5,
  opening_time TIME DEFAULT '08:00:00',
  closing_time TIME DEFAULT '22:00:00',
  amenities TEXT[] DEFAULT ARRAY['CCTV', 'Well-lit', 'Security Guard'],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'pending_review', 'active', 'inactive', 'suspended')),
  rating NUMERIC(3,2) DEFAULT 4.7,
  reviews_count INT DEFAULT 1,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all parking_spaces columns exist on older instances
ALTER TABLE public.parking_spaces
  ADD COLUMN IF NOT EXISTS title_ta TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS landmark TEXT,
  ADD COLUMN IF NOT EXISTS price_per_hour_car NUMERIC(10,2) NOT NULL DEFAULT 40.00,
  ADD COLUMN IF NOT EXISTS price_per_hour_bike NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS car_capacity INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS bike_capacity INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '08:00:00',
  ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '22:00:00',
  ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT ARRAY['CCTV', 'Well-lit', 'Security Guard'],
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 4.7,
  ADD COLUMN IF NOT EXISTS reviews_count INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Sync geography column automatically
CREATE OR REPLACE FUNCTION public.update_parking_space_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.longitude IS NOT NULL AND NEW.latitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_parking_space_location ON public.parking_spaces;
CREATE TRIGGER trg_update_parking_space_location
  BEFORE INSERT OR UPDATE ON public.parking_spaces
  FOR EACH ROW EXECUTE FUNCTION public.update_parking_space_location();

-- Backfill location for existing rows if null
UPDATE public.parking_spaces
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE location IS NULL AND longitude IS NOT NULL AND latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parking_spaces_location ON public.parking_spaces USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_status ON public.parking_spaces(status);

-- =========================================================
-- 4. PARKING IMAGES TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.parking_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_space_id UUID NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parking_images_space_id ON public.parking_images(parking_space_id);

-- =========================================================
-- 5. PARKING AVAILABILITY TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.parking_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_space_id UUID NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '22:00:00',
  is_available BOOLEAN DEFAULT TRUE,
  UNIQUE(parking_space_id, day_of_week)
);

-- =========================================================
-- 6. BOOKINGS TABLE (Safe Idempotent Creation & Column Patch)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely add ALL required columns so existing tables are seamlessly upgraded
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pass_token TEXT,
  ADD COLUMN IF NOT EXISTS pass_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS parking_space_id UUID REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS vehicle_number TEXT NOT NULL DEFAULT 'TN 59 AB 1234',
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'car',
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ DEFAULT NOW() + INTERVAL '2 hours',
  ADD COLUMN IF NOT EXISTS start_timestamptz TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS end_timestamptz TIMESTAMPTZ DEFAULT NOW() + INTERVAL '2 hours',
  ADD COLUMN IF NOT EXISTS duration_hours INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 40.00,
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2) NOT NULL DEFAULT 80.00,
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS addons_fee NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) NOT NULL DEFAULT 85.00,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS booking_status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS checked_out_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qr_data TEXT NOT NULL DEFAULT '';

-- Data compatibility backfill for existing booking rows
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'user_id') THEN
    UPDATE public.bookings SET driver_id = user_id WHERE driver_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'parking_location_id') THEN
    UPDATE public.bookings SET parking_space_id = parking_location_id WHERE parking_space_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'status') THEN
    UPDATE public.bookings SET booking_status = status WHERE booking_status IS NULL;
  END IF;
END $$;

-- Indexes on bookings
CREATE INDEX IF NOT EXISTS idx_bookings_pass_token_hash ON public.bookings(pass_token_hash);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON public.bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_space_status ON public.bookings(parking_space_id, booking_status);

-- =========================================================
-- 7. PAYMENTS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL DEFAULT 'Razorpay',
  transaction_ref TEXT UNIQUE NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('pending', 'completed', 'success', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 8. REVIEWS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_space_id UUID NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 9. BOOKING EVENTS AUDIT TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'checked_in', 'checked_out', 'cancelled', 'expired')),
  actor_id UUID REFERENCES public.profiles(id),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON public.booking_events(booking_id);

-- =========================================================
-- 10. POSTGIS NEARBY PARKING RPC
-- =========================================================
CREATE OR REPLACE FUNCTION public.nearby_parking(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_meters DOUBLE PRECISION DEFAULT 5000,
  p_vehicle_type TEXT DEFAULT 'all',
  p_max_price NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  title_ta TEXT,
  address TEXT,
  landmark TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters INT,
  hourly_rate_car NUMERIC,
  hourly_rate_bike NUMERIC,
  car_capacity INT,
  bike_capacity INT,
  available_spots INT,
  amenities TEXT[],
  rating NUMERIC,
  reviews_count INT,
  image_url TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_point GEOGRAPHY;
BEGIN
  v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;

  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.title_ta,
    s.address,
    s.landmark,
    s.latitude,
    s.longitude,
    ROUND(ST_Distance(s.location, v_point))::INT as distance_meters,
    s.price_per_hour_car as hourly_rate_car,
    s.price_per_hour_bike as hourly_rate_bike,
    s.car_capacity,
    s.bike_capacity,
    s.car_capacity as available_spots,
    s.amenities,
    s.rating,
    s.reviews_count,
    s.image_url,
    s.status
  FROM public.parking_spaces s
  WHERE s.status = 'active'
    AND s.location IS NOT NULL
    AND ST_DWithin(s.location, v_point, p_radius_meters)
    AND (
      p_vehicle_type = 'all' 
      OR (p_vehicle_type = 'car' AND s.car_capacity > 0)
      OR (p_vehicle_type = 'bike' AND s.bike_capacity > 0)
    )
    AND (
      p_max_price IS NULL
      OR (p_vehicle_type = 'bike' AND s.price_per_hour_bike <= p_max_price)
      OR (p_vehicle_type != 'bike' AND s.price_per_hour_car <= p_max_price)
    )
  ORDER BY ST_Distance(s.location, v_point) ASC;
END;
$$;

-- =========================================================
-- 11. BOOKING CANCELLATION RPC
-- =========================================================
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_caller UUID := auth.uid();
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'NOT_FOUND', 'message', 'Booking not found');
  END IF;

  IF v_caller IS NOT NULL AND v_booking.driver_id != v_caller THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN', 'message', 'Not authorized to cancel this booking');
  END IF;

  IF v_booking.booking_status IN ('active', 'completed') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATE', 'message', 'Cannot cancel an in-progress or completed parking pass');
  END IF;

  IF v_booking.booking_status = 'cancelled' THEN
    RETURN jsonb_build_object('success', TRUE, 'message', 'Booking is already cancelled');
  END IF;

  UPDATE public.bookings
  SET booking_status = 'cancelled',
      status = 'cancelled',
      payment_status = CASE WHEN payment_status = 'completed' THEN 'refunded' ELSE payment_status END,
      cancellation_reason = p_reason,
      cancelled_at = NOW(),
      updated_at = NOW()
  WHERE id = p_booking_id;

  UPDATE public.payments
  SET status = 'refunded',
      updated_at = NOW()
  WHERE booking_id = p_booking_id AND status IN ('success', 'completed');

  INSERT INTO public.booking_events (booking_id, event_type, actor_id, details)
  VALUES (p_booking_id, 'cancelled', v_caller, jsonb_build_object('reason', p_reason, 'refunded', v_booking.payment_status = 'completed'));

  RETURN jsonb_build_object('success', TRUE, 'message', 'Booking cancelled successfully');
END;
$$;

-- =========================================================
-- 12. OWNER APPLICATION RPC
-- =========================================================
CREATE OR REPLACE FUNCTION public.apply_for_owner_role(
  p_property_name TEXT,
  p_property_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHENTICATED');
  END IF;

  UPDATE public.profiles
  SET owner_status = 'pending_review',
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', TRUE, 'message', 'Owner application submitted for review');
END;
$$;

-- =========================================================
-- 13. IDEMPOTENT ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Vehicles
DROP POLICY IF EXISTS "Users manage own vehicles" ON public.vehicles;
CREATE POLICY "Users manage own vehicles" ON public.vehicles FOR ALL USING (auth.uid() = user_id);

-- Parking Spaces
DROP POLICY IF EXISTS "Anyone view active spaces" ON public.parking_spaces;
CREATE POLICY "Anyone view active spaces" ON public.parking_spaces FOR SELECT USING (status = 'active' OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners insert spaces" ON public.parking_spaces;
CREATE POLICY "Owners insert spaces" ON public.parking_spaces FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners update spaces" ON public.parking_spaces;
CREATE POLICY "Owners update spaces" ON public.parking_spaces FOR UPDATE USING (auth.uid() = owner_id);

-- Parking Images
DROP POLICY IF EXISTS "Public view images" ON public.parking_images;
CREATE POLICY "Public view images" ON public.parking_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.parking_spaces s WHERE s.id = parking_space_id AND (s.status = 'active' OR s.owner_id = auth.uid()))
);

DROP POLICY IF EXISTS "Owners manage images" ON public.parking_images;
CREATE POLICY "Owners manage images" ON public.parking_images FOR ALL USING (
  EXISTS (SELECT 1 FROM public.parking_spaces s WHERE s.id = parking_space_id AND s.owner_id = auth.uid())
);

-- Bookings
DROP POLICY IF EXISTS "Users can read own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Drivers and owners view bookings" ON public.bookings;
CREATE POLICY "Drivers and owners view bookings" ON public.bookings FOR SELECT USING (
  auth.uid() = driver_id 
  OR auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.parking_spaces s WHERE s.id = parking_space_id AND s.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Drivers insert bookings" ON public.bookings;
CREATE POLICY "Drivers insert bookings" ON public.bookings FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (auth.uid() = driver_id OR auth.uid() = user_id)
);

DROP POLICY IF EXISTS "Authorized users update bookings" ON public.bookings;
CREATE POLICY "Authorized users update bookings" ON public.bookings FOR UPDATE USING (
  auth.uid() = driver_id 
  OR auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.parking_spaces s WHERE s.id = parking_space_id AND s.owner_id = auth.uid())
);

-- Payments
DROP POLICY IF EXISTS "Drivers view own payments" ON public.payments;
CREATE POLICY "Drivers view own payments" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.driver_id = auth.uid())
);

-- Reviews
DROP POLICY IF EXISTS "Public view reviews" ON public.reviews;
CREATE POLICY "Public view reviews" ON public.reviews FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Drivers insert review for completed booking" ON public.reviews;
CREATE POLICY "Drivers insert review for completed booking" ON public.reviews FOR INSERT WITH CHECK (
  auth.uid() = driver_id 
  AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.driver_id = auth.uid() AND b.booking_status = 'completed')
);

-- Booking Events
DROP POLICY IF EXISTS "View booking events" ON public.booking_events;
CREATE POLICY "View booking events" ON public.booking_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    JOIN public.parking_spaces s ON b.parking_space_id = s.id 
    WHERE b.id = booking_events.booking_id 
      AND (b.driver_id = auth.uid() OR s.owner_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Authorized owners and system insert booking events" ON public.booking_events;
CREATE POLICY "Authorized owners and system insert booking events" ON public.booking_events FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.parking_spaces s ON b.parking_space_id = s.id
      WHERE b.id = booking_events.booking_id AND s.owner_id = auth.uid()
    ) OR
    (COALESCE(auth.jwt()->>'role', '') = 'service_role')
  )
);

-- =========================================================
-- FUNCTION PRIVILEGE SECURITY HARDENING
-- =========================================================
DO $$
BEGIN
  -- Revoke execution from PUBLIC on internal triggers
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'protect_profile_role') THEN
    REVOKE EXECUTE ON FUNCTION public.protect_profile_role() FROM PUBLIC;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_parking_space_location') THEN
    REVOKE EXECUTE ON FUNCTION public.update_parking_space_location() FROM PUBLIC;
  END IF;

  -- Revoke anonymous access to state transition functions if anon role exists
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.confirm_booking_check_in(UUID, TEXT, TEXT) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.confirm_booking_check_out(UUID) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.cancel_booking(UUID, TEXT) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.apply_for_owner_role(TEXT, TEXT) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.create_verified_booking(UUID, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.create_payment_order(UUID, TEXT, INT, TEXT, TEXT[]) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.verify_razorpay_payment(UUID, TEXT, TEXT, TEXT, TEXT) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.record_payment_reconciliation(UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB) FROM anon;
  END IF;

  -- Grant to authenticated users
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.confirm_booking_check_in(UUID, TEXT, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.confirm_booking_check_out(UUID) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.apply_for_owner_role(TEXT, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.create_verified_booking(UUID, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.create_payment_order(UUID, TEXT, INT, TEXT, TEXT[]) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.verify_razorpay_payment(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.record_payment_reconciliation(UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB) TO authenticated;
  END IF;
END $$;


-- =====================================================================
-- MIGRATION: 20261027000000_payment_verification_hardening.sql
-- =====================================================================

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


-- =====================================================================
-- MIGRATION: 20261027000100_overnight_booking_window_fix.sql
-- =====================================================================

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


-- =====================================================================
-- MIGRATION: 20261028000000_listing_review_and_privacy.sql
-- =====================================================================

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


-- =====================================================================
-- MIGRATION: 20261028000100_drop_legacy_schema_policies.sql
-- =====================================================================

-- =========================================================
-- DROP POLICIES LEFT BEHIND BY THE OLD supabase/schema.sql
-- =========================================================
-- Projects that once ran supabase/schema.sql keep its policies, under names the migrations
-- never drop. RLS policies are OR'd, so these silently re-open holes the migrations closed:
--   bookings  "Drivers can insert bookings"   clients insert bookings directly, already 'paid'
--   reviews   "Drivers can create reviews"    reviews without a completed booking
--   parking_images "Public images read"       photos of unapproved listings are public
-- The rest duplicate policies the migrations already define. "Public availability read"
-- (read-only opening hours) is kept. Found on the live project by supabase/verify_security.sql.

DROP POLICY IF EXISTS "Drivers can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Drivers can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Drivers can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public reviews read" ON public.reviews;
DROP POLICY IF EXISTS "Public images read" ON public.parking_images;
DROP POLICY IF EXISTS "Anyone can view active parking spaces" ON public.parking_spaces;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;


-- =====================================================================
-- MIGRATION: 20261029000000_align_booking_status_checks.sql
-- =====================================================================

-- =========================================================
-- ALIGN BOOKING STATUS CHECK CONSTRAINTS
-- =========================================================
-- Projects created from the first version of 20260912000000_initial_schema.sql have
--   bookings.status CHECK (status IN ('confirmed', 'active', 'completed', 'cancelled'))
-- Later versions of that file added 'pending' (and 'expired'), but CREATE TABLE IF NOT EXISTS
-- never changes an existing table, so those projects reject every new booking now that
-- bookings start unpaid ('pending') until payment is verified:
--   new row for relation "bookings" violates check constraint "bookings_status_check"
-- Replace whatever status checks exist with the current definitions.

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.bookings'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ~ '\m(status|booking_status|payment_status)\M'
  LOOP
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired')),
  ADD CONSTRAINT bookings_booking_status_check
    CHECK (booking_status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired')),
  ADD CONSTRAINT bookings_payment_status_check
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'));


-- =====================================================================
-- MIGRATION: 20261029000100_align_payment_and_event_tables.sql
-- =====================================================================

-- =========================================================
-- ALIGN PAYMENT, BOOKING AND AUDIT TABLES WITH THE FUNCTIONS THAT WRITE THEM
-- =========================================================
-- Projects whose tables were created by older schema versions keep those definitions
-- (CREATE TABLE IF NOT EXISTS never changes an existing table). On such projects payment
-- confirmation fails and rolls back, for both the app and the Razorpay webhook, because
-- record_payment_reconciliation / cancel_booking:
--   - set bookings.updated_at and payments.updated_at  -> columns did not exist
--   - insert a booking_events row with event_type 'paid' -> old CHECK did not allow it
-- Found on the live project by comparing it with the migrated schema.

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Replace whichever CHECK rules exist on these columns with the current definitions
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT con.conrelid::regclass AS tbl, con.conname
    FROM pg_constraint con
    WHERE con.contype = 'c'
      AND (
        (con.conrelid = 'public.booking_events'::regclass AND pg_get_constraintdef(con.oid) ~ '\mevent_type\M')
        OR (con.conrelid = 'public.payments'::regclass AND pg_get_constraintdef(con.oid) ~ '\mstatus\M')
        OR (con.conrelid = 'public.profiles'::regclass AND pg_get_constraintdef(con.oid) ~ '\mowner_status\M')
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
  END LOOP;
END $$;

ALTER TABLE public.booking_events
  ADD CONSTRAINT booking_events_event_type_check
    CHECK (event_type IN ('created', 'quote_generated', 'paid', 'checked_in', 'checked_out', 'cancelled', 'expired'));

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'completed', 'success', 'failed', 'refunded'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_owner_status_check
    CHECK (owner_status IN ('none', 'pending_review', 'approved', 'rejected'));


-- =====================================================================
-- MIGRATION: 20261029000200_gate_plate_check.sql
-- =====================================================================

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


-- =====================================================================
-- MIGRATION: 20261030000000_admin_console.sql
-- =====================================================================

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


COMMIT;
