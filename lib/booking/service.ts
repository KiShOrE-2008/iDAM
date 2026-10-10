import type { Booking, BookingRequest, ParkingLocation } from '../../types/index.ts';
import { supabase, isSupabaseConfigured } from '../supabase.ts';
import { generatePassToken, hashPassToken, formatSecureQrPayload } from '../parking/passSecurity.ts';

const LOCAL_STORAGE_KEY = 'idam_user_bookings';

export interface BookingQuote {
  hourlyRate: number;
  basePrice: number;
  addonsFee: number;
  platformFee: number;
  totalAmount: number;
}

/**
 * Calculates a trusted pricing quote for a parking reservation.
 * Invokes the Supabase calculate_booking_quote RPC when configured,
 * or applies trusted server-side rules in local/demo mode.
 */
export async function calculateBookingQuote(
  location: ParkingLocation,
  vehicleType: 'car' | 'bike' | 'suv' | 'ev' = 'car',
  durationHours: number = 2,
  addons: string[] = []
): Promise<BookingQuote> {
  const normVehicleType = vehicleType === 'bike' ? 'bike' : 'car';
  const hours = Math.max(1, Math.min(72, durationHours));

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('calculate_booking_quote', {
        p_space_id: location.id,
        p_vehicle_type: normVehicleType,
        p_duration_hours: hours,
        p_addons: addons
      });
      if (!error && data) {
        return {
          hourlyRate: Number(data.hourly_rate),
          basePrice: Number(data.base_price),
          addonsFee: Number(data.addons_fee),
          platformFee: Number(data.platform_fee),
          totalAmount: Number(data.total_amount)
        };
      }
    } catch (e) {
      console.warn('RPC calculate_booking_quote failed, using server fallback:', e);
    }
  }

  // Trusted fallback calculation
  const hourlyRate = normVehicleType === 'bike' 
    ? (location.hourlyRateBike || 15) 
    : (location.hourlyRateCar || 30);
  const basePrice = hourlyRate * hours;

  let addonsFee = 0;
  for (const addon of addons) {
    const lower = addon.toLowerCase();
    if (lower.includes('ev')) addonsFee += 30 * hours;
    else if (lower.includes('wash')) addonsFee += 150;
    else if (lower.includes('valet')) addonsFee += 50;
    else if (lower.includes('protection') || lower.includes('insurance')) addonsFee += 10;
  }

  const platformFee = 5;
  const totalAmount = basePrice + addonsFee + platformFee;

  return {
    hourlyRate,
    basePrice,
    addonsFee,
    platformFee,
    totalAmount
  };
}

/**
 * Creates and registers a new parking pass booking with cryptographic pass token.
 */
export async function createBooking(
  location: ParkingLocation,
  request: BookingRequest,
  options?: { isDemoMode?: boolean }
): Promise<Booking> {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  const passCode = `IDM-${randomNum}`;
  
  // Calculate end time
  const [startHour, startMin] = request.startTime.split(':').map(Number);
  const endHour = (startHour + request.durationHours) % 24;
  const formattedStart = `${request.startTime}`;
  const formattedEnd = `${endHour.toString().padStart(2, '0')}:${(startMin || 0).toString().padStart(2, '0')}`;

  // Generate cryptographically secure pass token and SHA-256 hash
  const passToken = generatePassToken();
  const passTokenHash = await hashPassToken(passToken);
  const secureQrData = formatSecureQrPayload(passToken);

  // Calculate trusted pricing quote
  const quote = await calculateBookingQuote(
    location,
    request.vehicleType === 'bike' ? 'bike' : 'car',
    request.durationHours,
    []
  );

  const finalTotal = request.totalAmount || quote.totalAmount;

  const bookingData: Booking = {
    id: `bk-${Date.now()}`,
    passCode: passCode,
    passToken: passToken,
    passTokenHash: passTokenHash,
    parkingLocation: location,
    vehicleType: request.vehicleType,
    bookingDate: request.bookingDate,
    startTime: formattedStart,
    endTime: formattedEnd,
    durationHours: request.durationHours,
    basePrice: request.basePrice || quote.basePrice,
    platformFee: request.platformFee || quote.platformFee,
    totalAmount: finalTotal,
    paymentMethod: request.paymentMethod || 'Razorpay',
    paymentStatus: 'completed',
    paymentId: request.paymentId,
    razorpayOrderId: request.razorpayOrderId,
    vehicleNumber: request.vehicleNumber,
    driverName: request.driverName,
    driverPhone: request.driverPhone,
    status: 'confirmed',
    qrData: secureQrData,
    createdAt: new Date().toISOString()
  };

  // Save to LocalStorage for persistent pass access across sessions
  saveBookingLocally(bookingData);

  const isDemo = options?.isDemoMode ?? (getStorage()?.getItem('idam_demo_mode') === 'true');

  if (isSupabaseConfigured && supabase && !isDemo) {
    try {
      // Attempt atomic booking creation RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_verified_booking', {
        p_space_id: location.id,
        p_vehicle_type: request.vehicleType === 'bike' ? 'bike' : 'car',
        p_start_time: new Date().toISOString(),
        p_duration_hours: request.durationHours,
        p_vehicle_number: request.vehicleNumber,
        p_driver_name: request.driverName || 'Driver',
        p_driver_phone: request.driverPhone || '',
        p_addons: [],
        p_pass_token_hash: passTokenHash,
        p_pass_code: passCode,
        p_payment_ref: request.paymentId || null
      });

      if (rpcError || (rpcData && !rpcData.success)) {
        // Fallback to direct insert if RPC not deployed yet
        await supabase.from('bookings').insert([{
          pass_code: passCode,
          pass_token_hash: passTokenHash,
          parking_location_id: location.id,
          vehicle_type: request.vehicleType,
          booking_date: request.bookingDate,
          start_time: formattedStart,
          duration_hours: request.durationHours,
          end_time: formattedEnd,
          base_price: bookingData.basePrice,
          platform_fee: bookingData.platformFee,
          total_amount: bookingData.totalAmount,
          payment_method: request.paymentMethod || 'Razorpay',
          payment_status: 'completed',
          payment_id: request.paymentId,
          status: 'confirmed',
          qr_data: secureQrData
        }]);
      }
    } catch (err) {
      console.warn('Supabase booking insert failed, saved locally:', err);
    }
  }

  return bookingData;
}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

function saveBookingLocally(booking: Booking): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const existingStr = storage.getItem(LOCAL_STORAGE_KEY);
    const existing: Booking[] = existingStr ? JSON.parse(existingStr) : [];
    const updated = [booking, ...existing.filter(b => b.passCode !== booking.passCode)];
    storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save booking to storage:', err);
  }
}

/**
 * Retrieves a booking by passCode from local storage.
 */
export function getBookingByPassCode(passCode: string): Booking | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const existingStr = storage.getItem(LOCAL_STORAGE_KEY);
    if (!existingStr) return null;
    const bookings: Booking[] = JSON.parse(existingStr);
    return bookings.find(b => b.passCode.toLowerCase() === passCode.toLowerCase()) || null;
  } catch {
    return null;
  }
}

/**
 * Retrieves all stored user bookings.
 */
export function getAllBookings(): Booking[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const existingStr = storage.getItem(LOCAL_STORAGE_KEY);
    return existingStr ? JSON.parse(existingStr) : [];
  } catch {
    return [];
  }
}
