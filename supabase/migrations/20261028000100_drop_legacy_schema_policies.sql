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
