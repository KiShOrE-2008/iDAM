// An owner sets up (or changes) the bank account their parking earnings are paid to.
// Creates the owner's Razorpay Route linked account step by step, saving each id as it
// goes so a failed attempt can simply be submitted again. Bank account numbers and PAN
// go straight to Razorpay; iDAM keeps only the last 4 digits and the IFSC.
import { adminClient, callerUser } from '../_shared/supabase.ts';
import { corsHeaders, json } from '../_shared/razorpay.ts';
import {
  activationStatus,
  buildLinkedAccountRequest,
  buildSettlementRequest,
  buildStakeholderRequest,
  razorpayError,
  razorpayRequest,
  validatePayoutDetails
} from '../_shared/payouts.ts';
import { razorpayKeys, sweepPayouts } from '../_shared/payoutRunner.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const db = adminClient();
    const user = await callerUser(req, db);
    if (!user?.email) return json({ error: 'UNAUTHENTICATED', message: 'Please sign in again.' }, 401);

    const { count } = await db.from('parking_spaces').select('id', { count: 'exact', head: true }).eq('owner_id', user.id);
    if (!count) return json({ error: 'NOT_AN_OWNER', message: 'List a parking space first, then add your bank account.' }, 403);

    const checked = validatePayoutDetails((await req.json().catch(() => ({}))) ?? {});
    if (!checked.ok) return json({ error: 'INVALID_DETAILS', message: 'Please check the highlighted fields.', fields: checked.errors }, 400);
    const d = checked.details;
    const keys = razorpayKeys();

    const { data: existing } = await db.from('owner_payout_accounts').select('*').eq('owner_id', user.id).maybeSingle();
    const account = existing ?? { owner_id: user.id };
    const save = async (patch: Record<string, unknown>) => {
      Object.assign(account, patch);
      const { error } = await db.from('owner_payout_accounts')
        .upsert({ ...account, updated_at: new Date().toISOString() }, { onConflict: 'owner_id' });
      if (error) throw error;
    };
    const fail = async (step: string, res: { status: number; data: any }) => {
      const message = `${step}: ${razorpayError(res as any)}`;
      console.error('owner-payout-account', user.id, message);
      await save({ last_error: message });
      return json({ error: 'RAZORPAY_REJECTED', message }, 502);
    };

    // 1. Linked account
    if (!account.razorpay_account_id) {
      const res = await razorpayRequest(keys, 'POST', '/v2/accounts', buildLinkedAccountRequest(user.id, user.email, d));
      if (!res.ok || !res.data?.id) return fail('Creating your payout account', res);
      await save({ razorpay_account_id: res.data.id, activation_status: 'requested' });
    }
    const base = `/v2/accounts/${account.razorpay_account_id}`;

    // 2. Stakeholder (the owner themself, with PAN for KYC)
    if (!account.stakeholder_id) {
      const res = await razorpayRequest(keys, 'POST', `${base}/stakeholders`, buildStakeholderRequest(user.email, d));
      if (!res.ok || !res.data?.id) return fail('Saving your KYC details', res);
      await save({ stakeholder_id: res.data.id });
    }

    // 3. Route product
    if (!account.product_id) {
      const res = await razorpayRequest(keys, 'POST', `${base}/products`, { product_name: 'route', tnc_accepted: true });
      if (!res.ok || !res.data?.id) return fail('Enabling payouts', res);
      await save({ product_id: res.data.id });
    }

    // 4. Bank account (also how an owner changes it later)
    const res = await razorpayRequest(keys, 'PATCH', `${base}/products/${account.product_id}`, buildSettlementRequest(d));
    if (!res.ok) return fail('Saving your bank account', res);
    await save({
      activation_status: activationStatus(res.data),
      requirements: res.data?.requirements ?? [],
      beneficiary_name: d.beneficiary_name,
      bank_last4: d.account_number.slice(-4),
      ifsc: d.ifsc,
      last_error: null
    });

    // Activation turns waiting payouts 'ready' (database trigger): send them now
    if (account.activation_status === 'activated') {
      await sweepPayouts(db, keys).catch(err => console.error('payout sweep after activation failed', err));
    }

    return json({
      success: true,
      activation_status: account.activation_status,
      requirements: account.requirements,
      bank_last4: account.bank_last4
    });
  } catch (err) {
    console.error('owner-payout-account error', err);
    return json({ error: 'INTERNAL', message: 'Something went wrong. Please try again.' }, 500);
  }
});
