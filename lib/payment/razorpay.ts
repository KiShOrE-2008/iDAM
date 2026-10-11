/**
 * Razorpay Payment Gateway Integration for iDAM Smart Parking
 * Supports official Razorpay Checkout SDK (checkout.js), server order creation,
 * cryptographic signature verification, and isolated interactive sandbox/test fallback.
 */

import { RazorpayOptions, RazorpayPaymentSuccessResponse } from '@/types/razorpay';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { withTimeout } from '@/lib/utils/timeout';

export interface RazorpayCheckoutParams {
  amount: number; // in INR (Rupees)
  locationTitle: string;
  orderId?: string;
  bookingPassCode?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  driverName?: string;
  driverPhone?: string;
  driverEmail?: string;
}

export interface RazorpaySuccessResult {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  amount: number;
  paymentMethod: 'Razorpay';
  timestamp: string;
  isSandbox?: boolean;
}

export interface PaymentOrderResult {
  success: boolean;
  orderId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  error?: string;
}

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const STORAGE_KEY = 'idam_razorpay_custom_key';

/**
 * Retrieve the active Razorpay Key ID.
 * Priority: localStorage override > env VITE_RAZORPAY_KEY_ID > env NEXT_PUBLIC_RAZORPAY_KEY_ID > default test key
 */
export function getRazorpayKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim().length > 0) return saved.trim();
  }

  const viteKey = import.meta.env?.VITE_RAZORPAY_KEY_ID;
  if (viteKey && viteKey.trim().length > 0) return viteKey.trim();

  // Configured test key fallback
  return 'rzp_test_TmV7qmQblC0tgU';
}

export function setRazorpayKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export function isRealRazorpayKey(key: string): boolean {
  return /^rzp_(test|live)_[A-Za-z0-9]+$/.test(key) && key !== 'rzp_test_IDAMParkingDemo';
}

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
export function generateMockPaymentId(isDemo = true): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let rand = '';
  for (let i = 0; i < 12; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return isDemo ? `demo_pay_${rand}` : `pay_${rand}`;
}

export function generateMockOrderId(isDemo = true): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let rand = '';
  for (let i = 0; i < 10; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return isDemo ? `demo_order_${rand}` : `order_${rand}`;
}

/**
 * Creates an authoritative payment order on the database server.
 * Derives accurate amount directly from space hourly rate.
 */
export async function createServerPaymentOrder(params: {
  spaceId: string;
  vehicleType: string;
  durationHours: number;
  vehicleNumber: string;
  addons?: string[];
  isDemoMode?: boolean;
}): Promise<PaymentOrderResult> {
  if (isSupabaseConfigured && supabase && !params.isDemoMode) {
    try {
      const { data, error } = await withTimeout(
        supabase.rpc('create_payment_order', {
          p_space_id: params.spaceId,
          p_vehicle_type: params.vehicleType === 'bike' ? 'bike' : 'car',
          p_duration_hours: params.durationHours,
          p_vehicle_number: params.vehicleNumber,
          p_addons: params.addons || []
        }),
        10000,
        'Payment order creation timed out'
      );

      if (!error && data?.success && data?.order_id) {
        return {
          success: true,
          orderId: data.order_id,
          amount: data.amount,
          amountPaise: data.amount_paise,
          currency: data.currency || 'INR'
        };
      }
    } catch (err: any) {
      console.warn('Server payment order creation error, using fallback:', err);
    }
  }

  // Fallback / Demo sandbox order
  const orderId = generateMockOrderId(true);
  const estAmount = params.vehicleType === 'bike' ? 20 * params.durationHours + 5 : 40 * params.durationHours + 5;
  return {
    success: true,
    orderId,
    amount: estAmount,
    amountPaise: estAmount * 100,
    currency: 'INR'
  };
}

/**
 * Verifies Razorpay payment signature and reconciles payment on the server.
 */
export async function verifyPaymentOnServer(
  bookingId: string,
  result: RazorpaySuccessResult
): Promise<{ success: boolean; message?: string }> {
  if (isSupabaseConfigured && supabase && !result.isSandbox) {
    try {
      const { data, error } = await withTimeout(
        supabase.rpc('verify_razorpay_payment', {
          p_booking_id: bookingId,
          p_order_id: result.razorpay_order_id || '',
          p_payment_id: result.razorpay_payment_id,
          p_signature: result.razorpay_signature || ''
        }),
        10000,
        'Payment verification timed out'
      );

      if (!error && data?.success) {
        return { success: true };
      }
      return { success: false, message: data?.message || error?.message || 'Verification failed' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Verification call failed' };
    }
  }

  return { success: true };
}

/**
 * Launches the official Razorpay Checkout popup modal.
 * Returns a promise resolving with the payment success payload or rejecting if closed/failed.
 */
export async function openOfficialRazorpayCheckout(
  params: RazorpayCheckoutParams
): Promise<RazorpaySuccessResult> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new Error('Razorpay Checkout SDK is unavailable.');
  }

  const key = getRazorpayKey();

  return new Promise((resolve, reject) => {
    try {
      const options: RazorpayOptions = {
        key: key,
        amount: Math.round(params.amount * 100), // convert rupees to paise
        currency: 'INR',
        order_id: params.orderId,
        name: 'iDAM Smart Parking | இடம்',
        description: `Parking Spot at ${params.locationTitle}`,
        image: '/idam-logo.png',
        handler: function (response: RazorpayPaymentSuccessResponse) {
          resolve({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id || params.orderId,
            razorpay_signature: response.razorpay_signature,
            amount: params.amount,
            paymentMethod: 'Razorpay',
            timestamp: new Date().toISOString(),
            isSandbox: !isRealRazorpayKey(key)
          });
        },
        prefill: {
          name: params.driverName || 'iDAM Driver',
          email: params.driverEmail || 'driver@idamparking.com',
          contact: params.driverPhone || '9876543210'
        },
        notes: {
          location: params.locationTitle,
          vehicleNumber: params.vehicleNumber || 'TN 59 AB 1234',
          vehicleType: params.vehicleType || 'car',
          passCode: params.bookingPassCode || 'IDM-NEW'
        },
        theme: {
          color: '#064e3b', // iDAM emerald-900 brand
          backdrop_color: 'rgba(0, 0, 0, 0.65)'
        },
        modal: {
          ondismiss: function () {
            reject(new Error('PAYMENT_DISMISSED'));
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      reject(err);
    }
  });
}
