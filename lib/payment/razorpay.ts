/**
 * Razorpay Payment Gateway Integration for iDAM Smart Parking
 * Supports official Razorpay Checkout SDK (checkout.js) and interactive sandbox/test fallback.
 */

import { RazorpayOptions, RazorpayPaymentSuccessResponse } from '@/types/razorpay';

export interface RazorpayCheckoutParams {
  amount: number; // in INR (Rupees)
  locationTitle: string;
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

  // Test sandbox fallback key
  return 'rzp_test_IDAMParkingDemo';
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
 * Generate a realistic Razorpay Payment ID (e.g., pay_Px89a2KlMnOp9)
 */
export function generateMockPaymentId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'pay_';
  for (let i = 0; i < 14; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
        name: 'iDAM Smart Parking | இடம்',
        description: `Parking Spot at ${params.locationTitle}`,
        image: '/idam-logo.png',
        handler: function (response: RazorpayPaymentSuccessResponse) {
          resolve({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            amount: params.amount,
            paymentMethod: 'Razorpay',
            timestamp: new Date().toISOString()
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
