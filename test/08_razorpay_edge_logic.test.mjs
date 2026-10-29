import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  PAYMENT_WINDOW_MS,
  amountInPaise,
  buildOrderRequest,
  capturedPaymentFromWebhook,
  checkPayableBooking,
  verifyPaymentSignature,
  verifyWebhookSignature
} from '../supabase/functions/_shared/razorpay.ts';

console.log('=== PHASE 8: RAZORPAY EDGE FUNCTION LOGIC ===\n');

const hmac = (secret, msg) => crypto.createHmac('sha256', secret).update(msg).digest('hex');
const now = Date.parse('2026-10-28T10:00:00Z');
const userId = '11111111-1111-4111-8111-111111111111';
const booking = (over = {}) => ({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  driver_id: userId,
  user_id: userId,
  total_amount: '165.50',
  payment_status: 'pending',
  booking_status: 'pending',
  payment_id: null,
  razorpay_order_id: null,
  pass_code: 'IDM-12345',
  created_at: new Date(now - 60_000).toISOString(),
  ...over
});

console.log('Test 1: amounts are converted to whole paise from the server total...');
assert.strictEqual(amountInPaise('165.50'), 16550);
assert.strictEqual(amountInPaise(85), 8500);
assert.strictEqual(amountInPaise('0.1'), 10);
assert.throws(() => amountInPaise('0'));
assert.throws(() => amountInPaise('-5'));
assert.throws(() => amountInPaise('abc'));
const order = buildOrderRequest(booking());
assert.deepStrictEqual(order, {
  amount: 16550,
  currency: 'INR',
  receipt: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  notes: { booking_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pass_code: 'IDM-12345' }
});
console.log('  PASSED\n');

console.log('Test 2: only the booking owner can pay, and only while it is pending and held...');
assert.strictEqual(checkPayableBooking(booking(), userId, now), null);
assert.strictEqual(checkPayableBooking(null, userId, now).error, 'BOOKING_NOT_FOUND');
assert.strictEqual(checkPayableBooking(booking(), 'someone-else', now).error, 'FORBIDDEN');
assert.strictEqual(checkPayableBooking(booking({ payment_status: 'completed' }), userId, now).error, 'ALREADY_PAID');
assert.strictEqual(checkPayableBooking(booking({ booking_status: 'cancelled' }), userId, now).error, 'NOT_PAYABLE');
assert.strictEqual(checkPayableBooking(booking({ payment_status: 'refunded' }), userId, now).error, 'NOT_PAYABLE');
const stale = booking({ created_at: new Date(now - PAYMENT_WINDOW_MS - 1000).toISOString() });
assert.strictEqual(checkPayableBooking(stale, userId, now).error, 'PAYMENT_WINDOW_EXPIRED');
assert.strictEqual(PAYMENT_WINDOW_MS, 15 * 60 * 1000, 'Must match the 15-minute slot hold in check_capacity_availability');
console.log('  PASSED\n');

console.log('Test 3: checkout signature = HMAC(order_id|payment_id, key secret)...');
const secret = 'rzp_test_secret_value';
const good = hmac(secret, 'order_ABC|pay_XYZ');
assert.strictEqual(await verifyPaymentSignature('order_ABC', 'pay_XYZ', good, secret), true);
assert.strictEqual(await verifyPaymentSignature('order_ABC', 'pay_XYZ', good.toUpperCase(), secret), true);
assert.strictEqual(await verifyPaymentSignature('order_OTHER', 'pay_XYZ', good, secret), false, 'Signature bound to order');
assert.strictEqual(await verifyPaymentSignature('order_ABC', 'pay_OTHER', good, secret), false, 'Signature bound to payment');
assert.strictEqual(await verifyPaymentSignature('order_ABC', 'pay_XYZ', hmac('attacker', 'order_ABC|pay_XYZ'), secret), false);
assert.strictEqual(await verifyPaymentSignature('order_ABC', 'pay_XYZ', 'sig_demo_123', secret), false);
assert.strictEqual(await verifyPaymentSignature('order_ABC', 'pay_XYZ', 'a'.repeat(64), secret), false);
assert.strictEqual(await verifyPaymentSignature('order_ABC', 'pay_XYZ', good, ''), false, 'No secret -> never valid');
assert.strictEqual(await verifyPaymentSignature('', '', hmac(secret, '|'), secret), false);
console.log('  PASSED\n');

console.log('Test 4: webhook signature = HMAC(raw body, webhook secret)...');
const webhookSecret = 'whsec_test';
const body = JSON.stringify({
  event: 'payment.captured',
  payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 16550, status: 'captured' } } }
});
assert.strictEqual(await verifyWebhookSignature(body, hmac(webhookSecret, body), webhookSecret), true);
assert.strictEqual(await verifyWebhookSignature(body + ' ', hmac(webhookSecret, body), webhookSecret), false, 'Body tampering detected');
assert.strictEqual(await verifyWebhookSignature(body, null, webhookSecret), false);
assert.strictEqual(await verifyWebhookSignature(body, hmac('other', body), webhookSecret), false);
console.log('  PASSED\n');

console.log('Test 5: only captured payments from webhook events confirm bookings...');
assert.deepStrictEqual(capturedPaymentFromWebhook(JSON.parse(body)), { paymentId: 'pay_1', orderId: 'order_1', amountPaise: 16550 });
const withStatus = (event, status) => ({ event, payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 100, status } } } });
assert.ok(capturedPaymentFromWebhook(withStatus('order.paid', 'captured')));
assert.strictEqual(capturedPaymentFromWebhook(withStatus('payment.authorized', 'authorized')), null);
assert.strictEqual(capturedPaymentFromWebhook(withStatus('payment.failed', 'failed')), null);
assert.strictEqual(capturedPaymentFromWebhook(withStatus('payment.captured', 'refunded')), null);
assert.strictEqual(capturedPaymentFromWebhook({ event: 'payment.captured', payload: {} }), null);
assert.strictEqual(capturedPaymentFromWebhook(null), null);
console.log('  PASSED\n');

console.log('================================================================');
console.log('ALL PHASE 8 RAZORPAY EDGE FUNCTION LOGIC TESTS PASSED!');
console.log('================================================================');
