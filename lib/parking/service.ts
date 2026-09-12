import { ParkingLocation, SearchFilter } from '@/types';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function getParkingLocations(filter?: Partial<SearchFilter>): Promise<ParkingLocation[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('parking_locations').select('*');
      if (!error && data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          title: item.title,
          titleTa: item.title_ta || item.title,
          address: item.address,
          landmark: item.landmark,
          latitude: item.latitude,
          longitude: item.longitude,
          hourlyRateCar: Number(item.hourly_rate_car),
          hourlyRateBike: Number(item.hourly_rate_bike),
          totalSpots: item.total_spots,
          availableSpots: item.available_spots,
          amenities: item.amenities || [],
          operatingHours: item.operating_hours || '8:00 AM - 10:00 PM',
          imageUrl: item.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=800',
          rating: Number(item.rating || 4.7),
          reviewsCount: item.reviews_count || 38,
          isVerified: item.is_verified
        }));
      }
    } catch (err) {
      console.warn('Supabase query failed, falling back to mock data:', err);
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
