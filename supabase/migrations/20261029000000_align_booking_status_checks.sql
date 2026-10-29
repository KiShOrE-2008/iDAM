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
