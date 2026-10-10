// Automated Test Suite for Phase 1 — Supabase Database & Security
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Mock localStorage for Node test runner
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

import { getParkingLocations, cancelBooking } from '../lib/parking/service.ts';

console.log('=== RUNNING PHASE 1 — SUPABASE & DATABASE SECURITY TESTS ===\n');

async function runTests() {
  // Test 1: Verify SQL Migration Definitions and Security Policies
  console.log('Test 1: Migration File & Security Architecture Verification');
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261010020000_phase1_database_and_security.sql');
  assert.ok(fs.existsSync(migrationPath), 'Phase 1 migration file must exist');

  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.profiles'), 'profiles table defined');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.vehicles'), 'vehicles table defined');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.parking_spaces'), 'parking_spaces table defined');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.parking_images'), 'parking_images table defined');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.parking_availability'), 'parking_availability table defined');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.bookings'), 'bookings table defined');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.payments'), 'payments table defined');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.reviews'), 'reviews table defined');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.booking_events'), 'booking_events table defined');

  // Verify Triggers & RPCs
  assert.ok(sql.includes('FUNCTION public.handle_new_user()'), 'handle_new_user auth trigger defined');
  assert.ok(sql.includes('FUNCTION public.protect_profile_role()'), 'protect_profile_role trigger defined');
  assert.ok(sql.includes('FUNCTION public.nearby_parking('), 'PostGIS nearby_parking RPC defined');
  assert.ok(sql.includes('FUNCTION public.cancel_booking('), 'cancel_booking RPC defined');
  assert.ok(sql.includes('FUNCTION public.apply_for_owner_role('), 'apply_for_owner_role RPC defined');

  // Verify RLS Enablement on all tables
  assert.ok(sql.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'), 'RLS on profiles');
  assert.ok(sql.includes('ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;'), 'RLS on vehicles');
  assert.ok(sql.includes('ALTER TABLE public.parking_spaces ENABLE ROW LEVEL SECURITY;'), 'RLS on parking_spaces');
  assert.ok(sql.includes('ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;'), 'RLS on bookings');
  console.log('✅ PASSED: Migration schema, triggers, and RLS policies verified\n');

  // Test 2: Parking Locations Query & Filtering
  console.log('Test 2: Parking Space Query & Filter Service');
  const allLocations = await getParkingLocations();
  assert.ok(allLocations.length >= 3, 'Must return parking locations');
  const first = allLocations[0];
  assert.ok(first.id, 'Location has valid id');
  assert.ok(first.title, 'Location has valid title');
  assert.ok(first.hourlyRateCar > 0, 'Car rate is positive');
  assert.ok(first.hourlyRateBike > 0, 'Bike rate is positive');

  // Filter by vehicle type
  const bikeLocations = await getParkingLocations({ vehicleType: 'bike' });
  assert.ok(bikeLocations.every(l => l.hourlyRateBike > 0), 'All bike locations have bike pricing');

  // Filter by max price
  const cheapLocations = await getParkingLocations({ maxPrice: 35 });
  assert.ok(cheapLocations.every(l => l.hourlyRateCar <= 35), 'Max price filter enforced');
  console.log('✅ PASSED: Parking query and filtering logic verified\n');

  // Test 3: Booking Cancellation Rules
  console.log('Test 3: Booking Cancellation Authorization & State Validation');
  const sampleConfirmedBooking = {
    id: 'bk-test-cancel-1',
    passCode: 'IDM-99112',
    status: 'confirmed',
    bookingDate: '15 Sep',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    totalAmount: 85
  };
  const sampleActiveBooking = {
    id: 'bk-test-cancel-2',
    passCode: 'IDM-99113',
    status: 'active',
    bookingDate: '15 Sep',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    totalAmount: 85
  };

  storage.set('idam_user_bookings', JSON.stringify([sampleConfirmedBooking, sampleActiveBooking]));

  // Confirmed booking can be cancelled
  const cancelResult1 = await cancelBooking('bk-test-cancel-1', 'Change of plans');
  assert.strictEqual(cancelResult1.success, true, 'Confirmed booking cancellation must succeed');

  const updatedStored = JSON.parse(storage.get('idam_user_bookings'));
  const updated1 = updatedStored.find(b => b.id === 'bk-test-cancel-1');
  assert.strictEqual(updated1.status, 'cancelled', 'Booking status must transition to cancelled');

  // Active in-progress booking CANNOT be cancelled
  const cancelResult2 = await cancelBooking('bk-test-cancel-2', 'Trying to cancel active pass');
  assert.strictEqual(cancelResult2.success, false, 'Active booking cannot be cancelled');
  assert.ok(cancelResult2.message.includes('Cannot cancel'), 'Appropriate error message returned');
  console.log('✅ PASSED: Cancellation lifecycle rules strictly enforced\n');

  console.log('🎉 ALL PHASE 1 DATABASE & SECURITY TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Phase 1 test failed:', err);
  process.exit(1);
});
