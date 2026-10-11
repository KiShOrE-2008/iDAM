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
     AND current_user NOT IN ('postgres', 'app_migrator')
     AND COALESCE(auth.jwt()->>'role', '') != 'service_role'
  THEN
    RAISE EXCEPTION 'Users cannot alter their own role directly.';
  END IF;

  -- Prevent unauthorized owner status elevation by authenticated user on their own profile
  IF TG_OP = 'UPDATE'
     AND NEW.owner_status IS DISTINCT FROM OLD.owner_status
     AND auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND current_user NOT IN ('postgres', 'app_migrator')
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
