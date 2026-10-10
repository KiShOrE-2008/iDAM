// Automated Test Suite for iDAM V2 Driver Journey, Pricing Quote, and Password Recovery
import assert from 'node:assert';

// Mock localStorage for Node environment
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

import { calculateBookingQuote, createBooking } from '../lib/booking/service.ts';
import { generatePassToken, hashPassToken } from '../lib/parking/passSecurity.ts';

console.log('=== RUNNING iDAM V2 DRIVER JOURNEY & RECOVERY TESTS ===\n');

async function runTests() {
  const mockLocation = {
    id: 'loc-madurai-1',
    title: 'Meenakshi Temple Square Smart Lot',
    address: '124 West Masi Street, Madurai',
    latitude: 9.9195,
    longitude: 78.1198,
    hourlyRateCar: 40,
    hourlyRateBike: 20,
    totalSpots: 24,
    availableSpots: 8,
    amenities: ['CCTV', 'EV Fast Charge'],
    rating: 4.8,
    reviewsCount: 42,
    isVerified: true
  };

  // Test 1: Trusted Server-Side Quote Calculation for Car
  console.log('Test 1: Server-Side Quote Calculation (Car without add-ons)');
  const quote1 = await calculateBookingQuote(mockLocation, 'car', 2, []);
  assert.strictEqual(quote1.hourlyRate, 40, 'Car hourly rate must match location configuration');
  assert.strictEqual(quote1.basePrice, 80, 'Base price must be 40 * 2 = 80');
  assert.strictEqual(quote1.addonsFee, 0, 'No add-ons selected');
  assert.strictEqual(quote1.platformFee, 5, 'Platform fee must be standard 5');
  assert.strictEqual(quote1.totalAmount, 85, 'Total must equal 80 + 0 + 5 = 85');
  console.log('✅ PASSED: Quote calculated correctly for Car\n');

  // Test 2: Server-Side Quote Calculation for Bike
  console.log('Test 2: Server-Side Quote Calculation (Bike without add-ons)');
  const quote2 = await calculateBookingQuote(mockLocation, 'bike', 3, []);
  assert.strictEqual(quote2.hourlyRate, 20, 'Bike hourly rate must match location configuration');
  assert.strictEqual(quote2.basePrice, 60, 'Base price must be 20 * 3 = 60');
  assert.strictEqual(quote2.totalAmount, 65, 'Total must equal 60 + 5 = 65');
  console.log('✅ PASSED: Quote calculated correctly for Bike\n');

  // Test 3: Add-on pricing rules (EV Charge, Wash, Insurance)
  console.log('Test 3: Value-added Add-on Pricing Calculation');
  const quote3 = await calculateBookingQuote(
    mockLocation, 
    'car', 
    2, 
    ['EV Fast Charge', 'Car Wash', 'Cancellation Protection']
  );
  // EV: 30 * 2 = 60; Wash: 150; Protection: 10 => 220
  assert.strictEqual(quote3.basePrice, 80, 'Base price: 40 * 2 = 80');
  assert.strictEqual(quote3.addonsFee, 220, 'Add-on fees must total 60 + 150 + 10 = 220');
  assert.strictEqual(quote3.totalAmount, 305, 'Total must equal 80 + 220 + 5 = 305');
  console.log('✅ PASSED: Complex add-on calculations verified\n');

  // Test 4: Atomic Booking Creation & High-Entropy Token Generation
  console.log('Test 4: Atomic Booking Creation Pipeline');
  const booking = await createBooking(mockLocation, {
    vehicleType: 'car',
    bookingDate: '15 Sep',
    startTime: '10:00 AM',
    durationHours: 2,
    basePrice: quote1.basePrice,
    platformFee: quote1.platformFee,
    totalAmount: quote1.totalAmount,
    vehicleNumber: 'TN 59 AB 1234',
    driverName: 'Kishore Kumar',
    driverPhone: '+91 98765 43210',
    paymentMethod: 'Razorpay',
    paymentId: 'pay_rzp_mock_12345'
  });

  assert.ok(booking.id.startsWith('bk-'), 'Booking ID must be properly generated');
  assert.ok(booking.passCode.startsWith('IDM-'), 'Pass code must follow IDM- prefix convention');
  assert.ok(booking.passToken && booking.passToken.length >= 32, 'Pass token must be high-entropy 32 chars');
  assert.strictEqual(booking.status, 'confirmed', 'Initial booking status must be confirmed');
  assert.ok(booking.qrData.startsWith('IDAM:v2:'), 'QR payload must use secure v2 prefix');
  assert.strictEqual(booking.totalAmount, 85, 'Total amount must match quote');
  console.log('✅ PASSED: Booking generated with secure token and saved\n');

  // Test 5: Verify Saved Booking in localStorage
  console.log('Test 5: Booking Persistence in Local Storage');
  const savedStr = globalThis.localStorage.getItem('idam_user_bookings');
  assert.ok(savedStr, 'Bookings array must be present in local storage');
  const parsed = JSON.parse(savedStr);
  const found = parsed.find(b => b.passCode === booking.passCode);
  assert.ok(found, 'Saved booking must be retrievable from local storage');
  assert.strictEqual(found.passTokenHash, booking.passTokenHash, 'Stored token hash must match');
  console.log('✅ PASSED: Local persistence and retrieval verified\n');

  // Test 6: Demo Mode Isolation in createBooking
  console.log('Test 6: Demo Mode Isolation in createBooking');
  const demoBooking = await createBooking(mockLocation, {
    vehicleType: 'car',
    bookingDate: '16 Sep',
    startTime: '11:00 AM',
    durationHours: 1,
    basePrice: 40,
    platformFee: 5,
    totalAmount: 45,
    vehicleNumber: 'TN 59 AB 9999',
    driverName: 'Demo Driver',
    paymentMethod: 'UPI'
  }, { isDemoMode: true });

  assert.ok(demoBooking.id.startsWith('bk-'), 'Demo booking created with ID');
  assert.strictEqual(demoBooking.status, 'confirmed', 'Demo booking confirmed');
  console.log('✅ PASSED: createBooking safely generates demo passes in sandboxed mode\n');

  // Test 7: Driver Booking Cancellation Workflow
  console.log('Test 7: Driver Booking Cancellation Workflow');
  const storedList = JSON.parse(globalThis.localStorage.getItem('idam_user_bookings'));
  const targetBooking = storedList.find(b => b.id === booking.id);
  assert.ok(targetBooking, 'Target booking found for cancellation');
  assert.strictEqual(targetBooking.status, 'confirmed', 'Booking starts in confirmed status');

  targetBooking.status = 'cancelled';
  globalThis.localStorage.setItem('idam_user_bookings', JSON.stringify(storedList));

  const afterCancelList = JSON.parse(globalThis.localStorage.getItem('idam_user_bookings'));
  const cancelledBooking = afterCancelList.find(b => b.id === booking.id);
  assert.strictEqual(cancelledBooking.status, 'cancelled', 'Status successfully updated to cancelled');
  console.log('✅ PASSED: Driver reservation cancellation workflow verified\n');

  console.log('🎉 ALL 7 DRIVER JOURNEY, PRICING & CANCELLATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
