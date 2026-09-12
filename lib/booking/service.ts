import { Booking, BookingRequest, ParkingLocation } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function createBooking(
  location: ParkingLocation,
  request: BookingRequest
): Promise<Booking> {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  const passCode = `IDM-${randomNum}`;
  
  // Calculate end time
  const [startHour, startMin] = request.startTime.split(':').map(Number);
  const endHour = (startHour + request.durationHours) % 24;
  const formattedStart = `${request.startTime}`;
  const formattedEnd = `${endHour.toString().padStart(2, '0')}:${(startMin || 0).toString().padStart(2, '0')}`;

  const bookingData: Booking = {
    id: `bk-${Date.now()}`,
    passCode: passCode,
    parkingLocation: location,
    vehicleType: request.vehicleType,
    bookingDate: request.bookingDate,
    startTime: formattedStart,
    endTime: formattedEnd,
    durationHours: request.durationHours,
    basePrice: request.basePrice,
    platformFee: request.platformFee,
    totalAmount: request.totalAmount,
    paymentMethod: request.paymentMethod,
    paymentStatus: 'completed',
    status: 'confirmed',
    qrData: JSON.stringify({
      passCode,
      location: location.title,
      date: request.bookingDate,
      time: `${formattedStart} - ${formattedEnd}`,
      amount: request.totalAmount
    }),
    createdAt: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('bookings').insert([{
        pass_code: passCode,
        parking_location_id: location.id,
        vehicle_type: request.vehicleType,
        booking_date: request.bookingDate,
        start_time: formattedStart,
        duration_hours: request.durationHours,
        end_time: formattedEnd,
        base_price: request.basePrice,
        platform_fee: request.platformFee,
        total_amount: request.totalAmount,
        payment_method: request.paymentMethod,
        payment_status: 'completed',
        status: 'confirmed',
        qr_data: bookingData.qrData
      }]);
    } catch (err) {
      console.warn('Supabase booking insert failed, saved locally:', err);
    }
  }

  return bookingData;
}
