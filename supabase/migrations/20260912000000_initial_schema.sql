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
