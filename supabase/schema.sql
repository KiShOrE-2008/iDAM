-- ==============================================================================
-- iDAM | இடம் — CANONICAL AUTHORITATIVE DATABASE SCHEMA (V2)
-- ==============================================================================
-- Authoritative schema snapshot matching cumulative result of all migrations.
-- Features PostGIS spatial querying, strict RLS, atomic RPC state machines,
-- audit logs, and dual backward-compatibility columns.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 2. PROFILES TABLE (Drivers, Space Owners & Admins)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'iDAM User',
  phone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('driver', 'owner', 'admin')),
  owner_status TEXT NOT NULL DEFAULT 'none' CHECK (owner_status IN ('none', 'pending_review', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure profiles columns exist if table was created in an earlier schema
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT 'iDAM User',
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'driver',
  ADD COLUMN IF NOT EXISTS owner_status TEXT NOT NULL DEFAULT 'none';


-- Profiles Triggers: Auto-create profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role, owner_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1), 'iDAM User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'driver',
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

-- Profiles Triggers: Prevent unauthorized role escalation by client updates
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- 3. VEHICLES TABLE (User Garage)
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

-- 4. PARKING SPACES TABLE (Authoritative Parking Entities)
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
  price_per_hour_car NUMERIC(10,2) NOT NULL DEFAULT 40.00,
  price_per_hour_bike NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  car_capacity INT NOT NULL DEFAULT 10,
  bike_capacity INT NOT NULL DEFAULT 5,
  opening_time TIME DEFAULT '08:00:00',
  closing_time TIME DEFAULT '22:00:00',
  operating_hours TEXT DEFAULT '8:00 AM - 10:00 PM',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'pending_review', 'active', 'inactive', 'suspended')),
  rating NUMERIC(3,2) DEFAULT 4.7,
  reviews_count INT DEFAULT 1,
  amenities TEXT[] DEFAULT ARRAY['Car', 'Bike', 'CCTV', 'Well lit'],
  image_url TEXT,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.parking_spaces
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title_ta TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS landmark TEXT,
  ADD COLUMN IF NOT EXISTS price_per_hour_car NUMERIC(10,2) NOT NULL DEFAULT 40.00,
  ADD COLUMN IF NOT EXISTS price_per_hour_bike NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS car_capacity INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS bike_capacity INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '08:00:00',
  ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '22:00:00',
  ADD COLUMN IF NOT EXISTS operating_hours TEXT DEFAULT '8:00 AM - 10:00 PM',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 4.7,
  ADD COLUMN IF NOT EXISTS reviews_count INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT ARRAY['Car', 'Bike', 'CCTV', 'Well lit'],
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);


-- Geography auto-sync trigger
CREATE OR REPLACE FUNCTION update_parking_space_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_parking_space_location ON public.parking_spaces;
CREATE TRIGGER trg_update_parking_space_location
  BEFORE INSERT OR UPDATE ON public.parking_spaces
  FOR EACH ROW EXECUTE FUNCTION update_parking_space_location();

CREATE INDEX IF NOT EXISTS idx_parking_spaces_location ON public.parking_spaces USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_status ON public.parking_spaces(status);

-- 4b. PARKING LOCATIONS TABLE (Maintained for backward compatibility)
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
  car_capacity INTEGER DEFAULT 10,
  bike_capacity INTEGER DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'pending_review', 'active', 'inactive', 'suspended')),
  amenities TEXT[] DEFAULT ARRAY['Car', 'Bike', 'CCTV', 'Well lit'],
  operating_hours TEXT DEFAULT '8:00 AM - 10:00 PM',
  image_url TEXT,
  rating NUMERIC(3, 2) DEFAULT 4.7,
  reviews_count INTEGER DEFAULT 38,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.parking_locations
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title_ta TEXT,
  ADD COLUMN IF NOT EXISTS landmark TEXT,
  ADD COLUMN IF NOT EXISTS hourly_rate_car NUMERIC(10, 2) NOT NULL DEFAULT 30.00,
  ADD COLUMN IF NOT EXISTS hourly_rate_bike NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS total_spots INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS available_spots INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS car_capacity INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS bike_capacity INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT ARRAY['Car', 'Bike', 'CCTV', 'Well lit'],
  ADD COLUMN IF NOT EXISTS operating_hours TEXT DEFAULT '8:00 AM - 10:00 PM',
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 4.7,
  ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 38,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

CREATE INDEX IF NOT EXISTS idx_parking_locations_location ON public.parking_locations USING GIST(location);

-- 5. PARKING IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.parking_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_space_id UUID NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.parking_images
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- 6. PARKING AVAILABILITY TABLE
CREATE TABLE IF NOT EXISTS public.parking_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_space_id UUID NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '22:00:00',
  is_available BOOLEAN DEFAULT TRUE,
  UNIQUE(parking_space_id, day_of_week)
);

ALTER TABLE public.parking_availability
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;

-- 7. BOOKINGS TABLE (Standardized Identifiers + Legacy Compatibility)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_code TEXT UNIQUE NOT NULL,
  pass_token_hash TEXT,
  driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  parking_space_id UUID REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  parking_location_id UUID REFERENCES public.parking_locations(id) ON DELETE SET NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'car' CHECK (vehicle_type IN ('car', 'bike', 'suv', 'ev')),
  vehicle_number TEXT NOT NULL DEFAULT 'TN 59 AB 1234',
  booking_date DATE,
  start_time TIME,
  end_time TIME,
  duration_hours INT NOT NULL DEFAULT 2,
  start_timestamptz TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_timestamptz TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '2 hours',
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 40.00,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 80.00,
  platform_fee NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  addons_fee NUMERIC(10,2) DEFAULT 0.00,
  discount_amount NUMERIC(10,2) DEFAULT 0.00,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 85.00,
  payment_method TEXT DEFAULT 'UPI',
  payment_status TEXT NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_id TEXT,
  razorpay_order_id TEXT,
  booking_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (booking_status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired')),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired')),
  qr_data TEXT NOT NULL DEFAULT '',
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES public.profiles(id),
  checked_out_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely add ALL required columns so existing tables are seamlessly upgraded
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pass_code TEXT,
  ADD COLUMN IF NOT EXISTS pass_token TEXT,
  ADD COLUMN IF NOT EXISTS pass_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS parking_space_id UUID REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS parking_location_id UUID REFERENCES public.parking_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'car',
  ADD COLUMN IF NOT EXISTS vehicle_number TEXT NOT NULL DEFAULT 'TN 59 AB 1234',
  ADD COLUMN IF NOT EXISTS booking_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '10:00:00',
  ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '12:00:00',
  ADD COLUMN IF NOT EXISTS duration_hours INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS start_timestamptz TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS end_timestamptz TIMESTAMPTZ DEFAULT NOW() + INTERVAL '2 hours',
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 40.00,
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2) NOT NULL DEFAULT 80.00,
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS addons_fee NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) NOT NULL DEFAULT 85.00,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'UPI',
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS booking_status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS qr_data TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS checked_out_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Backfill legacy rows to guarantee column integrity
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'user_id') THEN
    UPDATE public.bookings SET driver_id = user_id WHERE driver_id IS NULL AND user_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'parking_location_id') THEN
    UPDATE public.bookings SET parking_space_id = parking_location_id WHERE parking_space_id IS NULL AND parking_location_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'status') THEN
    UPDATE public.bookings SET booking_status = status WHERE booking_status IS NULL AND status IS NOT NULL;
  END IF;
  UPDATE public.bookings
  SET start_timestamptz = COALESCE(start_timestamptz, (booking_date::TEXT || ' ' || start_time::TEXT)::TIMESTAMPTZ, created_at, NOW()),
      end_timestamptz = COALESCE(end_timestamptz, (booking_date::TEXT || ' ' || end_time::TEXT)::TIMESTAMPTZ, created_at + INTERVAL '2 hours', NOW() + INTERVAL '2 hours')
  WHERE start_timestamptz IS NULL OR end_timestamptz IS NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON public.bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_space_status ON public.bookings(parking_space_id, booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_pass_token_hash ON public.bookings(pass_token_hash);
CREATE INDEX IF NOT EXISTS idx_bookings_times ON public.bookings(start_timestamptz, end_timestamptz);

-- 8. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL DEFAULT 'UPI',
  transaction_ref TEXT UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'success', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'UPI',
  ADD COLUMN IF NOT EXISTS transaction_ref TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- 9. BOOKING EVENTS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'quote_generated', 'paid', 'checked_in', 'checked_out', 'cancelled', 'expired')),
  actor_id UUID REFERENCES public.profiles(id),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_events
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON public.booking_events(booking_id);

-- 10. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_space_id UUID NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS rating INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS comment TEXT;


-- ==============================================================================
-- STORED PROCEDURES & RPC API FUNCTIONS
-- ==============================================================================

-- PostGIS nearby search RPC
DROP FUNCTION IF EXISTS public.nearby_parking(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.nearby_parking(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.nearby_parking;
DROP FUNCTION IF EXISTS public.search_nearby_parking(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.search_nearby_parking;
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
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  hourly_rate_car NUMERIC,
  hourly_rate_bike NUMERIC,
  car_capacity INT,
  bike_capacity INT,
  available_spots INT,
  distance_meters DOUBLE PRECISION,
  rating NUMERIC,
  reviews_count INT,
  image_url TEXT,
  status TEXT,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.title_ta,
    s.address,
    s.latitude,
    s.longitude,
    s.price_per_hour_car AS hourly_rate_car,
    s.price_per_hour_bike AS hourly_rate_bike,
    s.car_capacity,
    s.bike_capacity,
    (s.car_capacity + s.bike_capacity) AS available_spots,
    ST_Distance(s.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography) AS distance_meters,
    s.rating,
    s.reviews_count,
    s.image_url,
    s.status,
    s.is_verified
  FROM public.parking_spaces s
  WHERE s.status = 'active'
    AND ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography, p_radius_meters)
    AND (
      p_vehicle_type = 'all'
      OR (p_vehicle_type = 'car' AND s.price_per_hour_car > 0)
      OR (p_vehicle_type = 'bike' AND s.price_per_hour_bike > 0)
    )
    AND (
      p_max_price IS NULL
      OR (p_vehicle_type = 'bike' AND s.price_per_hour_bike <= p_max_price)
      OR (p_vehicle_type != 'bike' AND s.price_per_hour_car <= p_max_price)
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Server-side pricing quote calculator
DROP FUNCTION IF EXISTS public.calculate_booking_quote(UUID, TEXT, INT, TEXT[]);
DROP FUNCTION IF EXISTS public.calculate_booking_quote;
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
  IF p_duration_hours < 1 OR p_duration_hours > 72 THEN
    RAISE EXCEPTION 'Duration must be between 1 and 72 hours';
  END IF;

  SELECT 
    CASE WHEN LOWER(p_vehicle_type) = 'bike' THEN COALESCE(price_per_hour_bike, 20.00) ELSE COALESCE(price_per_hour_car, 40.00) END,
    title
  INTO v_rate, v_title
  FROM public.parking_spaces
  WHERE id = p_space_id;

  IF NOT FOUND THEN
    SELECT 
      CASE WHEN LOWER(p_vehicle_type) = 'bike' THEN COALESCE(hourly_rate_bike, 15.00) ELSE COALESCE(hourly_rate_car, 30.00) END,
      title
    INTO v_rate, v_title
    FROM public.parking_locations
    WHERE id = p_space_id;
  END IF;

  IF v_rate IS NULL THEN
    v_rate := CASE WHEN LOWER(p_vehicle_type) = 'bike' THEN 20.00 ELSE 40.00 END;
    v_title := 'Smart Parking Lot';
  END IF;

  v_base := v_rate * p_duration_hours;

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

-- Verification RPC for QR pass check-in
DROP FUNCTION IF EXISTS public.verify_parking_pass(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.verify_parking_pass;
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
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'UNAUTHENTICATED',
      'message', 'Authentication required to scan or verify parking passes'
    );
  END IF;

  SELECT * INTO v_space FROM public.parking_spaces WHERE id = p_owner_space_id;
  IF NOT FOUND THEN
    SELECT id, owner_id, title, address INTO v_space FROM public.parking_locations WHERE id = p_owner_space_id;
  END IF;

  IF v_space.id IS NULL THEN
    RETURN jsonb_build_object('is_valid', FALSE, 'code', 'INVALID_LOCATION', 'message', 'Parking location not found');
  END IF;

  -- Verify caller owns this space
  IF v_space.owner_id != auth.uid() AND (COALESCE(auth.jwt()->>'role', '') != 'service_role') THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'UNAUTHORIZED_SPACE',
      'message', 'You do not have permission to verify passes for this parking space'
    );
  END IF;

  SELECT b.*, s.title as location_title, s.address as location_address, p.full_name as driver_name
  INTO v_booking
  FROM public.bookings b
  JOIN public.parking_spaces s ON b.parking_space_id = s.id
  LEFT JOIN public.profiles p ON b.driver_id = p.id
  WHERE (p_pass_token_hash IS NOT NULL AND b.pass_token_hash = p_pass_token_hash)
     OR (p_pass_code IS NOT NULL AND LOWER(b.pass_code) = LOWER(p_pass_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('is_valid', FALSE, 'code', 'NOT_FOUND', 'message', 'No valid booking matches this pass');
  END IF;

  IF v_booking.parking_space_id != p_owner_space_id AND v_booking.parking_location_id != p_owner_space_id THEN
    RETURN jsonb_build_object('is_valid', FALSE, 'code', 'WRONG_LOCATION', 'message', 'This pass belongs to a different parking location');
  END IF;

  IF v_booking.booking_status = 'cancelled' THEN
    RETURN jsonb_build_object('is_valid', FALSE, 'code', 'CANCELLED', 'message', 'This booking was cancelled by the driver');
  END IF;

  IF v_booking.booking_status = 'completed' THEN
    RETURN jsonb_build_object('is_valid', FALSE, 'code', 'ALREADY_COMPLETED', 'message', 'This pass has already been checked out');
  END IF;

  IF v_booking.booking_status = 'active' THEN
    RETURN jsonb_build_object('is_valid', FALSE, 'code', 'ALREADY_ACTIVE', 'message', 'This pass has already been used to check in');
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
  IF COALESCE(v_booking.start_timestamptz, (v_booking.booking_date::TEXT || ' ' || v_booking.start_time::TEXT)::TIMESTAMPTZ) - INTERVAL '60 minutes' > v_now THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'EARLY_ARRIVAL',
      'message', 'Vehicle arrived too early for reserved slot window',
      'start_time', v_booking.start_time
    );
  END IF;

  -- Verify reservation hasn't completely passed
  IF COALESCE(v_booking.end_timestamptz, (v_booking.booking_date::TEXT || ' ' || v_booking.end_time::TEXT)::TIMESTAMPTZ) + INTERVAL '120 minutes' < v_now THEN
    RETURN jsonb_build_object(
      'is_valid', FALSE,
      'code', 'EXPIRED',
      'message', 'This reservation window has expired',
      'end_time', v_booking.end_time
    );
  END IF;

  RETURN jsonb_build_object(
    'is_valid', TRUE,
    'code', 'VALID',
    'message', 'Valid parking pass ready for check-in',
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'pass_code', v_booking.pass_code,
      'location_title', v_booking.location_title,
      'driver_name', COALESCE(v_booking.driver_name, 'Driver'),
      'vehicle_number', v_booking.vehicle_number,
      'vehicle_type', v_booking.vehicle_type,
      'duration_hours', v_booking.duration_hours,
      'total_amount', v_booking.total_amount,
      'payment_status', v_booking.payment_status,
      'booking_status', v_booking.booking_status
    )
  );
END;
$$;

-- Atomic check-in transition
DROP FUNCTION IF EXISTS public.confirm_booking_check_in(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.confirm_booking_check_in(UUID, TEXT);
DROP FUNCTION IF EXISTS public.confirm_booking_check_in;
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
      RETURN jsonb_build_object('success', TRUE, 'already_active', TRUE, 'message', 'Vehicle already checked in');
    ELSE
      RETURN jsonb_build_object('success', FALSE, 'message', 'Could not confirm check-in. Pass may be cancelled, completed or invalid.');
    END IF;
  END IF;

  INSERT INTO public.booking_events (booking_id, event_type, actor_id, details)
  VALUES (p_booking_id, 'checked_in', auth.uid(), jsonb_build_object('check_in_at', v_now, 'vehicle_number', v_booking.vehicle_number));

  RETURN jsonb_build_object('success', TRUE, 'message', 'Vehicle checked in successfully', 'check_in_at', v_now, 'booking_id', v_booking.id);
END;
$$;

-- Atomic check-out transition
DROP FUNCTION IF EXISTS public.confirm_booking_check_out(UUID);
DROP FUNCTION IF EXISTS public.confirm_booking_check_out;
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
      RETURN jsonb_build_object('success', TRUE, 'already_completed', TRUE, 'message', 'Vehicle already checked out');
    ELSE
      RETURN jsonb_build_object('success', FALSE, 'message', 'Could not check out vehicle. Booking is not in active state.');
    END IF;
  END IF;

  INSERT INTO public.booking_events (booking_id, event_type, actor_id, details)
  VALUES (
    p_booking_id,
    'checked_out',
    auth.uid(),
    jsonb_build_object(
      'check_out_at', v_now,
      'duration_minutes', ROUND(EXTRACT(EPOCH FROM (v_now - COALESCE(v_booking.check_in_at, v_booking.start_timestamptz, (v_booking.booking_date::TEXT || ' ' || v_booking.start_time::TEXT)::TIMESTAMPTZ, v_now))) / 60)
    )
  );

  RETURN jsonb_build_object('success', TRUE, 'message', 'Vehicle checked out successfully', 'check_out_at', v_now, 'booking_id', v_booking.id);
END;
$$;

-- Server-controlled cancel booking RPC
DROP FUNCTION IF EXISTS public.cancel_booking(UUID, TEXT);
DROP FUNCTION IF EXISTS public.cancel_booking(UUID);
DROP FUNCTION IF EXISTS public.cancel_booking;
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id UUID,
  p_reason TEXT DEFAULT 'Cancelled by driver'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'NOT_FOUND', 'message', 'Booking not found');
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() != v_booking.driver_id AND auth.uid() != v_booking.user_id AND (COALESCE(auth.jwt()->>'role', '') != 'service_role') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN', 'message', 'Unauthorized: You can only cancel your own bookings');
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
      cancelled_at = v_now,
      updated_at = v_now
  WHERE id = p_booking_id;

  UPDATE public.payments
  SET status = 'refunded',
      updated_at = v_now
  WHERE booking_id = p_booking_id AND status IN ('success', 'completed');

  INSERT INTO public.booking_events (booking_id, event_type, actor_id, details)
  VALUES (p_booking_id, 'cancelled', auth.uid(), jsonb_build_object('reason', p_reason, 'cancelled_at', v_now, 'refunded', v_booking.payment_status = 'completed'));

  RETURN jsonb_build_object('success', TRUE, 'message', 'Booking cancelled successfully');
END;
$$;

-- Space owner application RPC
DROP FUNCTION IF EXISTS public.apply_for_owner_role(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.apply_for_owner_role;
CREATE OR REPLACE FUNCTION public.apply_for_owner_role(
  p_full_name TEXT,
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'You must be authenticated to apply as a space owner.');
  END IF;

  UPDATE public.profiles
  SET owner_status = 'pending_review',
      full_name = COALESCE(NULLIF(p_full_name, ''), full_name),
      phone = COALESCE(NULLIF(p_phone, ''), phone),
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', TRUE, 'message', 'Your space owner application is submitted for review.');
END;
$$;

-- Concurrency Protection & Overlap Check Function
DROP FUNCTION IF EXISTS public.check_capacity_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS public.check_capacity_availability;
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
      (
        COALESCE(start_timestamptz, (booking_date::TEXT || ' ' || start_time::TEXT)::TIMESTAMPTZ),
        COALESCE(end_timestamptz, (booking_date::TEXT || ' ' || end_time::TEXT)::TIMESTAMPTZ)
      ) OVERLAPS (p_start_time, p_end_time)
      OR (check_in_at IS NOT NULL AND check_out_at IS NULL AND (booking_status = 'active' OR status = 'active'))
    );


  RETURN (v_overlapping_count < v_capacity);
END;
$$;

-- Atomic Server-Side Booking Creation RPC
DROP FUNCTION IF EXISTS public.create_verified_booking(UUID, TEXT, TIMESTAMPTZ, INT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_verified_booking;
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
      start_timestamptz,
      end_timestamptz,
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
      p_start_time,
      v_end_time,
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

-- Server-Side Razorpay Order Creation RPC
DROP FUNCTION IF EXISTS public.create_payment_order(UUID, TEXT, INT, TEXT[], TEXT[]);
DROP FUNCTION IF EXISTS public.create_payment_order(UUID, TEXT, INT, TEXT[]);
DROP FUNCTION IF EXISTS public.create_payment_order;
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

-- Idempotent Payment Reconciliation RPC (Webhooks & Verified Callbacks)
DROP FUNCTION IF EXISTS public.record_payment_reconciliation(UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.record_payment_reconciliation;
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

-- Cryptographic Server-Side Signature Verification RPC
DROP FUNCTION IF EXISTS public.verify_razorpay_payment(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.verify_razorpay_payment;
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

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Vehicles Policies
DROP POLICY IF EXISTS "Users manage own vehicles" ON public.vehicles;
CREATE POLICY "Users manage own vehicles" ON public.vehicles FOR ALL USING (auth.uid() = user_id);

-- Parking Spaces Policies
DROP POLICY IF EXISTS "Anyone can view active parking spaces" ON public.parking_spaces;
CREATE POLICY "Anyone can view active parking spaces" ON public.parking_spaces FOR SELECT USING (status = 'active' OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can manage own parking spaces" ON public.parking_spaces;
CREATE POLICY "Owners can manage own parking spaces" ON public.parking_spaces FOR ALL USING (auth.uid() = owner_id);

-- Parking Locations Policies
DROP POLICY IF EXISTS "Public parking locations readable by all" ON public.parking_locations;
CREATE POLICY "Public parking locations readable by all" ON public.parking_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage own parking locations" ON public.parking_locations;
CREATE POLICY "Owners can manage own parking locations" ON public.parking_locations FOR ALL USING (auth.uid() = owner_id);

-- Parking Images & Availability
DROP POLICY IF EXISTS "Public images read" ON public.parking_images;
CREATE POLICY "Public images read" ON public.parking_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public availability read" ON public.parking_availability;
CREATE POLICY "Public availability read" ON public.parking_availability FOR SELECT USING (true);

-- Bookings Policies
DROP POLICY IF EXISTS "Drivers can view own bookings" ON public.bookings;
CREATE POLICY "Drivers can view own bookings" ON public.bookings FOR SELECT USING (
  auth.uid() = driver_id OR auth.uid() = user_id OR auth.uid() IN (
    SELECT owner_id FROM public.parking_spaces WHERE id = parking_space_id
  ) OR auth.uid() IN (
    SELECT owner_id FROM public.parking_locations WHERE id = parking_location_id
  )
);

DROP POLICY IF EXISTS "Drivers can insert bookings" ON public.bookings;
CREATE POLICY "Drivers can insert bookings" ON public.bookings FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (auth.uid() = driver_id OR auth.uid() = user_id)
);

DROP POLICY IF EXISTS "Authorized users update bookings" ON public.bookings;
CREATE POLICY "Authorized users update bookings" ON public.bookings FOR UPDATE USING (
  auth.uid() = driver_id 
  OR auth.uid() = user_id
  OR auth.uid() IN (SELECT owner_id FROM public.parking_spaces WHERE id = parking_space_id)
  OR auth.uid() IN (SELECT owner_id FROM public.parking_locations WHERE id = parking_location_id)
);

-- Payments Policies
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = payments.booking_id AND (b.driver_id = auth.uid() OR b.user_id = auth.uid())
  )
);

-- Booking Events Policies
DROP POLICY IF EXISTS "Owners can view events for managed bookings" ON public.booking_events;
CREATE POLICY "Owners can view events for managed bookings" ON public.booking_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.parking_spaces s ON b.parking_space_id = s.id
    WHERE b.id = booking_events.booking_id
      AND (s.owner_id = auth.uid() OR b.driver_id = auth.uid() OR b.user_id = auth.uid())
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

-- Reviews Policies
DROP POLICY IF EXISTS "Public reviews read" ON public.reviews;
CREATE POLICY "Public reviews read" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Drivers can create reviews" ON public.reviews;
CREATE POLICY "Drivers can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = driver_id);

-- ==============================================================================
-- FUNCTION PRIVILEGE SECURITY HARDENING
-- ==============================================================================
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
