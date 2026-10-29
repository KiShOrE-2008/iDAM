// Called by the app right after Razorpay Checkout succeeds. Confirms the booking only if
// Razorpay's signature is valid for the order created for that booking.
import { adminClient, callerUser, requireEnv, BOOKING_PAYMENT_COLUMNS } from '../_shared/supabase.ts';
import { corsHeaders, json, verifyPaymentSignature, type PayableBooking } from '../_shared/razorpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const admin = adminClient();
    const user = await callerUser(req, admin);
    if (!user) return json({ error: 'UNAUTHENTICATED' }, 401);

    const body = await req.json().catch(() => ({}));
    const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};
    if (![booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature].every(v => typeof v === 'string' && v)) {
      return json({ error: 'BAD_REQUEST', message: 'Missing payment details.' }, 400);
    }

    const { data } = await admin.from('bookings').select(BOOKING_PAYMENT_COLUMNS).eq('id', booking_id).maybeSingle();
    const booking = data as PayableBooking | null;
    if (!booking) return json({ error: 'BOOKING_NOT_FOUND' }, 404);
    if (booking.driver_id !== user.id && booking.user_id !== user.id) return json({ error: 'FORBIDDEN' }, 403);

    if (booking.payment_status === 'completed') {
      return booking.payment_id === razorpay_payment_id
        ? json({ success: true, booking_id, status: 'confirmed' })
        : json({ error: 'ALREADY_PAID' }, 409);
    }
    if (!booking.razorpay_order_id || booking.razorpay_order_id !== razorpay_order_id) {
      return json({ error: 'ORDER_MISMATCH', message: 'This payment does not belong to this booking.' }, 400);
    }

    const valid = await verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, requireEnv('RAZORPAY_KEY_SECRET'));
    if (!valid) return json({ error: 'INVALID_SIGNATURE', message: 'Payment could not be verified.' }, 400);

    const { data: result, error } = await admin.rpc('record_payment_reconciliation', {
      p_booking_id: booking.id,
      p_transaction_ref: razorpay_payment_id,
      p_amount: Number(booking.total_amount),
      p_payment_method: 'Razorpay',
      p_status: 'success',
      p_gateway_payload: { order_id: razorpay_order_id, source: 'checkout', verified: true }
    });
    if (error || !result?.success) {
      console.error('Reconciliation failed', error ?? result);
      return json({ error: result?.error ?? 'RECONCILIATION_FAILED' }, 409);
    }

    return json({ success: true, booking_id: booking.id, status: 'confirmed' });
  } catch (err) {
    console.error('verify-razorpay-payment error', err);
    return json({ error: 'INTERNAL' }, 500);
  }
});
