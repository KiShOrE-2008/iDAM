// Moves owner_payouts rows along by talking to Razorpay Route. Every step is safe to run
// twice: rows are claimed with a status guard, and a crash between "Razorpay made the
// transfer" and "we saved it" is recovered by looking the transfer up on the payment.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';
import {
  STALE_TRANSFER_MS,
  activationStatus,
  buildTransferRequest,
  findBookingTransfer,
  payoutStatusForTransfer,
  razorpayError,
  razorpayRequest,
  type RazorpayKeys
} from './payouts.ts';
import { requireEnv } from './supabase.ts';

export function razorpayKeys(): RazorpayKeys {
  return { keyId: requireEnv('RAZORPAY_KEY_ID'), keySecret: requireEnv('RAZORPAY_KEY_SECRET') };
}

interface PayoutRow {
  booking_id: string;
  owner_id: string;
  amount: number;
  status: string;
  razorpay_transfer_id: string | null;
  on_hold_until: string | null;
  attempts: number;
  updated_at: string;
}

const now = () => new Date().toISOString();

async function loadRow(db: SupabaseClient, bookingId: string): Promise<PayoutRow | null> {
  const { data } = await db.from('owner_payouts').select('*').eq('booking_id', bookingId).maybeSingle();
  return data as PayoutRow | null;
}

async function loadContext(db: SupabaseClient, row: PayoutRow) {
  const [{ data: booking }, { data: account }] = await Promise.all([
    db.from('bookings').select('id, pass_code, payment_id, end_timestamptz').eq('id', row.booking_id).maybeSingle(),
    db.from('owner_payout_accounts').select('razorpay_account_id, activation_status').eq('owner_id', row.owner_id).maybeSingle()
  ]);
  return { booking, account };
}

async function setError(db: SupabaseClient, bookingId: string, message: string) {
  await db.from('owner_payouts').update({ last_error: message.slice(0, 500), updated_at: now() }).eq('booking_id', bookingId);
}

/** Saves a transfer Razorpay made, moving 'transferring' on to its real state. */
async function adoptTransfer(db: SupabaseClient, row: PayoutRow, transfer: any) {
  const until = transfer.on_hold_until ? new Date(transfer.on_hold_until * 1000).toISOString() : null;
  await db.from('owner_payouts')
    .update({ razorpay_transfer_id: transfer.id, on_hold_until: until, last_error: null, updated_at: now() })
    .eq('booking_id', row.booking_id);
  const next = payoutStatusForTransfer(transfer);
  const status = next === 'failed' ? 'ready' : next;
  // A booking cancelled meanwhile is 'reversal_pending' and stays that way
  await db.from('owner_payouts')
    .update({ status, released_at: status === 'released' || status === 'settled' ? now() : null })
    .eq('booking_id', row.booking_id)
    .eq('status', 'transferring');
}

async function sendTransfer(db: SupabaseClient, keys: RazorpayKeys, row: PayoutRow): Promise<string> {
  const { booking, account } = await loadContext(db, row);
  if (!account?.razorpay_account_id || account.activation_status !== 'activated') {
    await db.from('owner_payouts').update({ status: 'awaiting_account', updated_at: now() })
      .eq('booking_id', row.booking_id).eq('status', 'ready');
    return 'awaiting_account';
  }
  if (!booking?.payment_id) {
    await setError(db, row.booking_id, 'Booking has no Razorpay payment id');
    return 'ready';
  }

  // Claim it, so a concurrent run cannot send it twice
  const { data: claimed } = await db.from('owner_payouts')
    .update({ status: 'transferring', attempts: row.attempts + 1, updated_at: now() })
    .eq('booking_id', row.booking_id).in('status', ['ready', 'awaiting_account'])
    .select('booking_id').maybeSingle();
  if (!claimed) return 'busy';

  const res = await razorpayRequest(keys, 'POST', `/v1/payments/${booking.payment_id}/transfers`,
    buildTransferRequest(account.razorpay_account_id, row.amount, booking, Date.now()));
  const transfer = res.ok ? res.data?.items?.[0] : null;
  if (!transfer?.id) {
    const message = razorpayError(res);
    await db.from('owner_payouts').update({ status: 'ready', last_error: message, updated_at: now() })
      .eq('booking_id', row.booking_id).eq('status', 'transferring');
    // Cancelled while we were sending, and nothing was sent
    await db.from('owner_payouts').update({ status: 'cancelled', updated_at: now() })
      .eq('booking_id', row.booking_id).eq('status', 'reversal_pending').is('razorpay_transfer_id', null);
    return `failed: ${message}`;
  }
  await adoptTransfer(db, row, transfer);
  const after = await loadRow(db, row.booking_id);
  if (after?.status === 'reversal_pending') return reverse(db, keys, after);
  return after?.status ?? 'on_hold';
}

/** A run died mid-transfer: find out from Razorpay whether the transfer happened. */
async function recover(db: SupabaseClient, keys: RazorpayKeys, row: PayoutRow): Promise<string> {
  if (Date.now() - Date.parse(row.updated_at) < STALE_TRANSFER_MS) return 'busy';
  const { booking, account } = await loadContext(db, row);
  if (!booking?.payment_id || !account?.razorpay_account_id) return row.status;
  const res = await razorpayRequest(keys, 'GET', `/v1/payments/${booking.payment_id}/transfers`);
  if (!res.ok) {
    await setError(db, row.booking_id, razorpayError(res));
    return row.status;
  }
  const transfer = findBookingTransfer(res.data, account.razorpay_account_id, row.booking_id);
  if (transfer) {
    await adoptTransfer(db, row, transfer);
    const after = await loadRow(db, row.booking_id);
    return after?.status === 'reversal_pending' ? reverse(db, keys, after) : after?.status ?? row.status;
  }
  const next = row.status === 'reversal_pending' ? 'cancelled' : 'ready';
  await db.from('owner_payouts').update({ status: next, updated_at: now() })
    .eq('booking_id', row.booking_id).eq('status', row.status).is('razorpay_transfer_id', null);
  return next === 'ready' ? sendTransfer(db, keys, { ...row, status: 'ready', attempts: row.attempts }) : next;
}

async function reverse(db: SupabaseClient, keys: RazorpayKeys, row: PayoutRow): Promise<string> {
  if (!row.razorpay_transfer_id) return recover(db, keys, row);
  const res = await razorpayRequest(keys, 'POST', `/v1/transfers/${row.razorpay_transfer_id}/reversals`, {
    notes: { booking_id: row.booking_id, reason: 'booking cancelled' }
  });
  if (!res.ok || !res.data?.id) {
    await setError(db, row.booking_id, razorpayError(res));
    return 'reversal_pending';
  }
  await db.from('owner_payouts')
    .update({ status: 'reversed', razorpay_reversal_id: res.data.id, reversed_at: now(), last_error: null, updated_at: now() })
    .eq('booking_id', row.booking_id).eq('status', 'reversal_pending');
  return 'reversed';
}

/** Checks a sent transfer: released from hold? settled to the owner's bank? */
async function refresh(db: SupabaseClient, keys: RazorpayKeys, row: PayoutRow): Promise<string> {
  if (!row.razorpay_transfer_id) return row.status;
  const res = await razorpayRequest(keys, 'GET', `/v1/transfers/${row.razorpay_transfer_id}`);
  if (!res.ok) {
    await setError(db, row.booking_id, razorpayError(res));
    return row.status;
  }
  const next = payoutStatusForTransfer(res.data);
  if (next === row.status || next === 'failed') return row.status;
  await db.from('owner_payouts')
    .update({
      status: next,
      released_at: next === 'released' || next === 'settled' ? now() : null,
      reversed_at: next === 'reversed' ? now() : null,
      last_error: null,
      updated_at: now()
    })
    .eq('booking_id', row.booking_id).eq('status', row.status);
  return next;
}

/** Does whatever the payout for this booking needs next. Returns its new status. */
export async function processPayout(db: SupabaseClient, keys: RazorpayKeys, bookingId: string): Promise<string | null> {
  const row = await loadRow(db, bookingId);
  if (!row) return null;
  switch (row.status) {
    case 'awaiting_account':
    case 'ready':
      return sendTransfer(db, keys, row);
    case 'transferring':
      return recover(db, keys, row);
    case 'reversal_pending':
      return reverse(db, keys, row);
    case 'on_hold':
      return row.on_hold_until && Date.parse(row.on_hold_until) > Date.now() ? row.status : refresh(db, keys, row);
    case 'released':
      return refresh(db, keys, row);
    default:
      return row.status;
  }
}

/** Refreshes linked accounts Razorpay is still reviewing (activation releases waiting payouts). */
export async function refreshPendingAccounts(db: SupabaseClient, keys: RazorpayKeys): Promise<number> {
  const { data } = await db.from('owner_payout_accounts')
    .select('owner_id, razorpay_account_id, product_id, activation_status')
    .not('product_id', 'is', null)
    .in('activation_status', ['requested', 'needs_clarification', 'under_review']);
  let changed = 0;
  for (const a of data ?? []) {
    const res = await razorpayRequest(keys, 'GET', `/v2/accounts/${a.razorpay_account_id}/products/${a.product_id}`);
    if (!res.ok) continue;
    const status = activationStatus(res.data);
    if (status !== a.activation_status) changed++;
    await db.from('owner_payout_accounts')
      .update({ activation_status: status, requirements: res.data?.requirements ?? [], updated_at: now() })
      .eq('owner_id', a.owner_id);
  }
  return changed;
}

/** One pass over every payout that needs work. */
export async function sweepPayouts(db: SupabaseClient, keys: RazorpayKeys) {
  const accountsChanged = await refreshPendingAccounts(db, keys);
  const { data } = await db.from('owner_payouts')
    .select('booking_id, status, on_hold_until')
    .in('status', ['ready', 'transferring', 'reversal_pending', 'on_hold', 'released'])
    .order('created_at')
    .limit(200);
  const due = (data ?? []).filter(r => r.status !== 'on_hold' || !r.on_hold_until || Date.parse(r.on_hold_until) <= Date.now());
  const results: Record<string, number> = {};
  for (const r of due) {
    let status: string | null;
    try {
      status = await processPayout(db, keys, r.booking_id);
    } catch (err) {
      console.error('payout failed', r.booking_id, err);
      status = 'error';
    }
    const key = status?.startsWith('failed') ? 'failed' : status ?? 'missing';
    results[key] = (results[key] ?? 0) + 1;
  }
  return { accounts_changed: accountsChanged, processed: due.length, results };
}
