/**
 * Owner payouts (Razorpay Route). The owner's bank details go to the owner-payout-account
 * Edge Function, which passes them to Razorpay; iDAM stores only the last 4 digits.
 * See supabase/migrations/20261031000000_owner_payouts.sql for the payout states.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type ActivationStatus = 'not_started' | 'requested' | 'needs_clarification' | 'under_review' | 'activated' | 'suspended';
export type PayoutStatus =
  | 'awaiting_account' | 'ready' | 'transferring' | 'on_hold' | 'released' | 'settled'
  | 'reversal_pending' | 'reversed' | 'cancelled';

export interface PayoutOverview {
  has_listings: boolean;
  account: {
    activation_status: ActivationStatus;
    beneficiary_name: string | null;
    bank_last4: string | null;
    ifsc: string | null;
    requirements: { field_reference?: string; reason_code?: string }[];
    last_error: string | null;
    updated_at: string;
  } | null;
  totals: { waiting_for_bank: number; on_hold: number; released: number };
  payouts: {
    booking_id: string;
    amount: number;
    gross_amount: number;
    platform_fee: number;
    status: PayoutStatus;
    on_hold_until: string | null;
    released_at: string | null;
    created_at: string;
    pass_code: string;
    start_at: string | null;
    lot: string | null;
  }[];
}

export interface PayoutDetailsForm {
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

export class PayoutSetupError extends Error {
  constructor(message: string, public fields: Record<string, string> = {}) {
    super(message);
  }
}

/** Plain-language payout state for owners and admins */
export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  awaiting_account: 'Waiting for your bank details',
  ready: 'Sending',
  transferring: 'Sending',
  on_hold: 'On hold until after parking',
  released: 'Released to bank',
  settled: 'Paid to bank',
  reversal_pending: 'Being reversed (cancelled)',
  reversed: 'Reversed (cancelled)',
  cancelled: 'Cancelled before payout'
};

export const ACTIVATION_LABEL: Record<ActivationStatus, string> = {
  not_started: 'Not set up',
  requested: 'Submitted',
  needs_clarification: 'Razorpay needs more details',
  under_review: 'Being verified',
  activated: 'Active',
  suspended: 'Suspended'
};

export async function fetchPayoutOverview(): Promise<PayoutOverview> {
  if (!isSupabaseConfigured || !supabase) throw new Error('The database is not configured.');
  const { data, error } = await supabase.rpc('owner_payout_overview');
  if (error) throw new Error(error.message);
  return data as PayoutOverview;
}

export async function savePayoutDetails(form: PayoutDetailsForm): Promise<{ activation_status: ActivationStatus }> {
  if (!isSupabaseConfigured || !supabase) throw new PayoutSetupError('The database is not configured.');
  const { data, error } = await supabase.functions.invoke('owner-payout-account', { body: form });
  if (error) {
    let payload: { message?: string; fields?: Record<string, string> } = {};
    const response = (error as { context?: Response }).context;
    if (response && typeof response.json === 'function') payload = await response.json().catch(() => ({}));
    throw new PayoutSetupError(payload.message || 'Could not reach the server. Please try again.', payload.fields);
  }
  return data;
}
