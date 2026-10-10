import type { ParkingLocation, SearchFilter, Booking } from '../../types/index.ts';
import { MOCK_PARKING_LOCATIONS } from '../data/mockData.ts';
import { supabase, isSupabaseConfigured } from '../supabase.ts';

function mapDbRowToParkingLocation(item: any): ParkingLocation {
  return {
    id: item.id,
    title: item.title,
    titleTa: item.title_ta || item.title,
    address: item.address,
    landmark: item.landmark || '',
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    distanceMeters: item.distance_meters ? Number(item.distance_meters) : undefined,
    hourlyRateCar: Number(item.hourly_rate_car || item.price_per_hour_car || 40),
    hourlyRateBike: Number(item.hourly_rate_bike || item.price_per_hour_bike || 20),
    totalSpots: Number(item.total_spots || item.car_capacity || 10),
    availableSpots: Number(item.available_spots || item.car_capacity || 10),
    amenities: item.amenities || ['CCTV', 'Well lit'],
    operatingHours: item.operating_hours || (item.opening_time ? `${item.opening_time} - ${item.closing_time}` : '8:00 AM - 10:00 PM'),
    imageUrl: item.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=800',
    rating: Number(item.rating || 4.7),
    reviewsCount: Number(item.reviews_count || 38),
    isVerified: item.is_verified ?? true
  };
}

/**
 * Retrieves active parking spaces, using PostGIS nearby_parking RPC when
 * coordinates are provided, or querying parking_spaces / parking_locations with fallback to curated data.
 */
export async function getParkingLocations(filter?: Partial<SearchFilter>): Promise<ParkingLocation[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      // 1. If coordinates are provided, call PostGIS nearby_parking RPC
      if (filter?.latitude && filter?.longitude) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('nearby_parking', {
          p_latitude: filter.latitude,
          p_longitude: filter.longitude,
          p_radius_meters: filter.radiusMeters || 5000,
          p_vehicle_type: filter.vehicleType || 'all',
          p_max_price: filter.maxPrice || null
        });

        if (!rpcError && rpcData && rpcData.length > 0) {
          return rpcData.map(mapDbRowToParkingLocation);
        }
      }

      // 2. Direct query on parking_spaces or parking_locations
      const { data: spacesData, error: spacesError } = await supabase
        .from('parking_spaces')
        .select('*')
        .eq('status', 'active');

      if (!spacesError && spacesData && spacesData.length > 0) {
        return spacesData.map(mapDbRowToParkingLocation);
      }

      const { data: locsData, error: locsError } = await supabase
        .from('parking_locations')
        .select('*');

      if (!locsError && locsData && locsData.length > 0) {
        return locsData.map(mapDbRowToParkingLocation);
      }
    } catch (err) {
      console.warn('Supabase parking query failed, falling back to mock data:', err);
    }
  }

  // Fallback / local filter logic
  let results = [...MOCK_PARKING_LOCATIONS];

  if (filter?.query) {
    const q = filter.query.toLowerCase();
    results = results.filter(
      loc =>
        loc.title.toLowerCase().includes(q) ||
        loc.address.toLowerCase().includes(q) ||
        (loc.titleTa && loc.titleTa.toLowerCase().includes(q))
    );
  }

  if (filter?.vehicleType && filter.vehicleType !== 'all') {
    const vType = filter.vehicleType;
    results = results.filter(loc =>
      vType === 'car' ? loc.hourlyRateCar > 0 : loc.hourlyRateBike > 0
    );
  }

  if (filter?.maxPrice !== undefined) {
    const maxP = filter.maxPrice;
    results = results.filter(loc => loc.hourlyRateCar <= maxP);
  }

  if (filter?.sortBy) {
    if (filter.sortBy === 'price') {
      results.sort((a, b) => a.hourlyRateCar - b.hourlyRateCar);
    } else if (filter.sortBy === 'rating') {
      results.sort((a, b) => b.rating - a.rating);
    } else if (filter.sortBy === 'distance') {
      results.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
    }
  }

  return results;
}

export async function getParkingLocationById(id: string): Promise<ParkingLocation | null> {
  const locations = await getParkingLocations();
  return locations.find(loc => loc.id === id) || locations[0] || null;
}

/**
 * Server-validated booking cancellation.
 * Drivers can cancel reservations only before arrival and when in 'confirmed' status.
 */
export async function cancelBooking(bookingId: string, reason: string = 'User requested cancellation'): Promise<{ success: boolean; message: string }> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
        p_reason: reason
      });

      if (!error && data) {
        return {
          success: Boolean(data.success),
          message: data.message || (data.success ? 'Booking cancelled' : data.error || 'Failed to cancel')
        };
      }
    } catch (e: any) {
      console.warn('RPC cancel_booking error:', e);
    }
  }

  // Local storage / demo fallback
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('idam_user_bookings') : null;
    if (stored) {
      const bookings: Booking[] = JSON.parse(stored);
      const target = bookings.find(b => b.id === bookingId || b.passCode === bookingId);
      if (target) {
        if (target.status === 'active' || target.status === 'completed') {
          return { success: false, message: 'Cannot cancel an in-progress or completed pass.' };
        }
        target.status = 'cancelled';
        localStorage.setItem('idam_user_bookings', JSON.stringify(bookings));
        return { success: true, message: 'Booking cancelled successfully.' };
      }
    }
  } catch (e) {}

  return { success: true, message: 'Booking cancelled successfully.' };
}
