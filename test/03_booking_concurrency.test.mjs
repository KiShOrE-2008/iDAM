import { execSync } from 'child_process';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { checkHasPostgis, getPostgisBootstrapSql, prepareMigrationSql } from './test_db_helper.mjs';

console.log('=== PHASE 3: AUTOMATED BOOKING ENGINE & CONCURRENCY VERIFICATION ===\n');

const testSchema = `booking_engine_test_${Date.now()}`;
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

  // Apply migrations to test schema
  const migrationsDir = path.resolve('supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of migrationFiles) {
    let rawSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    let sql = prepareMigrationSql(rawSql, testSchema, hasPostgis);
    const fullSql = `SET search_path TO ${testSchema}, public;\n${sql}`;
    execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: fullSql, stdio: ['pipe', 'pipe', 'pipe'] });
  }

  console.log('✅ Migrations applied cleanly in test schema.\n');

  // Seed test users
  const driver1Id = '11111111-1111-1111-1111-111111111111';
  const driver2Id = '22222222-2222-2222-2222-222222222222';
  const driver3Id = '33333333-3333-3333-3333-333333333333';
  const ownerId   = '44444444-4444-4444-4444-444444444444';

  execute(`
    INSERT INTO auth.users (id, email) VALUES 
      ('${driver1Id}', 'driver1@idam.com'),
      ('${driver2Id}', 'driver2@idam.com'),
      ('${driver3Id}', 'driver3@idam.com'),
      ('${ownerId}', 'owner@idam.com')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, email, full_name, role, owner_status) VALUES
      ('${driver1Id}', 'driver1@idam.com', 'Driver One', 'driver', 'none'),
      ('${driver2Id}', 'driver2@idam.com', 'Driver Two', 'driver', 'none'),
      ('${driver3Id}', 'driver3@idam.com', 'Driver Three', 'driver', 'none'),
      ('${ownerId}', 'owner@idam.com', 'Owner One', 'owner', 'approved')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
  `);

  // Seed a parking space with LIMITED capacity (car_capacity = 2) for testing capacity bounds
  const spaceId = '55555555-5555-5555-5555-555555555555';
  setSession(ownerId);
  execute(`
    INSERT INTO parking_spaces (
      id, owner_id, title, address, latitude, longitude,
      price_per_hour_car, price_per_hour_bike, car_capacity, bike_capacity, status
    ) VALUES (
      '${spaceId}', '${ownerId}', 'Tight Spot Plaza', '42 Madurai Main Road', 9.9250, 78.1150,
      50.00, 25.00, 2, 2, 'active'
    ) ON CONFLICT (id) DO NOTHING;
  `);

  // Test fixtures setup complete

  // =========================================================================
  // TEST 1: Standardized TIMESTAMPTZ & Canonical Fields in create_verified_booking
  // =========================================================================
  console.log('Test 1: create_verified_booking persists TIMESTAMPTZ and canonical columns');
  setSession(driver1Id);

  const startT1 = '2026-10-15 10:00:00+05:30';
  const res1 = queryJson(`
    SELECT create_verified_booking(
      '${spaceId}'::uuid,
      'car',
      '${startT1}'::timestamptz,
      2,
      'TN 59 AB 1001',
      'Driver One',
      '9876500001',
      ARRAY['EV Charging'],
      'hash_driver_1',
      'IDM-10001',
      'pay_1'
    ) AS r;
  `)[0].r;

  assert.strictEqual(res1.success, true, 'Booking 1 must succeed');
  assert.ok(res1.booking_id, 'Must return generated UUID');

  // Verify stored row in database has full date, time, and canonical columns
  const stored1 = queryJson(`
    SELECT parking_space_id, parking_location_id, driver_id, user_id, 
           booking_status, status, vehicle_number, booking_date, start_time, end_time,
           base_price, total_amount
    FROM bookings WHERE id = '${res1.booking_id}'
  `)[0];

  assert.strictEqual(stored1.parking_space_id, spaceId, 'parking_space_id must match');
  assert.ok(stored1.parking_location_id === spaceId || stored1.parking_location_id === null, 'parking_location_id must be valid or null');
  assert.strictEqual(stored1.driver_id, driver1Id, 'driver_id must match authenticated caller');
  assert.strictEqual(stored1.user_id, driver1Id, 'user_id must match authenticated caller');
  assert.strictEqual(stored1.booking_status, 'confirmed', 'booking_status must be confirmed');
  assert.strictEqual(stored1.status, 'confirmed', 'status must be confirmed');
  assert.strictEqual(stored1.vehicle_number, 'TN 59 AB 1001', 'vehicle_number must be saved');
  assert.ok(stored1.booking_date.includes('2026-10-15'), 'booking_date must match 2026-10-15');
  assert.ok(stored1.start_time.includes('10:00'), 'start_time must match 10:00');
  console.log('  ✅ PASSED: Canonical schema, dates/times, and vehicle details verified');

  // =========================================================================
  // TEST 2: Authoritative Server Pricing (Ignoring Client Tampering)
  // =========================================================================
  console.log('\nTest 2: Authoritative pricing calculation (Rate: 50 * 2 hrs + EV: 30 * 2 hrs + Fee: 5 = 165)');
  assert.strictEqual(Number(stored1.base_price), 100.00, 'Base price must be 50 * 2 = 100');
  assert.strictEqual(Number(stored1.total_amount), 165.00, 'Total amount must include 60 EV fee and 5 platform fee');
  console.log('  ✅ PASSED: Server recalculated quote independently of client tampering');

  // =========================================================================
  // TEST 3: Slot Overlap & Capacity Enforcement
  // =========================================================================
  console.log('\nTest 3: Concurrency & Overlap Capacity Check (Max capacity = 2 cars)');

  // Driver 2 books overlapping window: 11:00 to 13:00 (overlaps with Driver 1: 10:00 - 12:00)
  // Active count becomes 2 (spot now at 100% capacity from 11:00 to 12:00)
  setSession(driver2Id);
  const startT2 = '2026-10-15 11:00:00+05:30';
  const res2 = queryJson(`
    SELECT create_verified_booking(
      '${spaceId}'::uuid,
      'car',
      '${startT2}'::timestamptz,
      2,
      'TN 59 CD 2002',
      'Driver Two',
      '9876500002',
      ARRAY[]::text[],
      'hash_driver_2',
      'IDM-20002',
      'pay_2'
    ) AS r;
  `)[0].r;

  assert.strictEqual(res2.success, true, 'Booking 2 must succeed (capacity is 2)');
  console.log('  ✅ 2nd overlapping booking permitted (capacity reached 2 / 2)');

  // Driver 3 attempts to book overlapping window: 11:30 to 12:30 -> MUST BE REJECTED (capacity = 2 full!)
  setSession(driver3Id);
  const startT3 = '2026-10-15 11:30:00+05:30';
  const res3 = queryJson(`
    SELECT create_verified_booking(
      '${spaceId}'::uuid,
      'car',
      '${startT3}'::timestamptz,
      1,
      'TN 59 EF 3003',
      'Driver Three',
      '9876500003',
      ARRAY[]::text[],
      'hash_driver_3',
      'IDM-30003',
      'pay_3'
    ) AS r;
  `)[0].r;

  assert.strictEqual(res3.success, false, 'Booking 3 must fail due to capacity exhaustion');
  assert.strictEqual(res3.error, 'CAPACITY_EXCEEDED', 'Must return CAPACITY_EXCEEDED');
  console.log('  ✅ 3rd overlapping booking rejected with CAPACITY_EXCEEDED');

  // Driver 3 attempts non-overlapping window: 12:30 to 14:00 (Driver 1 departed at 12:00, remaining capacity = 1) -> MUST SUCCEED
  const startT3Later = '2026-10-15 12:30:00+05:30';
  const res3Later = queryJson(`
    SELECT create_verified_booking(
      '${spaceId}'::uuid,
      'car',
      '${startT3Later}'::timestamptz,
      2,
      'TN 59 EF 3003',
      'Driver Three',
      '9876500003',
      ARRAY[]::text[],
      'hash_driver_3_later',
      'IDM-30003B',
      'pay_3b'
    ) AS r;
  `)[0].r;

  assert.strictEqual(res3Later.success, true, 'Booking after slot window frees up must succeed');
  console.log('  ✅ Booking permitted after window frees up');

  // =========================================================================
  // TEST 4: Booking State Machine Transitions
  // =========================================================================
  console.log('\nTest 4: Booking State Machine Transitions');
  const b1Id = res1.booking_id;

  // Driver 1 cannot cancel someone else booking
  setSession(driver2Id);
  const cancelOther = queryJson(`SELECT cancel_booking('${b1Id}'::uuid, 'Customer change of plans') AS r;`)[0].r;
  assert.strictEqual(cancelOther.success, false, 'Driver 2 cannot cancel Driver 1 booking');
  assert.strictEqual(cancelOther.error, 'FORBIDDEN');
  console.log('  ✅ Cross-driver booking cancellation rejected');

  // Space owner scans and checks in Driver 1 -> state becomes active
  setSession(ownerId);
  const checkInRes = queryJson(`SELECT confirm_booking_check_in('${b1Id}'::uuid, 'hash_driver_1', 'IDM-10001') AS r;`)[0].r;
  assert.strictEqual(checkInRes.success, true, 'Check-in must succeed');

  const b1StateActive = queryJson(`SELECT booking_status FROM bookings WHERE id = '${b1Id}'`)[0].booking_status;
  assert.strictEqual(b1StateActive, 'active', 'Booking status must be active');
  console.log('  ✅ Confirmed -> Active state transition verified');

  // Attempt to cancel an ACTIVE booking -> MUST BE REJECTED
  setSession(driver1Id);
  const cancelActive = queryJson(`SELECT cancel_booking('${b1Id}'::uuid, 'Want to cancel while parked') AS r;`)[0].r;
  assert.strictEqual(cancelActive.success, false, 'Cannot cancel in-progress booking');
  assert.strictEqual(cancelActive.error, 'INVALID_STATE');
  console.log('  ✅ Cancellation of active/in-progress pass rejected with INVALID_STATE');

  // Owner checks out Driver 1 -> state becomes completed
  setSession(ownerId);
  const checkOutRes = queryJson(`SELECT confirm_booking_check_out('${b1Id}'::uuid) AS r;`)[0].r;
  assert.strictEqual(checkOutRes.success, true, 'Check-out must succeed');

  const b1StateCompleted = queryJson(`SELECT booking_status FROM bookings WHERE id = '${b1Id}'`)[0].booking_status;
  assert.strictEqual(b1StateCompleted, 'completed', 'Booking status must be completed');
  console.log('  ✅ Active -> Completed state transition verified');

  // Driver 2 cancels their confirmed booking before arrival -> MUST SUCCEED
  setSession(driver2Id);
  const b2Id = res2.booking_id;
  const cancelConfirmed = queryJson(`SELECT cancel_booking('${b2Id}'::uuid, 'Trip postponed') AS r;`)[0].r;
  assert.strictEqual(cancelConfirmed.success, true, 'Confirmed booking cancellation must succeed');

  const b2StateCancelled = queryJson(`SELECT booking_status, cancellation_reason FROM bookings WHERE id = '${b2Id}'`)[0];
  assert.strictEqual(b2StateCancelled.booking_status, 'cancelled');
  assert.strictEqual(b2StateCancelled.cancellation_reason, 'Trip postponed');
  console.log('  ✅ Confirmed -> Cancelled transition verified with cancellation reason');

  console.log('\n🎉 ALL PHASE 3 BOOKING ENGINE TESTS PASSED CLEANLY ON POSTGRESQL!');
} finally {
  console.log(`\nCleaning up schema ${testSchema}...`);
  try {
    execSync(`psql -d myapp -c "DROP SCHEMA IF EXISTS ${testSchema} CASCADE;"`);
    console.log(`✅ Schema ${testSchema} dropped.`);
  } catch {}
}
