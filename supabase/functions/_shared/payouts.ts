// Pure Razorpay Route helpers for owner payouts. No Deno globals, so they are
// unit-tested from test/12_owner_payouts_logic.test.mjs.
import { amountInPaise } from './razorpay.ts';

/** Owner money stays on hold this long after the parking ends (complaints, no-shows). */
export const PAYOUT_HOLD_AFTER_END_MS = 24 * 60 * 60 * 1000;
/** Razorpay recommends on_hold_until at least 30 minutes after the transfer is created. */
const MIN_HOLD_LEAD_MS = 35 * 60 * 1000;
/** A row stuck in 'transferring' this long is checked against Razorpay before retrying. */
export const STALE_TRANSFER_MS = 10 * 60 * 1000;

// Razorpay business category for every iDAM owner
export const LINKED_ACCOUNT_CATEGORY = { category: 'transport', subcategory: 'parking_lots_and_garages' };

export interface RazorpayKeys {
  keyId: string;
  keySecret: string;
}

export interface RazorpayResult<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

export async function razorpayRequest<T = any>(
  keys: RazorpayKeys,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown
): Promise<RazorpayResult<T>> {
  const res = await fetch(`https://api.razorpay.com${path}`, {
    method,
    headers: {
      Authorization: 'Basic ' + btoa(`${keys.keyId}:${keys.keySecret}`),
      'Content-Type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Razorpay's human-readable reason for a failed call. */
export function razorpayError(result: RazorpayResult): string {
  const e = result.data?.error;
  const text = [e?.description, e?.field ? `(${e.field})` : ''].filter(Boolean).join(' ');
  return text || `Razorpay returned HTTP ${result.status}`;
}

// ---------------------------------------------------------
// Owner bank details -> linked account
// ---------------------------------------------------------

export interface PayoutDetailsInput {
  beneficiary_name?: unknown;
  account_number?: unknown;
  ifsc?: unknown;
  pan?: unknown;
  phone?: unknown;
  street1?: unknown;
  street2?: unknown;
  city?: unknown;
  state?: unknown;
  postal_code?: unknown;
}

export interface PayoutDetails {
  beneficiary_name: string;
  account_number: string;
  ifsc: string;
  pan: string;
  phone: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postal_code: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

/** Normalised details, or the problems keyed by field (shown next to the form inputs). */
export function validatePayoutDetails(input: PayoutDetailsInput):
  { ok: true; details: PayoutDetails } | { ok: false; errors: Record<string, string> } {
  const d: PayoutDetails = {
    beneficiary_name: str(input.beneficiary_name),
    account_number: str(input.account_number).replace(/\s/g, ''),
    ifsc: str(input.ifsc).replace(/\s/g, '').toUpperCase(),
    pan: str(input.pan).replace(/\s/g, '').toUpperCase(),
    phone: str(input.phone).replace(/[^\d]/g, '').replace(/^(91|0)(?=\d{10}$)/, ''),
    street1: str(input.street1),
    street2: str(input.street2),
    city: str(input.city),
    state: str(input.state).toUpperCase(),
    postal_code: str(input.postal_code).replace(/\s/g, '')
  };
  const errors: Record<string, string> = {};
  if (d.beneficiary_name.length < 4 || d.beneficiary_name.length > 120) errors.beneficiary_name = 'Enter the name exactly as on the bank account.';
  if (!/^\d{9,18}$/.test(d.account_number)) errors.account_number = 'Bank account numbers are 9 to 18 digits.';
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(d.ifsc)) errors.ifsc = 'IFSC looks like HDFC0001234 (11 characters).';
  // Individual PAN: 4th character is P
  if (!/^[A-Z]{3}P[A-Z]\d{4}[A-Z]$/.test(d.pan)) errors.pan = 'Enter your personal PAN, e.g. ABCPE1234F.';
  if (!/^[6-9]\d{9}$/.test(d.phone)) errors.phone = 'Enter a 10-digit Indian mobile number.';
  if (d.street1.length < 3 || d.street1.length > 100) errors.street1 = 'Enter the house / street.';
  if (d.street2.length < 3 || d.street2.length > 100) errors.street2 = 'Enter the area / locality.';
  if (d.city.length < 2 || d.city.length > 100) errors.city = 'Enter the city.';
  if (d.state.length < 2 || d.state.length > 32) errors.state = 'Enter the state.';
  if (!/^[1-9]\d{5}$/.test(d.postal_code)) errors.postal_code = 'PIN codes are 6 digits.';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, details: d };
}

/** Razorpay reference_id is 3-20 characters: the owner's id without dashes, shortened. */
export function linkedAccountReference(ownerId: string): string {
  return ownerId.replace(/-/g, '').slice(0, 20);
}

/** Body for POST /v2/accounts */
export function buildLinkedAccountRequest(ownerId: string, email: string, d: PayoutDetails) {
  return {
    email,
    phone: d.phone,
    type: 'route',
    reference_id: linkedAccountReference(ownerId),
    legal_business_name: d.beneficiary_name,
    business_type: 'individual',
    contact_name: d.beneficiary_name,
    profile: {
      ...LINKED_ACCOUNT_CATEGORY,
      addresses: {
        registered: {
          street1: d.street1,
          street2: d.street2,
          city: d.city,
          state: d.state,
          postal_code: d.postal_code,
          country: 'IN'
        }
      }
    }
  };
}

/** Body for POST /v2/accounts/:id/stakeholders */
export function buildStakeholderRequest(email: string, d: PayoutDetails) {
  return { name: d.beneficiary_name, email, kyc: { pan: d.pan } };
}

/** Body for PATCH /v2/accounts/:id/products/:product_id */
export function buildSettlementRequest(d: PayoutDetails) {
  return {
    settlements: { account_number: d.account_number, ifsc_code: d.ifsc, beneficiary_name: d.beneficiary_name },
    tnc_accepted: true
  };
}

const ACTIVATION_STATUSES = ['requested', 'needs_clarification', 'under_review', 'activated', 'suspended'];
export function activationStatus(product: any): string {
  return ACTIVATION_STATUSES.includes(product?.activation_status) ? product.activation_status : 'requested';
}

// ---------------------------------------------------------
// Transfers
// ---------------------------------------------------------

/** Hold until 24h after the parking ends; release now if that moment is (almost) past. */
export function holdUntil(endIso: string | null, nowMs: number): { on_hold: boolean; on_hold_until?: number } {
  const end = endIso ? Date.parse(endIso) : NaN;
  const until = (Number.isFinite(end) ? end : nowMs) + PAYOUT_HOLD_AFTER_END_MS;
  if (until - nowMs < MIN_HOLD_LEAD_MS) return { on_hold: false };
  return { on_hold: true, on_hold_until: Math.floor(until / 1000) };
}

export interface TransferBooking {
  id: string;
  pass_code: string;
  end_timestamptz: string | null;
}

/** Body for POST /v1/payments/:payment_id/transfers */
export function buildTransferRequest(accountId: string, amountRupees: number | string, booking: TransferBooking, nowMs: number) {
  return {
    transfers: [
      {
        account: accountId,
        amount: amountInPaise(amountRupees),
        currency: 'INR',
        notes: { booking_id: booking.id, pass_code: booking.pass_code },
        linked_account_notes: ['pass_code'],
        ...holdUntil(booking.end_timestamptz, nowMs)
      }
    ]
  };
}

/** The transfer this payout already made, if Razorpay has one (used to recover from crashes). */
export function findBookingTransfer(collection: any, accountId: string, bookingId: string): any | null {
  const items: any[] = Array.isArray(collection?.items) ? collection.items : [];
  return items.find(t => t?.recipient === accountId && t?.notes?.booking_id === bookingId) ?? null;
}

/** Ledger status for a Razorpay transfer entity. */
export function payoutStatusForTransfer(transfer: any): 'on_hold' | 'released' | 'settled' | 'reversed' | 'failed' {
  if (transfer?.status === 'failed') return 'failed';
  if (transfer?.amount && Number(transfer.amount_reversed) >= Number(transfer.amount)) return 'reversed';
  if (transfer?.settlement_status === 'settled') return 'settled';
  if (transfer?.on_hold === false || transfer?.settlement_status === 'pending') return 'released';
  return 'on_hold';
}
