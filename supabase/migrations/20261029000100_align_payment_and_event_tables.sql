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
