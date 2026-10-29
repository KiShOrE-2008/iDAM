// Pure Razorpay helpers shared by the Edge Functions. No Deno or Node globals beyond
// Web Crypto, so they are unit-tested from test/08_razorpay_edge_logic.test.mjs.

/** How long an unpaid booking holds its slot (must match check_capacity_availability). */
export const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

export interface PayableBooking {
  id: string;
  driver_id: string | null;
  user_id: string | null;
  total_amount: number | string;
  payment_status: string;
  booking_status: string;
  payment_id?: string | null;
  razorpay_order_id: string | null;
  pass_code: string;
  created_at: string;
}

export interface BookingProblem {
  status: number;
  error: string;
  message: string;
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

export function amountInPaise(totalAmount: number | string): number {
  const rupees = Number(totalAmount);
  if (!Number.isFinite(rupees) || rupees <= 0) {
    throw new Error(`Invalid booking amount: ${totalAmount}`);
  }
  return Math.round(rupees * 100);
}

/** Why this user may not pay for this booking now, or null if they may. */
export function checkPayableBooking(
  booking: PayableBooking | null,
  userId: string,
  nowMs: number
): BookingProblem | null {
  if (!booking) {
    return { status: 404, error: 'BOOKING_NOT_FOUND', message: 'Booking not found.' };
  }
  if (booking.driver_id !== userId && booking.user_id !== userId) {
    return { status: 403, error: 'FORBIDDEN', message: 'You can only pay for your own bookings.' };
  }
  if (booking.payment_status === 'completed') {
    return { status: 409, error: 'ALREADY_PAID', message: 'This booking is already paid.' };
  }
  if (booking.payment_status !== 'pending' || booking.booking_status !== 'pending') {
    return { status: 409, error: 'NOT_PAYABLE', message: 'This booking is no longer awaiting payment.' };
  }
  if (nowMs - Date.parse(booking.created_at) > PAYMENT_WINDOW_MS) {
    return {
      status: 410,
      error: 'PAYMENT_WINDOW_EXPIRED',
      message: 'The slot was held for 15 minutes and has been released. Please book again.'
    };
  }
  return null;
}

/** Body for POST https://api.razorpay.com/v1/orders */
export function buildOrderRequest(booking: PayableBooking) {
  return {
    amount: amountInPaise(booking.total_amount),
    currency: 'INR',
    receipt: booking.id.slice(0, 40),
    notes: { booking_id: booking.id, pass_code: booking.pass_code }
  };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Checkout success handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret) */
export async function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): Promise<boolean> {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  const expected = await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`);
  return timingSafeEqual(expected, signature.toLowerCase());
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook secret) */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  webhookSecret: string
): Promise<boolean> {
  if (!signature || !webhookSecret) return false;
  const expected = await hmacSha256Hex(webhookSecret, rawBody);
  return timingSafeEqual(expected, signature.toLowerCase());
}

/** Extracts the captured payment from a Razorpay webhook event, or null if not relevant. */
export function capturedPaymentFromWebhook(event: any): { paymentId: string; orderId: string; amountPaise: number } | null {
  if (!event || (event.event !== 'payment.captured' && event.event !== 'order.paid')) return null;
  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment?.order_id || payment.status !== 'captured') return null;
  return { paymentId: payment.id, orderId: payment.order_id, amountPaise: Number(payment.amount) };
}
