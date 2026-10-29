/**
 * Real-money checkout used by every booking screen (web modal and mobile flow).
 *
 * Order matters: the booking is created first (unpaid, slot held for 15 minutes), so the
 * customer is never charged for a slot that turned out to be full. Payment is then taken
 * against a server-created Razorpay order and confirmed by the server.
 */

import type { Booking, BookingRequest, ParkingLocation } from '@/types';
import { createBooking, markBookingPaidLocally } from '@/lib/booking/service';
import { cancelBooking } from '@/lib/parking/service';
import {
  PaymentError,
  createRazorpayOrder,
  openOfficialRazorpayCheckout,
  verifyRazorpayPayment,
  type RazorpaySuccessResult
} from '@/lib/payment/razorpay';

export interface CheckoutDriver {
  name?: string;
  email?: string;
  phone?: string;
}

export interface CheckoutResult {
  booking: Booking;
  /**
   * true: payment verified and booking confirmed.
   * false: the customer paid, but confirmation did not complete in the app (e.g. the
   * connection dropped). The Razorpay webhook will confirm it shortly.
   */
  confirmed: boolean;
}

export async function bookAndPay(
  location: ParkingLocation,
  request: BookingRequest,
  driver: CheckoutDriver
): Promise<CheckoutResult> {
  // 1. Reserve the slot (throws if full or invalid, before any money moves)
  const booking = await createBooking(location, request, { isDemoMode: false });

  let result: RazorpaySuccessResult;
  try {
    // 2. Server creates the Razorpay order for the server-computed amount
    const order = await createRazorpayOrder(booking.id);

    // 3. Customer pays in Razorpay's own checkout (UPI, cards, net banking, wallets)
    result = await openOfficialRazorpayCheckout({
      order,
      locationTitle: location.title,
      bookingPassCode: booking.passCode,
      vehicleNumber: request.vehicleNumber,
      driverName: driver.name,
      driverEmail: driver.email,
      driverPhone: driver.phone
    });
  } catch (err) {
    // No money moved: release the held slot right away instead of after 15 minutes
    await cancelBooking(booking.id, 'Payment not completed').catch(() => undefined);
    throw err;
  }

  // 4. Server verifies Razorpay's signature and confirms the booking
  try {
    await verifyRazorpayPayment(booking.id, result);
  } catch (err) {
    console.warn('Payment taken but confirmation is pending:', err);
    return { booking, confirmed: false };
  }
  return { booking: markBookingPaidLocally(booking, result.razorpay_payment_id), confirmed: true };
}

/** Customer-facing message for any checkout failure. Returns null when they simply closed the payment window. */
export function checkoutErrorMessage(err: unknown): string | null {
  if (err instanceof PaymentError) {
    if (err.code === 'PAYMENT_DISMISSED') return null;
    return err.message;
  }
  const message = err instanceof Error ? err.message : '';
  if (/fully booked|CAPACITY/i.test(message)) return 'This slot just filled up. Please pick another time.';
  if (/not open for bookings|SPACE_/i.test(message)) return 'This parking space is not taking bookings right now.';
  if (/signed in|UNAUTHENTICATED/i.test(message)) return 'Please sign in to book a parking spot.';
  return message || 'Something went wrong. You have not been charged; please try again.';
}
