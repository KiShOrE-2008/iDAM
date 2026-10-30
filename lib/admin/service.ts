/**
 * Data for the /admin console. Every call goes through an admin-only database function
 * (see supabase/migrations/20261030000000_admin_console.sql); non-admins get "Admins only".
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ActivationStatus, PayoutStatus } from '@/lib/owner/payouts';

export interface AdminSummary {
  generated_at: string;
  users: { total: number; admins: number; owners: number; new_7d: number };
  listings: { active: number; pending_review: number; inactive: number; suspended: number; draft: number; legacy_lots: number };
  bookings: { total: number; today: number; awaiting_payment: number; confirmed: number; parked_now: number; completed: number; cancelled: number };
  money: { paid_total: number; paid_today: number; paid_7d: number; paid_30d: number; platform_fees: number; marked_refunded: number };
}

export interface AdminSpace {
  id: string;
  title: string;
  address: string;
  landmark: string | null;
  latitude: number;
  longitude: number;
  status: string;
  is_approved: boolean;
  car_capacity: number;
  bike_capacity: number;
  price_per_hour_car: number;
  price_per_hour_bike: number;
  image_url: string | null;
  created_at: string;
  review_note: string | null;
  reviewed_at: string | null;
  owner: { id: string | null; name: string | null; email: string | null; phone: string | null; other_listings: number };
}

export type ReviewAction = 'approve' | 'reject' | 'suspend' | 'reinstate';

export interface AdminAnalytics {
  days: number;
  from: string;
  daily: { day: string; bookings: number; paid_bookings: number; revenue: number; platform_fees: number }[];
  totals: {
    bookings: number; paid_bookings: number; cancelled: number; revenue: number; platform_fees: number;
    owner_earnings: number; marked_refunded: number; avg_booking_value: number;
  };
  owners: { name: string; email: string | null; phone: string | null; listings: number; bookings: number; paid_bookings: number; revenue: number; platform_fees: number; earnings: number }[];
  drivers: { name: string; email: string | null; phone: string | null; bookings: number; paid_bookings: number; cancelled: number; spent: number; last_booking: string }[];
  listings: { title: string; status: string; bookings: number; revenue: number }[];
}

export interface AdminBooking {
  id: string;
  pass_code: string;
  created_at: string;
  start_at: string | null;
  end_at: string | null;
  vehicle_type: string;
  vehicle_number: string | null;
  total_amount: number;
  platform_fee: number;
  booking_status: string;
  payment_status: string;
  payment_id: string | null;
  razorpay_order_id: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  cancellation_reason: string | null;
  lot: string | null;
  driver_name: string | null;
  driver_email: string | null;
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  listings: number;
  bookings: number;
  spent: number;
}

export interface AdminPayouts {
  totals: { waiting_for_bank: number; to_send: number; on_hold: number; released: number; reversals: number; problems: number };
  payouts: {
    booking_id: string; amount: number; gross_amount: number; platform_fee: number; status: PayoutStatus;
    on_hold_until: string | null; razorpay_transfer_id: string | null; attempts: number; last_error: string | null;
    released_at: string | null; reversed_at: string | null; created_at: string; updated_at: string;
    pass_code: string; lot: string | null; owner_name: string | null; owner_email: string | null;
  }[];
  owners: {
    id: string; name: string | null; email: string | null; phone: string | null; activation_status: ActivationStatus;
    razorpay_account_id: string | null; bank_last4: string | null; last_error: string | null; owed: number;
  }[];
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!isSupabaseConfigured || !supabase) throw new Error('The database is not configured.');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(/Admins only/i.test(error.message) ? 'Admins only' : error.message);
  return data as T;
}

export const isCurrentUserAdmin = () => rpc<boolean>('is_admin');
export const fetchAdminSummary = () => rpc<AdminSummary>('admin_summary');
export const fetchAdminSpaces = (status: string | null = 'pending_review') => rpc<AdminSpace[]>('admin_list_spaces', { p_status: status });
export const fetchAdminAnalytics = (days: number) => rpc<AdminAnalytics>('admin_analytics', { p_days: days });
export const fetchAdminBookings = (status: string | null, search: string | null) =>
  rpc<AdminBooking[]>('admin_list_bookings', { p_status: status, p_search: search, p_limit: 200 });
export const fetchAdminUsers = (search: string | null) => rpc<AdminUser[]>('admin_list_users', { p_search: search, p_limit: 300 });

export const fetchAdminPayouts = (status: string | null) => rpc<AdminPayouts>('admin_payouts', { p_status: status });

/** Sends, releases and reverses every payout that is due (normally done hourly by pg_cron). */
export async function runPayoutsNow(): Promise<{ processed: number; accounts_changed: number; results: Record<string, number> }> {
  if (!isSupabaseConfigured || !supabase) throw new Error('The database is not configured.');
  const { data, error } = await supabase.functions.invoke('process-payouts', { body: {} });
  if (error) throw new Error('Could not run payouts. Is the process-payouts function deployed?');
  return data;
}

export async function reviewSpace(spaceId: string, action: ReviewAction, note?: string) {
  const res = await rpc<{ success: boolean; message?: string; status?: string }>('admin_review_space', {
    p_space_id: spaceId,
    p_action: action,
    p_note: note ?? null
  });
  if (!res.success) throw new Error(res.message || 'Review failed.');
  return res;
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const formatInr = (n: number | string | null | undefined) => inr.format(Number(n || 0));
export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
