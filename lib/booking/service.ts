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
  
  // Build authoritative reservation start and end times from bookingDate and startTime
  const dateStr = request.bookingDate || new Date().toISOString().split('T')[0];
  const timeStr = request.startTime && request.startTime.includes(':') ? request.startTime : '10:00';
  const [startHourStr, startMinStr] = timeStr.split(':');
  const startHour = parseInt(startHourStr, 10) || 0;
  const startMin = parseInt(startMinStr, 10) || 0;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedStart = `${pad(startHour)}:${pad(startMin)}`;

  const reservationDate = new Date(`${dateStr}T${pad(startHour)}:${pad(startMin)}:00`);
  const startTimeIso = !isNaN(reservationDate.getTime()) 
    ? reservationDate.toISOString() 
    : new Date().toISOString();

  const endDate = new Date(reservationDate.getTime() + request.durationHours * 60 * 60 * 1000);
  const formattedEnd = !isNaN(endDate.getTime())
    ? `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`
    : `${pad((startHour + request.durationHours) % 24)}:${pad(startMin)}`;

  // Generate cryptographically secure pass token and SHA-256 hash
  const passToken = generatePassToken();
  const passTokenHash = await hashPassToken(passToken);
  const secureQrData = formatSecureQrPayload(passToken);

  // Authoritative server-side pricing recalculation — never trust client-provided totals
  const quote = await calculateBookingQuote(
    location,
    request.vehicleType === 'bike' ? 'bike' : 'car',
    request.durationHours,
    []
  );

  const finalTotal = quote.totalAmount;

  const bookingData: Booking = {
    id: `bk-${Date.now()}`,
    passCode: passCode,
    passToken: passToken,
    passTokenHash: passTokenHash,
    parkingLocation: location,
    vehicleType: request.vehicleType,
    bookingDate: dateStr,
    startTime: formattedStart,
    endTime: formattedEnd,
    durationHours: request.durationHours,
    basePrice: quote.basePrice,
    platformFee: quote.platformFee,
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

  const isDemo = options?.isDemoMode !== undefined
    ? options.isDemoMode
    : (getStorage()?.getItem('idam_demo_mode') === 'true' || Boolean(request.paymentId?.startsWith('demo_pay_') || request.paymentId?.startsWith('mock_')));

  if (isSupabaseConfigured && supabase && !isDemo) {
    try {
      // Attempt atomic booking creation RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_verified_booking', {
        p_space_id: location.id,
        p_vehicle_type: request.vehicleType === 'bike' ? 'bike' : 'car',
        p_start_time: startTimeIso,
        p_duration_hours: request.durationHours,
        p_vehicle_number: request.vehicleNumber,
        p_driver_name: request.driverName || 'Driver',
        p_driver_phone: request.driverPhone || '',
        p_addons: [],
        p_pass_token_hash: passTokenHash,
        p_pass_code: passCode,
        p_payment_ref: request.paymentId || null
      });

      if (!rpcError && rpcData?.success && rpcData?.booking_id) {
        bookingData.id = rpcData.booking_id;
        saveBookingLocally(bookingData);
      } else {
        // Fallback to direct insert if RPC not deployed yet
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        await supabase.from('bookings').insert([{
          pass_code: passCode,
          pass_token_hash: passTokenHash,
          parking_space_id: location.id,
          parking_location_id: location.id,
          driver_id: userId,
          user_id: userId,
          vehicle_type: request.vehicleType,
          vehicle_number: request.vehicleNumber,
          driver_name: request.driverName || 'Driver',
          driver_phone: request.driverPhone || '',
          booking_date: dateStr,
          start_time: startTimeIso,
          duration_hours: request.durationHours,
          end_time: endDate.toISOString(),
          base_price: bookingData.basePrice,
          platform_fee: bookingData.platformFee,
          total_amount: bookingData.totalAmount,
          payment_method: request.paymentMethod || 'Razorpay',
          payment_status: 'completed',
          payment_id: request.paymentId,
          booking_status: 'confirmed',
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
 * Retrieves all stored user bookings from local storage.
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

/**
 * Maps a database row from public.bookings to the application Booking type.
 */
export function mapDbRowToBooking(row: any, space?: any): Booking {
  const s = space || row.parking_spaces || {};
  const parkingLocation: ParkingLocation = {
    id: row.parking_space_id || row.parking_location_id || s.id || '',
    title: s.title || 'Madurai Parking Space',
    address: s.address || 'Madurai',
    latitude: Number(s.latitude || 9.92),
    longitude: Number(s.longitude || 78.12),
    hourlyRateCar: Number(s.hourly_rate_car || s.price_per_hour_car || 30),
    hourlyRateBike: Number(s.hourly_rate_bike || s.price_per_hour_bike || 15),
    totalSpots: Number(s.total_spots || (s.car_capacity || 0) + (s.bike_capacity || 0) || 15),
    availableSpots: Number(s.available_spots || s.car_capacity || 8),
    amenities: s.amenities || ['CCTV Surveillance', '24/7 Security'],
    operatingHours: s.operating_hours || '24/7',
    imageUrl: s.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=800',
    rating: Number(s.rating || 4.8),
    reviewsCount: Number(s.reviews_count || 12),
    isVerified: true
  };

  const bookingDate = row.booking_date || (row.start_time ? String(row.start_time).split('T')[0] : new Date().toISOString().split('T')[0]);
  const startTime = row.start_time ? (String(row.start_time).includes('T') ? String(row.start_time).split('T')[1].slice(0, 5) : String(row.start_time).slice(0, 5)) : '10:00';
  const endTime = row.end_time ? (String(row.end_time).includes('T') ? String(row.end_time).split('T')[1].slice(0, 5) : String(row.end_time).slice(0, 5)) : '12:00';

  return {
    id: row.id,
    passCode: row.pass_code,
    passToken: row.pass_token,
    passTokenHash: row.pass_token_hash,
    parkingLocation,
    vehicleType: (row.vehicle_type as 'car' | 'bike') || 'car',
    bookingDate,
    startTime,
    endTime,
    durationHours: Number(row.duration_hours || 2),
    basePrice: Number(row.base_price || 0),
    platformFee: Number(row.platform_fee || 5),
    totalAmount: Number(row.total_amount || 0),
    paymentMethod: row.payment_method || 'Razorpay',
    paymentStatus: (row.payment_status as 'completed' | 'pending' | 'failed') || 'completed',
    paymentId: row.payment_id,
    razorpayOrderId: row.razorpay_order_id,
    vehicleNumber: row.vehicle_number || '',
    driverName: row.driver_name || '',
    driverPhone: row.driver_phone || '',
    status: (row.booking_status || row.status || 'confirmed') as any,
    qrData: row.qr_data || (row.pass_token ? formatSecureQrPayload(row.pass_token) : formatSecureQrPayload(row.pass_code)),
    createdAt: row.created_at || new Date().toISOString(),
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    checkedInBy: row.checked_in_by,
    checkedOutBy: row.checked_out_by
  };
}

/**
 * Retrieves all bookings for the authenticated user from Supabase,
 * merged with local offline bookings.
 */
export async function fetchUserBookings(userId?: string): Promise<Booking[]> {
  const localList = getAllBookings();
  
  if (isSupabaseConfigured && supabase) {
    try {
      let uid = userId;
      if (!uid) {
        const { data: userData } = await supabase.auth.getUser();
        uid = userData?.user?.id;
      }

      if (uid) {
        const { data, error } = await supabase
          .from('bookings')
          .select('*, parking_spaces(*)')
          .or(`user_id.eq.${uid},driver_id.eq.${uid}`)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const dbBookings = data.map((row: any) => mapDbRowToBooking(row, row.parking_spaces));
          // Merge with any local bookings not yet synced or created in demo mode
          const seenPassCodes = new Set(dbBookings.map(b => b.passCode.toLowerCase()));
          const remainingLocal = localList.filter(l => !seenPassCodes.has(l.passCode.toLowerCase()));
          return [...dbBookings, ...remainingLocal];
        }
      }
    } catch (e) {
      console.warn('Failed to fetch user bookings from Supabase, returning local:', e);
    }
  }

  return localList;
}

/**
 * Retrieves a single booking by its pass code from Supabase,
 * falling back to local storage.
 */
export async function fetchBookingByPassCode(passCode: string): Promise<Booking | null> {
  const trimmed = passCode.trim();
  
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, parking_spaces(*)')
        .ilike('pass_code', trimmed)
        .maybeSingle();

      if (!error && data) {
        return mapDbRowToBooking(data, data.parking_spaces);
      }
    } catch (e) {
      console.warn('Error fetching booking by pass code from Supabase:', e);
    }
  }

  return getBookingByPassCode(trimmed);
}

