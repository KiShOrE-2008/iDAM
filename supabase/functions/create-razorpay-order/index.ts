// Creates (or reuses) the Razorpay order for one of the caller's unpaid bookings.
// The amount always comes from bookings.total_amount, which the database computed.
import { adminClient, callerUser, requireEnv, BOOKING_PAYMENT_COLUMNS } from '../_shared/supabase.ts';
import { buildOrderRequest, checkPayableBooking, corsHeaders, json, type PayableBooking } from '../_shared/razorpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const admin = adminClient();
    const user = await callerUser(req, admin);
    if (!user) return json({ error: 'UNAUTHENTICATED', message: 'Please sign in to pay.' }, 401);

    const { booking_id } = await req.json().catch(() => ({}));
    if (typeof booking_id !== 'string') return json({ error: 'BAD_REQUEST', message: 'booking_id is required.' }, 400);

    const { data: booking } = await admin.from('bookings').select(BOOKING_PAYMENT_COLUMNS).eq('id', booking_id).maybeSingle();
    const problem = checkPayableBooking(booking as PayableBooking | null, user.id, Date.now());
    if (problem) return json({ error: problem.error, message: problem.message }, problem.status);

    const payable = booking as PayableBooking;
    const keyId = requireEnv('RAZORPAY_KEY_ID');
    const orderRequest = buildOrderRequest(payable);

    if (payable.razorpay_order_id) {
      return json({ order_id: payable.razorpay_order_id, amount_paise: orderRequest.amount, currency: 'INR', key_id: keyId });
    }

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${keyId}:${requireEnv('RAZORPAY_KEY_SECRET')}`),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderRequest)
    });
    const order = await rzpRes.json();
    if (!rzpRes.ok || !order?.id) {
      console.error('Razorpay order creation failed', rzpRes.status, order?.error);
      return json({ error: 'RAZORPAY_ORDER_FAILED', message: 'Could not start the payment. Please try again.' }, 502);
    }

    // Attach only if no concurrent request attached one first
    const { data: attached } = await admin
      .from('bookings')
      .update({ razorpay_order_id: order.id })
      .eq('id', payable.id)
      .is('razorpay_order_id', null)
      .eq('payment_status', 'pending')
      .select('razorpay_order_id')
      .maybeSingle();

    let orderId = attached?.razorpay_order_id as string | undefined;
    if (!orderId) {
      const { data: current } = await admin.from('bookings').select('razorpay_order_id').eq('id', payable.id).maybeSingle();
      orderId = current?.razorpay_order_id;
    }
    if (!orderId) return json({ error: 'NOT_PAYABLE', message: 'This booking is no longer awaiting payment.' }, 409);

    return json({ order_id: orderId, amount_paise: orderRequest.amount, currency: 'INR', key_id: keyId });
  } catch (err) {
    console.error('create-razorpay-order error', err);
    return json({ error: 'INTERNAL', message: 'Something went wrong starting the payment.' }, 500);
  }
});
