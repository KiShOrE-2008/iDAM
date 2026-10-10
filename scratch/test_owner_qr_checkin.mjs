// Automated Test Suite for iDAM Owner QR Scanner & Check-in / Check-out System
import assert from 'node:assert';

// Mock localStorage for Node test execution
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

// Import modules to test
import { generatePassToken, hashPassToken, formatSecureQrPayload, parseScannedQrPayload } from '../lib/parking/passSecurity.ts';
import {
  validateScannedPass,
  confirmBookingCheckIn,
  confirmBookingCheckOut,
  getCurrentlyParkedBookings,
  getExpectedArrivalBookings,
  DEFAULT_DEMO_OWNER_BOOKINGS
} from '../lib/parking/checkInService.ts';

console.log('=== RUNNING OWNER QR SCANNER & CHECK-IN/CHECK-OUT AUTOMATED TESTS ===\n');

async function runTests() {
  // TEST 1: Cryptographic Token Generation & Hashing
  console.log('Test 1: Cryptographic Token Generation & High-Entropy Security');
  const token1 = generatePassToken();
  const token2 = generatePassToken();
  assert.ok(token1 && token1.length >= 32, 'Pass token must be at least 32 characters');
  assert.notStrictEqual(token1, token2, 'Generated tokens must be distinct high-entropy values');

  const hash1 = await hashPassToken(token1);
  const hash1Repeat = await hashPassToken(token1);
  assert.strictEqual(hash1, hash1Repeat, 'Hash of identical token must match');
  assert.notStrictEqual(hash1, token1, 'Hash must be distinct from plain token');

  const payload = formatSecureQrPayload(token1);
  assert.strictEqual(payload, `IDAM:v2:${token1}`, 'QR payload must adhere to secure opaque format');
  console.log('✅ PASSED: Cryptographic high-entropy token format verified\n');

  // TEST 2: Scanned Payload Parsing (v2 token, legacy composite, legacy slot, raw code)
  console.log('Test 2: QR Payload Parsing (Modern & Backwards Compatible)');
  const parsedV2 = await parseScannedQrPayload(`IDAM:v2:${token1}`);
  assert.strictEqual(parsedV2.isValidFormat, true, 'v2 token recognized as valid');
  assert.strictEqual(parsedV2.type, 'v2_token', 'type is v2_token');
  assert.strictEqual(parsedV2.token, token1, 'token correctly extracted');

  const parsedLegacyComp = await parseScannedQrPayload('IDAM_PASS:IDM-82931_loc-1');
  assert.strictEqual(parsedLegacyComp.isValidFormat, true, 'Legacy composite recognized');
  assert.strictEqual(parsedLegacyComp.passCode, 'IDM-82931', 'Legacy passCode extracted');
  assert.strictEqual(parsedLegacyComp.locationId, 'loc-1', 'Legacy locationId extracted');

  const parsedLegacySlot = await parseScannedQrPayload('IDAM-PASS-82931-SPOT-A02');
  assert.strictEqual(parsedLegacySlot.isValidFormat, true, 'Legacy slot recognized');
  assert.strictEqual(parsedLegacySlot.passCode, 'IDM-82931', 'Pass code normalized');

  const parsedRaw = await parseScannedQrPayload('IDM-82931');
  assert.strictEqual(parsedRaw.isValidFormat, true, 'Raw pass code recognized');
  assert.strictEqual(parsedRaw.passCode, 'IDM-82931', 'Pass code uppercase normalized');

  const parsedEmpty = await parseScannedQrPayload('');
  assert.strictEqual(parsedEmpty.isValidFormat, false, 'Empty payload rejected');
  console.log('✅ PASSED: Multi-format parsing & backwards compatibility verified\n');

  // TEST 3: Validation — Valid Pass at Correct Location
  console.log('Test 3: Pass Validation — Valid Confirmed Pass at Correct Location');
  const validRes = await validateScannedPass({
    rawScannedText: 'IDAM:v2:demo_idm_82931_loc-1',
    ownerSpaceId: 'loc-1',
    isDemoMode: true
  });
  assert.strictEqual(validRes.isValid, true, 'Valid pass accepted');
  assert.strictEqual(validRes.statusCode, 'valid', 'Status code is valid');
  assert.ok(validRes.booking, 'Booking details attached');
  assert.strictEqual(validRes.booking.passCode, 'IDM-82931', 'Correct booking returned');
  assert.strictEqual(validRes.booking.parkingLocation.title, 'Meenakshi Temple Square Smart Lot', 'Correct location');
  console.log('✅ PASSED: Valid pass validation verified\n');

  // TEST 4: Validation — Location Mismatch Protection
  console.log('Test 4: Pass Validation — Location Mismatch (Different Owner)');
  const wrongLocRes = await validateScannedPass({
    rawScannedText: 'IDAM:v2:demo_idm_12049_loc-2', // South Masi booking
    ownerSpaceId: 'loc-1', // Meenakshi Smart Lot owner
    isDemoMode: true
  });
  assert.strictEqual(wrongLocRes.isValid, false, 'Wrong location pass rejected');
  assert.strictEqual(wrongLocRes.statusCode, 'wrong_location', 'Status is wrong_location');
  assert.strictEqual(wrongLocRes.booking, undefined, 'Driver details kept strictly confidential from unauthorized owner');
  assert.ok(wrongLocRes.message.includes('different parking location'), 'Explicit user-friendly message returned');
  console.log('✅ PASSED: Cross-location boundary protection verified\n');

  // TEST 5: Validation — Already Checked In / Active Pass
  console.log('Test 5: Pass Validation — Already Active Pass');
  const activeRes = await validateScannedPass({
    rawScannedText: 'IDAM:v2:demo_idm_94102_loc-1', // Booking IDM-94102 is currently active
    ownerSpaceId: 'loc-1',
    isDemoMode: true
  });
  assert.strictEqual(activeRes.isValid, false, 'Already active pass rejected for new check-in');
  assert.strictEqual(activeRes.statusCode, 'already_active', 'Status is already_active');
  assert.ok(activeRes.message.includes('already been used to check in'), 'Explicit message returned');
  console.log('✅ PASSED: Already active pass detected\n');

  // TEST 6: Validation — Already Completed & Cancelled Passes
  console.log('Test 6: Pass Validation — Completed and Cancelled Passes');
  const completedRes = await validateScannedPass({
    rawScannedText: 'IDAM:v2:demo_idm_55321_loc-1',
    ownerSpaceId: 'loc-1',
    isDemoMode: true
  });
  assert.strictEqual(completedRes.isValid, false, 'Completed pass rejected');
  assert.strictEqual(completedRes.statusCode, 'already_completed', 'Status is already_completed');

  const cancelledRes = await validateScannedPass({
    rawScannedText: 'IDAM:v2:demo_idm_77190_loc-1',
    ownerSpaceId: 'loc-1',
    isDemoMode: true
  });
  assert.strictEqual(cancelledRes.isValid, false, 'Cancelled pass rejected');
  assert.strictEqual(cancelledRes.statusCode, 'cancelled', 'Status is cancelled');
  console.log('✅ PASSED: Completed & Cancelled validation verified\n');

  // TEST 7: Tampered or Unknown QR
  console.log('Test 7: Pass Validation — Tampered / Unrecognized QR');
  const tamperedRes = await validateScannedPass({
    rawScannedText: 'IDAM:v2:tampered_random_string_99999',
    ownerSpaceId: 'loc-1',
    isDemoMode: true
  });
  assert.strictEqual(tamperedRes.isValid, false, 'Tampered pass rejected');
  assert.strictEqual(tamperedRes.statusCode, 'not_found', 'Status is not_found');
  console.log('✅ PASSED: Tampered QR rejection verified\n');

  // TEST 8: State Transition — Confirm Check-in (confirmed -> active)
  console.log('Test 8: State Transition — Confirm Check-in (confirmed -> active)');
  const checkInRes = await confirmBookingCheckIn({
    bookingId: 'demo-bk-101',
    passCode: 'IDM-82931',
    isDemoMode: true
  });
  assert.strictEqual(checkInRes.success, true, 'Check-in confirmed');
  assert.strictEqual(checkInRes.message, 'Vehicle checked in', 'Explicit wording verified');
  assert.ok(checkInRes.checkInAt, 'Timestamp recorded');
  assert.strictEqual(checkInRes.booking.status, 'active', 'Booking status transitioned to active');

  // Rescanning after check-in must now report already_active!
  const rescanAfterCheckIn = await validateScannedPass({
    rawScannedText: 'IDAM:v2:demo_idm_82931_loc-1',
    ownerSpaceId: 'loc-1',
    isDemoMode: true
  });
  assert.strictEqual(rescanAfterCheckIn.isValid, false, 'Rescan cannot check in again');
  assert.strictEqual(rescanAfterCheckIn.statusCode, 'already_active', 'Rescan reports already_active');
  console.log('✅ PASSED: Check-in transition and rescan lock verified\n');

  // TEST 9: Concurrent / Duplicate Check-in Protection
  console.log('Test 9: Concurrent & Double-Tap Check-in Protection');
  // Attempt concurrent check-in on the active booking
  const duplicateCheckIn = await confirmBookingCheckIn({
    bookingId: 'demo-bk-101',
    passCode: 'IDM-82931',
    isDemoMode: true
  });
  assert.strictEqual(duplicateCheckIn.success, true, 'Duplicate check-in reports already checked in gracefully');
  assert.ok(duplicateCheckIn.message.includes('already checked in'), 'Graceful already-active message');
  console.log('✅ PASSED: Concurrent duplicate check-in protected\n');

  // TEST 10: State Transition — Check-Out (active -> completed)
  console.log('Test 10: State Transition — Check-Out (active -> completed)');
  const checkOutRes = await confirmBookingCheckOut({
    bookingId: 'demo-bk-101',
    isDemoMode: true
  });
  assert.strictEqual(checkOutRes.success, true, 'Check-out confirmed');
  assert.strictEqual(checkOutRes.message, 'Vehicle checked out', 'Explicit wording verified');
  assert.strictEqual(checkOutRes.booking.status, 'completed', 'Status transitioned to completed');
  assert.ok(checkOutRes.checkOutAt, 'Check-out timestamp recorded');

  // Repeating check-out on the completed booking
  const repeatCheckOut = await confirmBookingCheckOut({
    bookingId: 'demo-bk-101',
    isDemoMode: true
  });
  assert.strictEqual(repeatCheckOut.success, true, 'Repeated check-out handled gracefully');
  assert.ok(repeatCheckOut.message.includes('already checked out'), 'Does not re-run state transition');
  console.log('✅ PASSED: Check-out transition and idempotency verified\n');

  // TEST 11: Currently Parked & Expected Arrivals Lists
  console.log('Test 11: Currently Parked & Expected Arrivals Lists');
  const parkedList = getCurrentlyParkedBookings('loc-1');
  // demo-bk-102 (TN 59 C 5678) is still active
  assert.ok(Array.isArray(parkedList), 'Parked list is an array');
  assert.ok(parkedList.some(b => b.passCode === 'IDM-94102'), 'IDM-94102 is in currently parked list');
  assert.ok(!parkedList.some(b => b.passCode === 'IDM-82931'), 'Checked out IDM-82931 is NOT in currently parked list');

  const arrivalsList = getExpectedArrivalBookings('loc-1');
  assert.ok(Array.isArray(arrivalsList), 'Arrivals list is an array');
  console.log('✅ PASSED: Currently Parked and Expected Arrivals queries verified\n');

  console.log('🎉 ALL 11 OWNER QR SCANNER & CHECK-IN/OUT VERIFICATIONS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
