import type { Booking, PassVerificationResult, PassValidationStatus } from '../../types/index.ts';
import { supabase, isSupabaseConfigured } from '../supabase.ts';
import { parseScannedQrPayload, hashPassToken } from './passSecurity.ts';

const LOCAL_STORAGE_BOOKINGS_KEY = 'idam_user_bookings';
const LOCAL_STORAGE_AUDIT_KEY = 'idam_booking_events';

// In-flight request locker to prevent duplicate scans, double taps, and concurrent submissions
const inFlightRequests = new Set<string>();

/**
 * Standard Demo Bookings for the Meenakshi Temple Square Smart Lot (Owner Demo).
 * These demonstrate all validation scenarios:
 * - IDM-82931: Confirmed upcoming pass, eligible for check-in
 * - IDM-94102: Active parked vehicle, eligible for check-out
 * - IDM-12049: Belonging to another owner's location (South Masi Street)
 * - IDM-55321: Completed / already checked out
 * - IDM-77190: Cancelled booking
 */
export const DEFAULT_DEMO_OWNER_BOOKINGS: Booking[] = [
  {
    id: 'demo-bk-101',
    passCode: 'IDM-82931',
    passToken: 'demo_pass_token_idm_82931_loc-1',
    passTokenHash: 'h_demo_idm_82931',
    parkingLocation: {
      id: 'loc-1',
      title: 'Meenakshi Temple Square Smart Lot',
      address: '124 West Masi Street, Near Temple Gate 3, Madurai',
      latitude: 9.9195,
      longitude: 78.1193,
      hourlyRateCar: 40,
      hourlyRateBike: 20,
      totalSpots: 35,
      availableSpots: 12,
      amenities: ['CCTV', 'Covered', 'EV Fast Charge'],
      operatingHours: '6:00 AM - 11:00 PM',
      imageUrl: '/images/parking/meenakshi.jpg',
      rating: 4.8,
      reviewsCount: 142
    },
    vehicleType: 'car',
    bookingDate: 'Today',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    durationHours: 2,
    basePrice: 80,
    platformFee: 5,
    totalAmount: 85,
    paymentMethod: 'Razorpay',
    paymentStatus: 'completed',
    paymentId: 'pay_demo_rzp_82931',
    vehicleNumber: 'TN 59 AB 1234',
    driverName: 'Kishore Kumar',
    driverPhone: '+91 98765 43210',
    status: 'confirmed',
    qrData: 'IDAM:v2:demo_idm_82931_loc-1',
    createdAt: '2026-10-10T09:30:00.000Z'
  },
  {
    id: 'demo-bk-102',
    passCode: 'IDM-94102',
    passToken: 'demo_pass_token_idm_94102_loc-1',
    passTokenHash: 'h_demo_idm_94102',
    parkingLocation: {
      id: 'loc-1',
      title: 'Meenakshi Temple Square Smart Lot',
      address: '124 West Masi Street, Near Temple Gate 3, Madurai',
      latitude: 9.9195,
      longitude: 78.1193,
      hourlyRateCar: 40,
      hourlyRateBike: 20,
      totalSpots: 35,
      availableSpots: 12,
      amenities: ['CCTV', 'Covered'],
      operatingHours: '6:00 AM - 11:00 PM',
      imageUrl: '/images/parking/meenakshi.jpg',
      rating: 4.8,
      reviewsCount: 142
    },
    vehicleType: 'bike',
    bookingDate: 'Today',
    startTime: '11:30 AM',
    endTime: '01:30 PM',
    durationHours: 2,
    basePrice: 40,
    platformFee: 5,
    totalAmount: 45,
    paymentMethod: 'UPI',
    paymentStatus: 'completed',
    paymentId: 'pay_demo_upi_94102',
    vehicleNumber: 'TN 59 C 5678',
    driverName: 'Anand Sundaram',
    driverPhone: '+91 94433 11223',
    status: 'active',
    checkInAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    qrData: 'IDAM:v2:demo_idm_94102_loc-1',
    createdAt: '2026-10-10T10:00:00.000Z'
  },
  {
    id: 'demo-bk-103',
    passCode: 'IDM-12049',
    passToken: 'demo_pass_token_idm_12049_loc-2',
    passTokenHash: 'h_demo_idm_12049',
    parkingLocation: {
      id: 'loc-2',
      title: 'South Masi Street Multi-level',
      address: 'South Masi Street, Madurai',
      latitude: 9.9150,
      longitude: 78.1160,
      hourlyRateCar: 35,
      hourlyRateBike: 15,
      totalSpots: 50,
      availableSpots: 20,
      amenities: ['Security Guard'],
      operatingHours: '24/7',
      imageUrl: '/images/parking/southmasi.jpg',
      rating: 4.5,
      reviewsCount: 88
    },
    vehicleType: 'car',
    bookingDate: 'Today',
    startTime: '02:00 PM',
    endTime: '04:00 PM',
    durationHours: 2,
    basePrice: 70,
    platformFee: 5,
    totalAmount: 75,
    paymentMethod: 'Card',
    paymentStatus: 'completed',
    paymentId: 'pay_demo_card_12049',
    vehicleNumber: 'TN 58 X 9999',
    driverName: 'Murugan Raja',
    status: 'confirmed',
    qrData: 'IDAM:v2:demo_idm_12049_loc-2',
    createdAt: '2026-10-10T11:00:00.000Z'
  },
  {
    id: 'demo-bk-104',
    passCode: 'IDM-55321',
    passToken: 'demo_pass_token_idm_55321_loc-1',
    passTokenHash: 'h_demo_idm_55321',
    parkingLocation: {
      id: 'loc-1',
      title: 'Meenakshi Temple Square Smart Lot',
      address: '124 West Masi Street, Near Temple Gate 3, Madurai',
      latitude: 9.9195,
      longitude: 78.1193,
      hourlyRateCar: 40,
      hourlyRateBike: 20,
      totalSpots: 35,
      availableSpots: 12,
      amenities: ['CCTV'],
      operatingHours: '6:00 AM - 11:00 PM',
      imageUrl: '/images/parking/meenakshi.jpg',
      rating: 4.8,
      reviewsCount: 142
    },
    vehicleType: 'car',
    bookingDate: 'Today',
    startTime: '08:00 AM',
    endTime: '09:30 AM',
    durationHours: 1.5,
    basePrice: 60,
    platformFee: 5,
    totalAmount: 65,
    paymentMethod: 'Razorpay',
    paymentStatus: 'completed',
    vehicleNumber: 'TN 59 K 1122',
    driverName: 'Saravanan M',
    status: 'completed',
    checkInAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    checkOutAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
    qrData: 'IDAM:v2:demo_idm_55321_loc-1',
    createdAt: '2026-10-10T07:30:00.000Z'
  },
  {
    id: 'demo-bk-105',
    passCode: 'IDM-77190',
    passToken: 'demo_pass_token_idm_77190_loc-1',
    passTokenHash: 'h_demo_idm_77190',
    parkingLocation: {
      id: 'loc-1',
      title: 'Meenakshi Temple Square Smart Lot',
      address: '124 West Masi Street, Near Temple Gate 3, Madurai',
      latitude: 9.9195,
      longitude: 78.1193,
      hourlyRateCar: 40,
      hourlyRateBike: 20,
      totalSpots: 35,
      availableSpots: 12,
      amenities: ['CCTV'],
      operatingHours: '6:00 AM - 11:00 PM',
      imageUrl: '/images/parking/meenakshi.jpg',
      rating: 4.8,
      reviewsCount: 142
    },
    vehicleType: 'car',
    bookingDate: 'Today',
    startTime: '03:00 PM',
    endTime: '05:00 PM',
    durationHours: 2,
    basePrice: 80,
    platformFee: 5,
    totalAmount: 85,
    paymentMethod: 'Razorpay',
    paymentStatus: 'completed',
    vehicleNumber: 'TN 59 Z 4455',
    driverName: 'Praveen K',
    status: 'cancelled',
    qrData: 'IDAM:v2:demo_idm_77190_loc-1',
    createdAt: '2026-10-10T08:00:00.000Z'
  }
];

/**
 * Retrieves all stored demo/local bookings.
 */
export function getLocalOwnerBookings(): Booking[] {
  if (typeof window === 'undefined') return DEFAULT_DEMO_OWNER_BOOKINGS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY);
    const userBookings: Booking[] = raw ? JSON.parse(raw) : [];
    
    // Combine user-created bookings with standard demo bookings (deduped by passCode)
    const combined = [...userBookings];
    for (const demo of DEFAULT_DEMO_OWNER_BOOKINGS) {
      if (!combined.some(b => b.passCode.toLowerCase() === demo.passCode.toLowerCase())) {
        combined.push(demo);
      }
    }
    return combined;
  } catch {
    return DEFAULT_DEMO_OWNER_BOOKINGS;
  }
}

/**
 * Persists an updated booking list to local storage.
 */
function saveLocalOwnerBookings(bookings: Booking[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_BOOKINGS_KEY, JSON.stringify(bookings));
  } catch (e) {
    console.warn('Failed to save bookings locally:', e);
  }
}

/**
 * Validates a scanned QR pass for the owner.
 * Performs all security and location checks without modifying the booking status.
 */
export async function validateScannedPass(params: {
  rawScannedText: string;
  ownerSpaceId?: string;
  isDemoMode?: boolean;
}): Promise<PassVerificationResult> {
  const { rawScannedText, ownerSpaceId = 'loc-1', isDemoMode = false } = params;

  if (!rawScannedText || !rawScannedText.trim()) {
    return {
      isValid: false,
      statusCode: 'invalid_format',
      message: 'No QR code payload detected'
    };
  }

  // Parse QR payload (handles v2 high-entropy token and backwards-compatible legacy formats)
  const parsed = await parseScannedQrPayload(rawScannedText);

  // If Supabase is configured and not in demo mode, validate via server RPC
  if (isSupabaseConfigured && supabase && !isDemoMode) {
    try {
      const { data, error } = await supabase.rpc('verify_parking_pass', {
        p_pass_token_hash: parsed.tokenHash || null,
        p_pass_code: parsed.passCode || null,
        p_owner_space_id: ownerSpaceId
      });

      if (error) {
        console.error('Supabase RPC verify_parking_pass error:', error);
      } else if (data) {
        if (!data.is_valid) {
          const statusMap: Record<string, PassValidationStatus> = {
            ALREADY_ACTIVE: 'already_active',
            ALREADY_COMPLETED: 'already_completed',
            CANCELLED: 'cancelled',
            WRONG_LOCATION: 'wrong_location',
            EXPIRED: 'expired',
            EARLY_ARRIVAL: 'early_arrival',
            UNPAID: 'unpaid',
            NOT_FOUND: 'not_found'
          };
          return {
            isValid: false,
            statusCode: statusMap[data.code] || 'not_found',
            message: data.message || 'Verification failed',
            rawPayload: rawScannedText
          };
        }

        return {
          isValid: true,
          statusCode: 'valid',
          message: 'Valid parking pass ready for check-in',
          booking: data.booking,
          rawPayload: rawScannedText
        };
      }
    } catch (err) {
      console.warn('Supabase verification failed, falling back to local verification:', err);
    }
  }

  // Local / Demo Mode verification
  const allBookings = getLocalOwnerBookings();

  // Find booking matching token, token hash, or pass code
  const matched = allBookings.find(b => {
    if (parsed.type === 'v2_token' && parsed.token) {
      if (b.passToken === parsed.token) return true;
      if (b.qrData && b.qrData.includes(parsed.token)) return true;
    }
    if (parsed.tokenHash && b.passTokenHash === parsed.tokenHash) return true;
    if (parsed.passCode && b.passCode.toLowerCase() === parsed.passCode.toLowerCase()) return true;
    if (b.qrData === rawScannedText.trim()) return true;
    return false;
  });

  if (!matched) {
    return {
      isValid: false,
      statusCode: 'not_found',
      message: 'No valid booking matches this pass',
      rawPayload: rawScannedText
    };
  }

  // Check Location: Must match owner's managed parking space
  const bookingLocationId = matched.parkingLocation?.id || 'loc-1';
  if (bookingLocationId !== ownerSpaceId) {
    return {
      isValid: false,
      statusCode: 'wrong_location',
      message: 'This pass belongs to a different parking location',
      locationTitle: matched.parkingLocation?.title,
      booking: undefined, // Never reveal another location's driver details
      rawPayload: rawScannedText
    };
  }

  // Check Payment Status
  if (matched.paymentStatus && matched.paymentStatus !== 'completed') {
    return {
      isValid: false,
      statusCode: 'unpaid',
      message: 'Payment is pending or incomplete for this pass',
      booking: matched,
      rawPayload: rawScannedText
    };
  }

  // Check Status
  if (matched.status === 'cancelled') {
    return {
      isValid: false,
      statusCode: 'cancelled',
      message: 'This reservation was cancelled by the driver',
      booking: matched,
      rawPayload: rawScannedText
    };
  }

  if (matched.status === 'completed') {
    return {
      isValid: false,
      statusCode: 'already_completed',
      message: 'This booking has already been checked out',
      checkOutAt: matched.checkOutAt,
      booking: matched,
      rawPayload: rawScannedText
    };
  }

  if (matched.status === 'active') {
    return {
      isValid: false,
      statusCode: 'already_active',
      message: 'This pass has already been used to check in',
      checkInAt: matched.checkInAt,
      booking: matched,
      rawPayload: rawScannedText
    };
  }

  // Booking is confirmed and ready for check-in!
  return {
    isValid: true,
    statusCode: 'valid',
    message: 'Valid parking pass ready for check-in',
    booking: matched,
    rawPayload: rawScannedText
  };
}

/**
 * Confirms check-in for a validated booking:
 * Transitions booking status: confirmed -> active.
 * Uses concurrency locking to protect against double taps and duplicate scan callbacks.
 */
export async function confirmBookingCheckIn(params: {
  bookingId: string;
  passCode?: string;
  passTokenHash?: string;
  isDemoMode?: boolean;
}): Promise<{ success: boolean; message: string; checkInAt?: string; booking?: Booking }> {
  const { bookingId, passCode, passTokenHash, isDemoMode = false } = params;

  if (inFlightRequests.has(bookingId)) {
    return { success: false, message: 'Check-in request is already processing...' };
  }

  inFlightRequests.add(bookingId);

  try {
    const nowIso = new Date().toISOString();

    // If Supabase is configured and not in demo mode, call atomic RPC
    if (isSupabaseConfigured && supabase && !isDemoMode) {
      try {
        const { data, error } = await supabase.rpc('confirm_booking_check_in', {
          p_booking_id: bookingId,
          p_pass_token_hash: passTokenHash || null,
          p_pass_code: passCode || null
        });

        if (error) {
          return { success: false, message: error.message || 'Check-in failed on server.' };
        }

        if (data && data.success) {
          return {
            success: true,
            message: 'Vehicle checked in',
            checkInAt: data.check_in_at || nowIso
          };
        }
      } catch (err: any) {
        console.warn('Supabase check-in failed, falling back to local store:', err);
      }
    }

    // Local / Demo Mode atomic update
    const allBookings = getLocalOwnerBookings();
    const target = allBookings.find(b => b.id === bookingId || b.passCode === passCode);

    if (!target) {
      return { success: false, message: 'Booking not found.' };
    }

    if (target.status === 'active') {
      return { success: true, message: 'Vehicle already checked in', checkInAt: target.checkInAt || nowIso, booking: target };
    }

    if (target.status !== 'confirmed') {
      return { success: false, message: `Cannot check in a ${target.status} booking.` };
    }

    target.status = 'active';
    target.checkInAt = nowIso;

    saveLocalOwnerBookings(allBookings);

    return {
      success: true,
      message: 'Vehicle checked in',
      checkInAt: nowIso,
      booking: target
    };
  } finally {
    inFlightRequests.delete(bookingId);
  }
}

/**
 * Confirms vehicle check-out:
 * Transitions booking status: active -> completed.
 */
export async function confirmBookingCheckOut(params: {
  bookingId: string;
  isDemoMode?: boolean;
}): Promise<{ success: boolean; message: string; checkOutAt?: string; booking?: Booking }> {
  const { bookingId, isDemoMode = false } = params;

  if (inFlightRequests.has(bookingId)) {
    return { success: false, message: 'Check-out request is already processing...' };
  }

  inFlightRequests.add(bookingId);

  try {
    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured && supabase && !isDemoMode) {
      try {
        const { data, error } = await supabase.rpc('confirm_booking_check_out', {
          p_booking_id: bookingId
        });

        if (error) {
          return { success: false, message: error.message || 'Check-out failed on server.' };
        }

        if (data && data.success) {
          return {
            success: true,
            message: 'Vehicle checked out',
            checkOutAt: data.check_out_at || nowIso
          };
        }
      } catch (err: any) {
        console.warn('Supabase check-out failed, falling back to local store:', err);
      }
    }

    // Local / Demo Mode atomic update
    const allBookings = getLocalOwnerBookings();
    const target = allBookings.find(b => b.id === bookingId);

    if (!target) {
      return { success: false, message: 'Booking not found.' };
    }

    if (target.status === 'completed') {
      return { success: true, message: 'Vehicle already checked out', checkOutAt: target.checkOutAt || nowIso, booking: target };
    }

    if (target.status !== 'active') {
      return { success: false, message: `Cannot check out booking in '${target.status}' state.` };
    }

    target.status = 'completed';
    target.checkOutAt = nowIso;

    saveLocalOwnerBookings(allBookings);

    return {
      success: true,
      message: 'Vehicle checked out',
      checkOutAt: nowIso,
      booking: target
    };
  } finally {
    inFlightRequests.delete(bookingId);
  }
}

/**
 * Fetches currently parked active bookings for an owner's location.
 */
export function getCurrentlyParkedBookings(spaceId: string = 'loc-1'): Booking[] {
  const all = getLocalOwnerBookings();
  return all.filter(b => (b.parkingLocation?.id === spaceId || !b.parkingLocation?.id) && b.status === 'active');
}

/**
 * Fetches expected arrivals (confirmed upcoming bookings) for an owner's location.
 */
export function getExpectedArrivalBookings(spaceId: string = 'loc-1'): Booking[] {
  const all = getLocalOwnerBookings();
  return all.filter(b => (b.parkingLocation?.id === spaceId || !b.parkingLocation?.id) && b.status === 'confirmed');
}
