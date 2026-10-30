import assert from 'node:assert';
import {
  PAYOUT_HOLD_AFTER_END_MS,
  activationStatus,
  buildLinkedAccountRequest,
  buildSettlementRequest,
  buildStakeholderRequest,
  buildTransferRequest,
  findBookingTransfer,
  holdUntil,
  linkedAccountReference,
  payoutStatusForTransfer,
  razorpayError,
  validatePayoutDetails
} from '../supabase/functions/_shared/payouts.ts';

console.log('=== PHASE 12: OWNER PAYOUT (RAZORPAY ROUTE) LOGIC ===\n');

const ownerId = '6f1c2b3a-1111-4222-8333-444455556666';
const good = {
  beneficiary_name: '  Kavya   Raman ',
  account_number: '1234 5678 9012',
  ifsc: 'hdfc0001234',
  pan: 'abcpe1234f',
  phone: '+91 98765 43210',
  street1: '12, Gandhi Street',
  street2: 'Anna Nagar',
  city: 'Madurai',
  state: 'Tamil Nadu',
  postal_code: '625020'
};

console.log('Test 1: bank details are cleaned up and validated before reaching Razorpay...');
const ok = validatePayoutDetails(good);
assert.ok(ok.ok);
assert.deepStrictEqual(
  [ok.details.beneficiary_name, ok.details.account_number, ok.details.ifsc, ok.details.pan, ok.details.phone, ok.details.state],
  ['Kavya Raman', '123456789012', 'HDFC0001234', 'ABCPE1234F', '9876543210', 'TAMIL NADU']
);
const bad = validatePayoutDetails({ ...good, ifsc: 'HDFC1234', pan: 'ABCDE1234F', account_number: '12ab', phone: '12345', postal_code: '062502' });
assert.ok(!bad.ok);
assert.deepStrictEqual(Object.keys(bad.errors).sort(), ['account_number', 'ifsc', 'pan', 'phone', 'postal_code'], 'company PAN (4th letter not P) is refused');
assert.deepStrictEqual(Object.keys(validatePayoutDetails({}).errors).length, 10, 'every field is required');
console.log('  PASSED\n');

console.log('Test 2: linked account, stakeholder and settlement requests match the Route API...');
const ref = linkedAccountReference(ownerId);
assert.ok(ref.length >= 3 && ref.length <= 20 && !ref.includes('-'));
const acc = buildLinkedAccountRequest(ownerId, 'kavya@example.com', ok.details);
assert.strictEqual(acc.type, 'route');
assert.strictEqual(acc.business_type, 'individual');
assert.strictEqual(acc.phone, '9876543210');
assert.deepStrictEqual([acc.profile.category, acc.profile.subcategory], ['transport', 'parking_lots_and_garages']);
assert.deepStrictEqual(acc.profile.addresses.registered, {
  street1: '12, Gandhi Street', street2: 'Anna Nagar', city: 'Madurai', state: 'TAMIL NADU', postal_code: '625020', country: 'IN'
});
assert.ok(!JSON.stringify(acc).includes('123456789012'), 'the bank account number is not part of the account request');
assert.deepStrictEqual(buildStakeholderRequest('kavya@example.com', ok.details), { name: 'Kavya Raman', email: 'kavya@example.com', kyc: { pan: 'ABCPE1234F' } });
assert.deepStrictEqual(buildSettlementRequest(ok.details), {
  settlements: { account_number: '123456789012', ifsc_code: 'HDFC0001234', beneficiary_name: 'Kavya Raman' },
  tnc_accepted: true
});
assert.strictEqual(activationStatus({ activation_status: 'activated' }), 'activated');
assert.strictEqual(activationStatus({ activation_status: 'something_new' }), 'requested');
console.log('  PASSED\n');

console.log('Test 3: transfers are held until 24h after the parking ends...');
const now = Date.parse('2026-10-31T10:00:00Z');
const end = '2026-10-31T14:00:00Z';
const hold = holdUntil(end, now);
assert.deepStrictEqual(hold, { on_hold: true, on_hold_until: (Date.parse(end) + PAYOUT_HOLD_AFTER_END_MS) / 1000 });
assert.deepStrictEqual(holdUntil('2026-10-29T10:00:00Z', now), { on_hold: false }, 'long-finished parking is released at once');
assert.strictEqual(holdUntil(null, now).on_hold, true, 'unknown end: hold a day from now');
const t = buildTransferRequest('acc_ABC', '80.00', { id: 'bk-1', pass_code: 'IDM-1234-ABCD', end_timestamptz: end }, now);
assert.deepStrictEqual(t.transfers[0], {
  account: 'acc_ABC', amount: 8000, currency: 'INR',
  notes: { booking_id: 'bk-1', pass_code: 'IDM-1234-ABCD' }, linked_account_notes: ['pass_code'],
  on_hold: true, on_hold_until: hold.on_hold_until
});
console.log('  PASSED\n');

console.log('Test 4: Razorpay transfer state maps onto the payout ledger...');
assert.strictEqual(payoutStatusForTransfer({ amount: 8000, on_hold: true, settlement_status: 'on_hold' }), 'on_hold');
assert.strictEqual(payoutStatusForTransfer({ amount: 8000, on_hold: false, settlement_status: 'pending' }), 'released');
assert.strictEqual(payoutStatusForTransfer({ amount: 8000, on_hold: false, settlement_status: 'settled' }), 'settled');
assert.strictEqual(payoutStatusForTransfer({ amount: 8000, amount_reversed: 8000, on_hold: true }), 'reversed');
assert.strictEqual(payoutStatusForTransfer({ amount: 8000, status: 'failed' }), 'failed');
const collection = { entity: 'collection', items: [
  { id: 'trf_other', recipient: 'acc_ABC', notes: { booking_id: 'bk-2' } },
  { id: 'trf_mine', recipient: 'acc_ABC', notes: { booking_id: 'bk-1' } }
] };
assert.strictEqual(findBookingTransfer(collection, 'acc_ABC', 'bk-1').id, 'trf_mine', 'crash recovery finds the transfer already made');
assert.strictEqual(findBookingTransfer(collection, 'acc_XYZ', 'bk-1'), null);
assert.strictEqual(findBookingTransfer({}, 'acc_ABC', 'bk-1'), null);
assert.strictEqual(razorpayError({ status: 400, data: { error: { description: 'Invalid IFSC', field: 'ifsc_code' } } }), 'Invalid IFSC (ifsc_code)');
assert.strictEqual(razorpayError({ status: 502, data: {} }), 'Razorpay returned HTTP 502');
console.log('  PASSED\n');

console.log('================================================================');
console.log('ALL PHASE 12 OWNER PAYOUT LOGIC TESTS PASSED!');
console.log('================================================================');
