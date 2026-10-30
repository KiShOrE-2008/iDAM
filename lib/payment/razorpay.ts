/**
 * Razorpay Payment Gateway Integration for iDAM Smart Parking
 *
 * Real payments: the order (amount, currency, key) always comes from the
 * create-razorpay-order Edge Function, and success is confirmed only by the
 * verify-razorpay-payment Edge Function (or the razorpay-webhook function).
 * Nothing the browser sends can mark a booking as paid.
 *
 * Demo mode uses generateMockPaymentId() and never touches the database.
 */

import { RazorpayOptions, RazorpayPaymentSuccessResponse } from '@/types/razorpay';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface RazorpaySuccessResult {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  amount: number;
  paymentMethod: 'Razorpay';
  timestamp: string;
  isSandbox?: boolean;
}

export interface ServerOrder {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
}

export interface OfficialCheckoutParams {
  order: ServerOrder;
  locationTitle: string;
  bookingPassCode?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  driverEmail?: string;
}

/** A payment step failed; `code` is the server error code when there is one. */
export class PaymentError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Dynamically loads the Razorpay checkout.js script if not present.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load official Razorpay script from CDN.');
      resolve(false);
    };

    document.body.appendChild(script);
  });
}

/**
 * Generate an isolated demo Razorpay Payment ID clearly tagged for sandbox.
 */
export function generateMockPaymentId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let rand = '';
  for (let i = 0; i < 12; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `demo_pay_${rand}`;
}

/** Calls an Edge Function and unwraps its JSON, turning any failure into a PaymentError. */
async function invokePaymentFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured || !supabase) {
    throw new PaymentError('Payments are not available right now.', 'NOT_CONFIGURED');
  }
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let payload: { error?: string; message?: string } = {};
    const response = (error as { context?: Response }).context;
    if (response && typeof response.json === 'function') {
      payload = await response.json().catch(() => ({}));
    }
    throw new PaymentError(
      payload.message || 'Could not reach the payment server. Please check your connection and try again.',
      payload.error || 'NETWORK'
    );
  }
  return data as T;
}

/** Asks the server for the Razorpay order of an unpaid booking (amount is set server-side). */
export async function createRazorpayOrder(bookingId: string): Promise<ServerOrder> {
  const data = await invokePaymentFunction<{ order_id: string; amount_paise: number; currency: string; key_id: string }>(
    'create-razorpay-order',
    { booking_id: bookingId }
  );
  return { orderId: data.order_id, amountPaise: data.amount_paise, currency: data.currency, keyId: data.key_id };
}

/** Asks the server to verify Razorpay's signature and confirm the booking. */
export async function verifyRazorpayPayment(bookingId: string, result: RazorpaySuccessResult): Promise<void> {
  await invokePaymentFunction('verify-razorpay-payment', {
    booking_id: bookingId,
    razorpay_order_id: result.razorpay_order_id,
    razorpay_payment_id: result.razorpay_payment_id,
    razorpay_signature: result.razorpay_signature
  });
}

/**
 * Launches the official Razorpay Checkout popup for a server-created order.
 * Resolves with Razorpay's success payload, or rejects with PaymentError('PAYMENT_DISMISSED')
 * if the customer closes it.
 */
export async function openOfficialRazorpayCheckout(params: OfficialCheckoutParams): Promise<RazorpaySuccessResult> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new PaymentError('Could not load Razorpay. Please check your connection and try again.', 'SDK_UNAVAILABLE');
  }

  const { order } = params;
  return new Promise((resolve, reject) => {
    const options: RazorpayOptions = {
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      order_id: order.orderId,
      name: 'iDAM Smart Parking | இடம்',
      description: `Parking Spot at ${params.locationTitle}`,
      image: '/idam-logo.png',
      handler: function (response: RazorpayPaymentSuccessResponse) {
        resolve({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || order.orderId,
          razorpay_signature: response.razorpay_signature,
          amount: order.amountPaise / 100,
          paymentMethod: 'Razorpay',
          timestamp: new Date().toISOString()
        });
      },
      prefill: {
        name: params.driverName || '',
        email: params.driverEmail || '',
        contact: params.driverPhone || ''
      },
      notes: {
        location: params.locationTitle,
        vehicleNumber: params.vehicleNumber || '',
        passCode: params.bookingPassCode || ''
      },
      theme: {
        color: '#1846A3', // iDAM sign blue (brand-700)
        backdrop_color: 'rgba(0, 0, 0, 0.65)'
      },
      modal: {
        ondismiss: function () {
          reject(new PaymentError('Payment was cancelled.', 'PAYMENT_DISMISSED'));
        }
      }
    };

    try {
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      reject(err);
    }
  });
}
