import { execSync } from 'child_process';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { checkHasPostgis, getPostgisBootstrapSql, prepareMigrationSql } from './test_db_helper.mjs';

console.log('=== PHASE 5: AUTOMATED QR PASSES & OPERATIONS VERIFICATION ===\n');

const testSchema = `qr_ops_test_${Date.now()}`;
const hasPostgis = checkHasPostgis();

function execute(sql) {
  const fullSql = `SET search_path TO ${testSchema}, public;\n${sql}`;
  return execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: fullSql, stdio: ['pipe', 'pipe', 'pipe'] }).toString();
}

function queryJson(sql) {
  const cleanSql = sql.trim().replace(/;+$/, '');
  const jsonSql = `SET search_path TO ${testSchema}, public;\nSELECT json_agg(t) FROM (${cleanSql}) t;`;
  const res = execSync(`psql -d myapp -t -A -v ON_ERROR_STOP=1`, { input: jsonSql, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
  if (!res || res === '') return [];
  const lines = res.split('\n').filter(l => !l.startsWith('WARNING:') && !l.startsWith('NOTICE:'));
  const validJson = lines.find(l => l.startsWith('[') || l.startsWith('{'));
  return validJson ? JSON.parse(validJson) : [];
}

try {
  // 1. Setup isolated test schema
  console.log(`1. Creating isolated test schema: ${testSchema}`);
  execSync(`psql -d myapp -c "CREATE SCHEMA ${testSchema};"`);

  execute(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY,
      email TEXT,
      raw_user_meta_data JSONB DEFAULT '{}'::jsonb
    );

    CREATE TABLE IF NOT EXISTS ${testSchema}._current_test_session (
      user_id UUID,
      role TEXT
    );
    INSERT INTO ${testSchema}._current_test_session (user_id, role) VALUES (NULL, 'anon');

    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
      SELECT user_id FROM ${testSchema}._current_test_session LIMIT 1;
    $$ LANGUAGE sql STABLE;

    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB AS $$
      SELECT jsonb_build_object('role', COALESCE(role, 'anon')) FROM ${testSchema}._current_test_session LIMIT 1;
    $$ LANGUAGE sql STABLE;

    ${getPostgisBootstrapSql()}
  `);

  function setSession(userId, role = 'authenticated') {
    execute(`
      UPDATE _current_test_session 
      SET user_id = ${userId ? `'${userId}'::uuid` : 'NULL'}, 
          role = '${role}';
    `);
  }

  // 2. Apply migrations in order
  const migrationsDir = path.resolve('supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  console.log(`2. Applying migrations (${migrationFiles.length} files) to ${testSchema}...`);
  for (const file of migrationFiles) {
    let rawSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    let sql = prepareMigrationSql(rawSql, testSchema, hasPostgis);
    const fullSql = `SET search_path TO ${testSchema}, public;\n${sql}`;
    execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: fullSql, stdio: ['pipe', 'pipe', 'pipe'] });
  }
  console.log('   All migrations applied cleanly.\n');

  // 3. Seed test entities
  const driverId  = '11111111-1111-1111-1111-111111111111';
  const ownerAId  = '22222222-2222-2222-2222-222222222222';
  const ownerBId  = '33333333-3333-3333-3333-333333333333';
  const spaceAId  = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const spaceBId  = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  execute(`
    INSERT INTO auth.users (id, email) VALUES
      ('${driverId}', 'driver@idam.test'),
      ('${ownerAId}', 'ownera@idam.test'),
      ('${ownerBId}', 'ownerb@idam.test')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO ${testSchema}.profiles (id, email, full_name, role) VALUES
      ('${driverId}', 'driver@idam.test', 'Driver Dave', 'driver'),
      ('${ownerAId}', 'ownera@idam.test', 'Owner Alice', 'owner'),
      ('${ownerBId}', 'ownerb@idam.test', 'Owner Bob', 'owner')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO ${testSchema}.parking_spaces (
      id, owner_id, title, address, latitude, longitude, price_per_hour_car, price_per_hour_bike, car_capacity, bike_capacity, status
    ) VALUES 
      ('${spaceAId}', '${ownerAId}', 'Temple West Lot', 'West Gate', 9.92, 78.12, 40.00, 20.00, 10, 5, 'active'),
      ('${spaceBId}', '${ownerBId}', 'East Chithirai Spot', 'East Gate', 9.92, 78.13, 50.00, 25.00, 5, 5, 'active')
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log('3. Running Test Suites:\n');

  // Setup sample pass tokens
  const rawToken1 = crypto.randomBytes(16).toString('hex');
  const tokenHash1 = crypto.createHash('sha256').update(rawToken1).digest('hex');
  const passCode1 = 'IDM-88801';
  const paymentRef1 = 'pay_test_pass_1';

  // Driver creates verified booking for Space A
  setSession(driverId, 'authenticated');
  const bookRes1 = queryJson(`
    SELECT ${testSchema}.create_verified_booking(
      '${spaceAId}'::UUID,
      'car',
      NOW(),
      2,
      'TN 59 AB 1234',
      'Driver Dave',
      '9876543210',
      ARRAY[]::TEXT[],
      '${tokenHash1}',
      '${passCode1}',
      '${paymentRef1}'
    ) as result;
  `);
  assert(bookRes1.length > 0 && bookRes1[0].result.success === true);
  const booking1Id = bookRes1[0].result.booking_id;

  // TEST 1: Owner A validates pass for Space A successfully
  console.log('Test 1: Owner A validates pass for Space A successfully...');
  setSession(ownerAId, 'authenticated');
  const verifyRes1 = queryJson(`
    SELECT ${testSchema}.verify_parking_pass(
      '${tokenHash1}',
      '${passCode1}',
      '${spaceAId}'::UUID
    ) as result;
  `);
  assert(verifyRes1.length > 0 && verifyRes1[0].result.is_valid === true, 'Verification should be valid');
  assert.strictEqual(verifyRes1[0].result.code, 'VALID');
  assert.strictEqual(verifyRes1[0].result.booking.id, booking1Id);
  console.log('  PASSED: Valid QR pass verified by space owner.\n');

  // TEST 2: Owner B attempts to verify Space A pass at Space B -> WRONG_LOCATION
  console.log('Test 2: Owner B verifies Space A pass at Space B -> WRONG_LOCATION...');
  setSession(ownerBId, 'authenticated');
  const verifyRes2 = queryJson(`
    SELECT ${testSchema}.verify_parking_pass(
      '${tokenHash1}',
      '${passCode1}',
      '${spaceBId}'::UUID
    ) as result;
  `);
  assert(verifyRes2.length > 0 && verifyRes2[0].result.is_valid === false);
  assert.strictEqual(verifyRes2[0].result.code, 'WRONG_LOCATION');
  console.log('  PASSED: Pass scanned at wrong location rejected.\n');

  // TEST 3: Unauthenticated caller attempts to verify pass -> UNAUTHENTICATED
  console.log('Test 3: Unauthenticated caller cannot verify passes...');
  setSession(null, 'anon');
  const unauthVerifyRes = queryJson(`
    SELECT ${testSchema}.verify_parking_pass(
      '${tokenHash1}',
      '${passCode1}',
      '${spaceAId}'::UUID
    ) as result;
  `);
  assert(unauthVerifyRes.length > 0 && unauthVerifyRes[0].result.is_valid === false);
  assert.strictEqual(unauthVerifyRes[0].result.code, 'UNAUTHENTICATED');
  console.log('  PASSED: Unauthenticated caller rejected.\n');

  // TEST 4: Token Hash Spoofing Rejection in Check-In
  console.log('Test 4: Check-in with forged token hash is rejected...');
  setSession(ownerAId, 'authenticated');
  const forgedHash = 'forged_hash_00000000000000000000000000000000000000000000000000000000';
  const forgedCheckInRes = queryJson(`
    SELECT ${testSchema}.confirm_booking_check_in(
      '${booking1Id}'::UUID,
      '${forgedHash}',
      '${passCode1}'
    ) as result;
  `);
  assert(forgedCheckInRes.length > 0 && forgedCheckInRes[0].result.success === false);
  assert.strictEqual(forgedCheckInRes[0].result.code, 'INVALID_TOKEN');
  console.log('  PASSED: Check-in with spoofed token hash rejected.\n');

  // TEST 5: Owner A confirms valid check-in
  console.log('Test 5: Owner A confirms check-in transition (confirmed -> active)...');
  const checkInRes = queryJson(`
    SELECT ${testSchema}.confirm_booking_check_in(
      '${booking1Id}'::UUID,
      '${tokenHash1}',
      '${passCode1}'
    ) as result;
  `);
  assert(checkInRes.length > 0 && checkInRes[0].result.success === true);
  assert(checkInRes[0].result.check_in_at !== undefined);

  const activeBooking = queryJson(`SELECT * FROM ${testSchema}.bookings WHERE id = '${booking1Id}';`);
  assert.strictEqual(activeBooking[0].booking_status, 'active');
  assert.strictEqual(activeBooking[0].checked_in_by, ownerAId);
  console.log('  PASSED: Booking state transitioned to active.\n');

  // TEST 6: Double check-in blocked
  console.log('Test 6: Double check-in attempt returns already_active...');
  const doubleCheckInRes = queryJson(`
    SELECT ${testSchema}.confirm_booking_check_in(
      '${booking1Id}'::UUID,
      '${tokenHash1}',
      '${passCode1}'
    ) as result;
  `);
  assert(doubleCheckInRes.length > 0 && doubleCheckInRes[0].result.already_active === true);
  console.log('  PASSED: Double check-in safely handled without state corruption.\n');

  // TEST 7: Scanning an already-active pass -> ALREADY_ACTIVE
  console.log('Test 7: verify_parking_pass on already-active pass -> ALREADY_ACTIVE...');
  const verifyActiveRes = queryJson(`
    SELECT ${testSchema}.verify_parking_pass(
      '${tokenHash1}',
      '${passCode1}',
      '${spaceAId}'::UUID
    ) as result;
  `);
  assert(verifyActiveRes.length > 0 && verifyActiveRes[0].result.is_valid === false);
  assert.strictEqual(verifyActiveRes[0].result.code, 'ALREADY_ACTIVE');
  console.log('  PASSED: Active pass scan indicates already active.\n');

  // TEST 8: Check-in on unpaid booking is rejected -> UNPAID
  console.log('Test 8: Check-in on unpaid booking is rejected with UNPAID...');
  setSession(driverId, 'authenticated');
  const unpaidToken = crypto.randomBytes(16).toString('hex');
  const unpaidHash = crypto.createHash('sha256').update(unpaidToken).digest('hex');
  const unpaidBookRes = queryJson(`
    SELECT ${testSchema}.create_verified_booking(
      '${spaceAId}'::UUID,
      'car',
      NOW(),
      2,
      'TN 59 UNPAID 1',
      'Driver Dave',
      '9876543210',
      ARRAY[]::TEXT[],
      '${unpaidHash}',
      'IDM-UNPAID-01',
      NULL
    ) as result;
  `);
  const unpaidBookingId = unpaidBookRes[0].result.booking_id;

  setSession(ownerAId, 'authenticated');
  const unpaidVerifyRes = queryJson(`
    SELECT ${testSchema}.verify_parking_pass(
      '${unpaidHash}',
      'IDM-UNPAID-01',
      '${spaceAId}'::UUID
    ) as result;
  `);
  assert(unpaidVerifyRes.length > 0 && unpaidVerifyRes[0].result.is_valid === false);
  assert.strictEqual(unpaidVerifyRes[0].result.code, 'UNPAID');

  const unpaidCheckInRes = queryJson(`
    SELECT ${testSchema}.confirm_booking_check_in(
      '${unpaidBookingId}'::UUID,
      '${unpaidHash}',
      'IDM-UNPAID-01'
    ) as result;
  `);
  assert(unpaidCheckInRes.length > 0 && unpaidCheckInRes[0].result.success === false);
  assert.strictEqual(unpaidCheckInRes[0].result.code, 'UNPAID');
  console.log('  PASSED: Unpaid pass scan and check-in blocked.\n');

  // TEST 9: Owner A confirms check-out transition (active -> completed)
  console.log('Test 9: Owner A confirms check-out transition (active -> completed)...');
  const checkOutRes = queryJson(`
    SELECT ${testSchema}.confirm_booking_check_out(
      '${booking1Id}'::UUID
    ) as result;
  `);
  assert(checkOutRes.length > 0 && checkOutRes[0].result.success === true);
  assert(checkOutRes[0].result.check_out_at !== undefined);

  const completedBooking = queryJson(`SELECT * FROM ${testSchema}.bookings WHERE id = '${booking1Id}';`);
  assert.strictEqual(completedBooking[0].booking_status, 'completed');
  assert.strictEqual(completedBooking[0].checked_out_by, ownerAId);
  console.log('  PASSED: Booking state transitioned to completed.\n');

  // TEST 10: Double check-out returns already_completed
  console.log('Test 10: Double check-out returns already_completed...');
  const doubleCheckOutRes = queryJson(`
    SELECT ${testSchema}.confirm_booking_check_out(
      '${booking1Id}'::UUID
    ) as result;
  `);
  assert(doubleCheckOutRes.length > 0 && doubleCheckOutRes[0].result.already_completed === true);
  console.log('  PASSED: Double check-out safely handled.\n');

  // TEST 11: Scanning completed pass -> ALREADY_COMPLETED
  console.log('Test 11: Scanning completed pass -> ALREADY_COMPLETED...');
  const verifyCompletedRes = queryJson(`
    SELECT ${testSchema}.verify_parking_pass(
      '${tokenHash1}',
      '${passCode1}',
      '${spaceAId}'::UUID
    ) as result;
  `);
  assert(verifyCompletedRes.length > 0 && verifyCompletedRes[0].result.is_valid === false);
  assert.strictEqual(verifyCompletedRes[0].result.code, 'ALREADY_COMPLETED');
  console.log('  PASSED: Completed pass scan indicates ALREADY_COMPLETED.\n');

  console.log('================================================================');
  console.log('ALL PHASE 5 QR PASSES & OPERATIONS TESTS PASSED!');
  console.log('================================================================');

} finally {
  console.log(`\nCleaning up test schema ${testSchema}...`);
  execSync(`psql -d myapp -c "DROP SCHEMA IF EXISTS ${testSchema} CASCADE;"`, { stdio: 'inherit' });
}
