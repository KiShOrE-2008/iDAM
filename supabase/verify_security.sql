-- Read-only security check for a live iDAM project. Paste into the Supabase SQL Editor and Run.
-- Every row should say ok = true. It changes nothing.
SELECT item, ok FROM (VALUES
  ('C1 listings: approval column exists',
    EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'parking_spaces' AND column_name = 'is_approved')),
  ('C1 listings: review trigger installed',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_parking_space_review')),
  ('C1 listings: old self-publish rules removed',
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'parking_spaces'
                AND policyname IN ('Owners can manage own parking spaces', 'Public parking spaces readable by all'))),
  ('C1 listings: legacy parking_locations is read-only',
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'parking_locations' AND cmd <> 'SELECT')),
  ('C1 bookings: only live listings, car/bike only',
    pg_get_functiondef('public.create_verified_booking(uuid,text,timestamptz,integer,text,text,text,text[],text,text,text)'::regprocedure)
      LIKE '%SPACE_UNAVAILABLE%INVALID_VEHICLE_TYPE%'
    OR pg_get_functiondef('public.create_verified_booking(uuid,text,timestamptz,integer,text,text,text,text[],text,text,text)'::regprocedure)
      LIKE '%INVALID_VEHICLE_TYPE%SPACE_UNAVAILABLE%'),
  ('C2 profiles: no public read rule',
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT' AND qual = 'true')),
  ('C2 profiles: users read only their own',
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users read own profile')),
  ('C3 audit log: no client insert rules',
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'booking_events' AND cmd IN ('INSERT', 'ALL'))),
  ('Payments: bookings cannot be inserted or edited by clients',
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bookings' AND cmd IN ('INSERT', 'UPDATE', 'ALL'))),
  ('Payments: old verify function with caller secret removed',
    to_regprocedure('public.verify_razorpay_payment(uuid,text,text,text,text)') IS NULL),
  ('Payments: reconciliation not callable by logged-in users',
    NOT has_function_privilege('authenticated', 'public.record_payment_reconciliation(uuid,text,numeric,text,text,jsonb)', 'EXECUTE')),
  ('Payments: reconciliation not callable by visitors',
    NOT has_function_privilege('anon', 'public.record_payment_reconciliation(uuid,text,numeric,text,text,jsonb)', 'EXECUTE')),
  ('Payments: backend can reconcile (webhook)',
    has_function_privilege('service_role', 'public.record_payment_reconciliation(uuid,text,numeric,text,text,jsonb)', 'EXECUTE')),
  ('Bookings: visitors cannot cancel',
    NOT has_function_privilege('anon', 'public.cancel_booking(uuid,text)', 'EXECUTE')),
  ('Bookings can start unpaid (status rules allow pending)',
    (SELECT bool_and(pg_get_constraintdef(con.oid) LIKE '%pending%')
     FROM pg_constraint con
     WHERE con.conrelid = 'public.bookings'::regclass AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ~ '\m(status|booking_status|payment_status)\M')),
  ('Payments can be confirmed (tables match the confirmation function)',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'updated_at')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'updated_at')
    AND EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conrelid = 'public.booking_events'::regclass AND con.contype = 'c'
                AND pg_get_constraintdef(con.oid) LIKE '%''paid''%')),
  ('Gate: a typed pass code also needs the vehicle plate',
    to_regprocedure('public.confirm_booking_check_in(uuid,text,text,text)') IS NOT NULL
    AND to_regprocedure('public.confirm_booking_check_in(uuid,text,text)') IS NULL),
  ('Admin console: functions closed to visitors (and check is_admin inside)',
    to_regprocedure('public.admin_summary()') IS NOT NULL
    AND NOT has_function_privilege('anon', 'public.admin_summary()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.admin_review_space(uuid,text,text)', 'EXECUTE')
    AND pg_get_functiondef('public.admin_review_space(uuid,text,text)'::regprocedure) LIKE '%require_admin%'),
  ('Overnight fix: timestamp sync trigger installed',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_booking_timestamps')),
  -- Any rule not on this list (e.g. left over from an old schema) is a potential hole:
  -- list them with SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public';
  ('No unexpected access rules (old leftovers)',
    NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND (p.tablename, p.policyname) NOT IN (VALUES
          ('booking_events', 'Owners can view events for managed bookings'),
          ('booking_events', 'View booking events'),
          ('bookings', 'Drivers and owners view bookings'),
          ('parking_availability', 'Public availability read'),
          ('parking_images', 'Owners manage images'),
          ('parking_images', 'Public view images'),
          ('parking_locations', 'Public parking locations readable by all'),
          ('parking_spaces', 'Anyone view active spaces'),
          ('parking_spaces', 'Owners insert spaces'),
          ('parking_spaces', 'Owners update spaces'),
          ('payments', 'Drivers view own payments'),
          ('profiles', 'Users insert own profile'),
          ('profiles', 'Users read own profile'),
          ('profiles', 'Users update own profile'),
          ('reviews', 'Drivers insert review for completed booking'),
          ('reviews', 'Public view reviews'),
          ('vehicles', 'Users manage own vehicles')
        )))
) AS t(item, ok);
