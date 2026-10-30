-- =========================================================
-- OWNER PAYOUTS (Razorpay Route)
-- =========================================================
-- Drivers pay iDAM. Each owner gets a Razorpay "linked account" (their bank account, KYC
-- done by Razorpay; iDAM stores only the account id and the last 4 digits). When a booking
-- on an owner's listing is paid, the owner's share (amount - iDAM fee) is transferred to
-- that linked account ON HOLD until 24 hours after the parking ends, then Razorpay
-- releases it to the owner's bank. A booking cancelled before release is reversed.
--
-- The database keeps the ledger (owner_payouts) and its state rules; the Edge Functions
-- owner-payout-account and process-payouts talk to Razorpay and move rows along:
--
--   awaiting_account -> ready -> transferring -> on_hold -> released -> settled
--                                     \______________\-> reversal_pending -> reversed
--   (cancelled before any transfer: -> cancelled)
--
-- Neither table has client policies: owners read their own data through
-- owner_payout_overview(), admins through admin_payouts(), the Edge Functions use
-- service_role.

-- ---------------------------------------------------------
-- 1. Linked accounts (one per owner)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owner_payout_accounts (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  razorpay_account_id TEXT UNIQUE,
  stakeholder_id TEXT,
  product_id TEXT,
  activation_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (activation_status IN ('not_started', 'requested', 'needs_clarification', 'under_review', 'activated', 'suspended')),
  beneficiary_name TEXT,
  bank_last4 TEXT,
  ifsc TEXT,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 2. Payout ledger (one row per paid booking on an owner's listing)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owner_payouts (
  booking_id UUID PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parking_space_id UUID REFERENCES public.parking_spaces(id) ON DELETE SET NULL,
  gross_amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'awaiting_account'
    CHECK (status IN ('awaiting_account', 'ready', 'transferring', 'on_hold', 'released', 'settled',
                      'reversal_pending', 'reversed', 'cancelled')),
  razorpay_transfer_id TEXT UNIQUE,
  razorpay_reversal_id TEXT,
  on_hold_until TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  released_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owner_payouts_owner ON public.owner_payouts(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_payouts_status ON public.owner_payouts(status);

ALTER TABLE public.owner_payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_payouts ENABLE ROW LEVEL SECURITY;
-- No policies: clients can neither read nor write these tables directly
REVOKE ALL ON public.owner_payout_accounts FROM PUBLIC;
REVOKE ALL ON public.owner_payouts FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.owner_payout_accounts FROM anon;
    REVOKE ALL ON public.owner_payouts FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.owner_payout_accounts FROM authenticated;
    REVOKE ALL ON public.owner_payouts FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON public.owner_payout_accounts TO service_role;
    GRANT ALL ON public.owner_payouts TO service_role;
  END IF;
END $$;

-- ---------------------------------------------------------
-- 3. Bookings drive the ledger
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_owner_payout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_ready BOOLEAN;
BEGIN
  -- Paid: open a ledger row for the listing's owner (legacy parking_locations lots have none)
  IF NEW.payment_status = 'completed' AND OLD.payment_status IS DISTINCT FROM 'completed'
     AND NEW.parking_space_id IS NOT NULL THEN
    SELECT owner_id INTO v_owner FROM public.parking_spaces WHERE id = NEW.parking_space_id;
    IF v_owner IS NOT NULL THEN
      v_ready := EXISTS (SELECT 1 FROM public.owner_payout_accounts
                         WHERE owner_id = v_owner AND activation_status = 'activated');
      INSERT INTO public.owner_payouts (booking_id, owner_id, parking_space_id, gross_amount, platform_fee, amount, status)
      VALUES (
        NEW.id, v_owner, NEW.parking_space_id, NEW.total_amount, COALESCE(NEW.platform_fee, 0),
        GREATEST(NEW.total_amount - COALESCE(NEW.platform_fee, 0), 0),
        CASE WHEN v_ready THEN 'ready' ELSE 'awaiting_account' END
      )
      ON CONFLICT (booking_id) DO NOTHING;
    END IF;
  END IF;

  -- Cancelled: nothing sent yet -> drop it; sent (or being sent) -> take it back
  IF NEW.booking_status = 'cancelled' AND OLD.booking_status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.owner_payouts
    SET status = CASE
                   WHEN status IN ('awaiting_account', 'ready') THEN 'cancelled'
                   WHEN status IN ('transferring', 'on_hold') THEN 'reversal_pending'
                   ELSE status
                 END,
        last_error = CASE
                       WHEN status IN ('released', 'settled') THEN 'Booking was cancelled after the payout was released'
                       ELSE last_error
                     END,
        updated_at = NOW()
    WHERE booking_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_owner_payout ON public.bookings;
CREATE TRIGGER trg_sync_owner_payout
  AFTER UPDATE OF payment_status, booking_status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_owner_payout();

-- An owner's account going live releases everything that was waiting for it
CREATE OR REPLACE FUNCTION public.release_waiting_owner_payouts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.activation_status = 'activated' AND OLD.activation_status IS DISTINCT FROM 'activated' THEN
    UPDATE public.owner_payouts
    SET status = 'ready', updated_at = NOW()
    WHERE owner_id = NEW.owner_id AND status = 'awaiting_account';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_waiting_owner_payouts ON public.owner_payout_accounts;
CREATE TRIGGER trg_release_waiting_owner_payouts
  AFTER UPDATE OF activation_status ON public.owner_payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.release_waiting_owner_payouts();

-- ---------------------------------------------------------
-- 4. Owner view: my payout account and my payouts
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owner_payout_overview()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'has_listings', EXISTS (SELECT 1 FROM public.parking_spaces WHERE owner_id = v_uid),
    'account', (
      SELECT jsonb_build_object(
        'activation_status', a.activation_status,
        'beneficiary_name', a.beneficiary_name,
        'bank_last4', a.bank_last4,
        'ifsc', a.ifsc,
        'requirements', a.requirements,
        'last_error', a.last_error,
        'updated_at', a.updated_at
      )
      FROM public.owner_payout_accounts a WHERE a.owner_id = v_uid
    ),
    'totals', (
      SELECT jsonb_build_object(
        'waiting_for_bank', COALESCE(SUM(amount) FILTER (WHERE status = 'awaiting_account'), 0),
        'on_hold', COALESCE(SUM(amount) FILTER (WHERE status IN ('ready', 'transferring', 'on_hold')), 0),
        'released', COALESCE(SUM(amount) FILTER (WHERE status IN ('released', 'settled')), 0)
      )
      FROM public.owner_payouts WHERE owner_id = v_uid
    ),
    'payouts', COALESCE((
      SELECT jsonb_agg(row_to_json(x) ORDER BY x.created_at DESC)
      FROM (
        SELECT p.booking_id, p.amount, p.gross_amount, p.platform_fee, p.status, p.on_hold_until,
               p.released_at, p.created_at, b.pass_code, b.start_timestamptz AS start_at,
               s.title AS lot
        FROM public.owner_payouts p
        JOIN public.bookings b ON b.id = p.booking_id
        LEFT JOIN public.parking_spaces s ON s.id = p.parking_space_id
        WHERE p.owner_id = v_uid
        ORDER BY p.created_at DESC
        LIMIT 100
      ) x
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------
-- 5. Admin view: every payout and every owner's account state
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_payouts(p_status TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_admin();

  RETURN jsonb_build_object(
    'totals', (
      SELECT jsonb_build_object(
        'waiting_for_bank', COALESCE(SUM(amount) FILTER (WHERE status = 'awaiting_account'), 0),
        'to_send', COALESCE(SUM(amount) FILTER (WHERE status IN ('ready', 'transferring')), 0),
        'on_hold', COALESCE(SUM(amount) FILTER (WHERE status = 'on_hold'), 0),
        'released', COALESCE(SUM(amount) FILTER (WHERE status IN ('released', 'settled')), 0),
        'reversals', COALESCE(SUM(amount) FILTER (WHERE status IN ('reversal_pending', 'reversed')), 0),
        'problems', COUNT(*) FILTER (WHERE last_error IS NOT NULL AND status NOT IN ('reversed', 'cancelled'))
      )
      FROM public.owner_payouts
    ),
    'payouts', COALESCE((
      SELECT jsonb_agg(row_to_json(x) ORDER BY x.created_at DESC)
      FROM (
        SELECT p.booking_id, p.amount, p.gross_amount, p.platform_fee, p.status, p.on_hold_until,
               p.razorpay_transfer_id, p.attempts, p.last_error, p.released_at, p.reversed_at,
               p.created_at, p.updated_at, b.pass_code, s.title AS lot,
               pr.full_name AS owner_name, pr.email AS owner_email
        FROM public.owner_payouts p
        JOIN public.bookings b ON b.id = p.booking_id
        LEFT JOIN public.parking_spaces s ON s.id = p.parking_space_id
        LEFT JOIN public.profiles pr ON pr.id = p.owner_id
        WHERE p_status IS NULL OR p.status = p_status
        ORDER BY p.created_at DESC
        LIMIT 300
      ) x
    ), '[]'::jsonb),
    'owners', COALESCE((
      SELECT jsonb_agg(row_to_json(o) ORDER BY o.owed DESC, o.name)
      FROM (
        SELECT pr.id, pr.full_name AS name, pr.email, pr.phone,
               COALESCE(a.activation_status, 'not_started') AS activation_status,
               a.razorpay_account_id, a.bank_last4, a.last_error,
               COALESCE((SELECT SUM(amount) FROM public.owner_payouts op
                         WHERE op.owner_id = pr.id AND op.status IN ('awaiting_account', 'ready', 'transferring', 'on_hold')), 0) AS owed
        FROM public.profiles pr
        LEFT JOIN public.owner_payout_accounts a ON a.owner_id = pr.id
        WHERE EXISTS (SELECT 1 FROM public.parking_spaces s WHERE s.owner_id = pr.id)
           OR a.owner_id IS NOT NULL
      ) o
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------
-- 6. Privileges
-- ---------------------------------------------------------
REVOKE ALL ON FUNCTION public.sync_owner_payout() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_waiting_owner_payouts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_payout_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_payouts(TEXT) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.sync_owner_payout() FROM anon;
    REVOKE ALL ON FUNCTION public.release_waiting_owner_payouts() FROM anon;
    REVOKE ALL ON FUNCTION public.owner_payout_overview() FROM anon;
    REVOKE ALL ON FUNCTION public.admin_payouts(TEXT) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.sync_owner_payout() FROM authenticated;
    REVOKE ALL ON FUNCTION public.release_waiting_owner_payouts() FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.owner_payout_overview() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.admin_payouts(TEXT) TO authenticated;
  END IF;
END $$;
