// Razorpay -> iDAM webhook. Confirms bookings whose payment was captured even if the
// customer's app closed before it could call verify-razorpay-payment.
// Deployed with --no-verify-jwt: Razorpay authenticates with X-Razorpay-Signature instead.
import { adminClient, requireEnv } from '../_shared/supabase.ts';
import { amountInPaise, capturedPaymentFromWebhook, json, verifyWebhookSignature } from '../_shared/razorpay.ts';
import { processPayout, razorpayKeys } from '../_shared/payoutRunner.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const rawBody = await req.text();
  const valid = await verifyWebhookSignature(rawBody, req.headers.get('x-razorpay-signature'), requireEnv('RAZORPAY_WEBHOOK_SECRET'));
  if (!valid) return json({ error: 'INVALID_SIGNATURE' }, 401);

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'BAD_REQUEST' }, 400);
  }

  const captured = capturedPaymentFromWebhook(event);
  // Acknowledge events we do not act on, so Razorpay does not retry them
  if (!captured) return json({ received: true });

  const admin = adminClient();
  const { data: booking } = await admin
    .from('bookings')
    .select('id, total_amount, payment_status, payment_id')
    .eq('razorpay_order_id', captured.orderId)
    .maybeSingle();

  if (!booking) {
    console.error('Webhook: no booking for order', captured.orderId);
    return json({ received: true });
  }
  if (booking.payment_status === 'completed') return json({ received: true });

  if (amountInPaise(booking.total_amount) !== captured.amountPaise) {
    console.error('Webhook: amount mismatch', { booking: booking.id, expected: booking.total_amount, paise: captured.amountPaise });
    return json({ received: true });
  }

  const { data: result, error } = await admin.rpc('record_payment_reconciliation', {
    p_booking_id: booking.id,
    p_transaction_ref: captured.paymentId,
    p_amount: Number(booking.total_amount),
    p_payment_method: 'Razorpay',
    p_status: 'success',
    p_gateway_payload: { order_id: captured.orderId, source: 'webhook' }
  });
  if (error || !result?.success) {
    console.error('Webhook reconciliation failed', error ?? result);
    // 500 makes Razorpay retry later
    return json({ error: 'RECONCILIATION_FAILED' }, 500);
  }

  // Owner's share -> their Razorpay linked account (on hold). A failure here never
  // un-confirms the booking: the ledger row stays and the hourly sweep retries it.
  await processPayout(admin, razorpayKeys(), booking.id).catch(err => console.error('Owner payout failed', booking.id, err));
  return json({ received: true });
});
