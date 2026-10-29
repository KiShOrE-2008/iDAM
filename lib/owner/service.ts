/**
 * Owner-side data for the mobile Owner Portal.
 *
 * A user is an owner when they have at least one parking listing. Listings are approved
 * by iDAM (see enforce_parking_space_review), so no separate owner-role approval is needed.
 * RLS lets owners read their own listings (any status) and the bookings for them.
 * Demo mode keeps using the local demo data for the 'loc-1' showcase space.
 */

import type { Booking } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapDbRowToBooking } from '@/lib/booking/service';
import { getCurrentlyParkedBookings, getExpectedArrivalBookings } from '@/lib/parking/checkInService';

export const DEMO_OWNER_SPACE_ID = 'loc-1';

export interface OwnerSpace {
  id: string;
  title: string;
  address: string;
  status: 'draft' | 'pending_review' | 'active' | 'inactive' | 'suspended';
  isApproved: boolean;
  carCapacity: number;
  bikeCapacity: number;
  rateCar: number;
  rateBike: number;
}

export interface OwnerSpaceActivity {
  /** Checked in and not yet checked out */
  parked: Booking[];
  /** Paid and not yet arrived */
  arrivals: Booking[];
  /** Sum of payments for bookings made today */
  todayRevenue: number;
}

/** The signed-in user's listings, live ones first. */
export async function fetchMySpaces(): Promise<OwnerSpace[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from('parking_spaces')
    .select('id, title, address, status, is_approved, car_capacity, bike_capacity, price_per_hour_car, price_per_hour_bike, created_at')
    .eq('owner_id', auth.user.id)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  const spaces = (data || []).map((s: any): OwnerSpace => ({
    id: s.id,
    title: s.title,
    address: s.address,
    status: s.status,
    isApproved: Boolean(s.is_approved),
    carCapacity: Number(s.car_capacity || 0),
    bikeCapacity: Number(s.bike_capacity || 0),
    rateCar: Number(s.price_per_hour_car || 0),
    rateBike: Number(s.price_per_hour_bike || 0)
  }));
  return spaces.sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active'));
}

/** The listing the Owner Portal manages: the first live one, else the first listing. */
export function primarySpace(spaces: OwnerSpace[]): OwnerSpace | null {
  return spaces.find(s => s.status === 'active') || spaces[0] || null;
}

/** Only live, approved listings can verify passes at the gate. */
export function canScanAt(space: OwnerSpace | null): boolean {
  return Boolean(space && space.isApproved && space.status === 'active');
}

export async function fetchSpaceActivity(spaceId: string, isDemoMode: boolean): Promise<OwnerSpaceActivity> {
  if (isDemoMode || !isSupabaseConfigured || !supabase) {
    return {
      parked: getCurrentlyParkedBookings(DEMO_OWNER_SPACE_ID),
      arrivals: getExpectedArrivalBookings(DEMO_OWNER_SPACE_ID),
      todayRevenue: 1240
    };
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [current, paidToday] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, parking_spaces(*)')
      .eq('parking_space_id', spaceId)
      .in('booking_status', ['confirmed', 'active'])
      .eq('payment_status', 'completed')
      .order('start_timestamptz', { ascending: true }),
    supabase
      .from('bookings')
      .select('total_amount')
      .eq('parking_space_id', spaceId)
      .in('payment_status', ['completed'])
      .gte('created_at', startOfToday.toISOString())
  ]);
  if (current.error) throw new Error(current.error.message);
  if (paidToday.error) throw new Error(paidToday.error.message);

  const rows = current.data || [];
  return {
    parked: rows.filter((r: any) => r.booking_status === 'active').map((r: any) => mapDbRowToBooking(r)),
    arrivals: rows.filter((r: any) => r.booking_status === 'confirmed').map((r: any) => mapDbRowToBooking(r)),
    todayRevenue: (paidToday.data || []).reduce((sum: number, r: any) => sum + Number(r.total_amount || 0), 0)
  };
}
