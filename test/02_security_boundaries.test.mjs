import { execSync } from 'node:child_process';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { checkHasPostgis, getPostgisBootstrapSql, prepareMigrationSql } from './test_db_helper.mjs';

console.log('=== PHASE 2: AUTOMATED SECURITY BOUNDARY VERIFICATION ===\n');

const testSchema = 'security_test_' + Date.now();
const hasPostgis = checkHasPostgis();

const isSuperuser = (() => {
  try {
    const res = execSync(`psql -d myapp -t -A -c "SELECT current_setting('is_superuser');"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    }).toString().trim();
    return res === 'on';
  } catch {
    return false;
  }
})();

// Setup schema and test accounts
const setupSql = `
  CREATE SCHEMA IF NOT EXISTS ${testSchema};
  SET search_path TO ${testSchema}, public;

  -- Mock auth schema
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Current context session variable
  CREATE TABLE IF NOT EXISTS ${testSchema}._current_test_session (
    user_id UUID,
    role TEXT DEFAULT 'authenticated'
  );

  INSERT INTO ${testSchema}._current_test_session (user_id, role) VALUES (NULL, 'anon');

  CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
    SELECT user_id FROM ${testSchema}._current_test_session LIMIT 1;
  $$ LANGUAGE sql STABLE;

  CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB AS $$
    SELECT jsonb_build_object('role', COALESCE(role, 'anon')) FROM ${testSchema}._current_test_session LIMIT 1;
  $$ LANGUAGE sql STABLE;

  DO $$
  BEGIN
    IF current_setting('is_superuser') = 'on' THEN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'test_authenticated_role') THEN
        CREATE ROLE test_authenticated_role NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
      END IF;
    END IF;
  END $$;

  ${getPostgisBootstrapSql()}
`;

let runAsTestUser = false;

function execute(sql) {
  const roleCmd = (runAsTestUser && isSuperuser) ? 'SET ROLE test_authenticated_role;\n' : '';
  const fullSql = `SET search_path TO ${testSchema}, public;\n${roleCmd}${sql}`;
  return execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: fullSql, stdio: ['pipe', 'pipe', 'pipe'], env: process.env }).toString();
}

function queryJson(sql) {
  const cleanSql = sql.trim().replace(/;+$/, '');
  const roleCmd = (runAsTestUser && isSuperuser) ? 'SET ROLE test_authenticated_role;\n' : '';
  const jsonSql = `SET search_path TO ${testSchema}, public;\n${roleCmd}SELECT json_agg(t) FROM (${cleanSql}) t;`;
  const res = execSync(`psql -d myapp -t -A -v ON_ERROR_STOP=1`, { input: jsonSql, stdio: ['pipe', 'pipe', 'pipe'], env: process.env }).toString().trim();
  if (!res || res === '') return [];
  const lines = res.split('\n').filter(l => !l.startsWith('WARNING:') && !l.startsWith('NOTICE:'));
  const validJson = lines.find(l => l.startsWith('[') || l.startsWith('{'));
  return validJson ? JSON.parse(validJson) : [];
}

function logResult(label, result) {
  console.log(`${label}:`, JSON.stringify(result, null, 2));
  return result;
}

function setSession(userId, role = 'authenticated') {
  execute(`
    UPDATE _current_test_session 
    SET user_id = ${userId ? `'${userId}'::uuid` : 'NULL'}, 
        role = '${role}';
  `);
}

try {
  execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: setupSql, stdio: ['pipe', 'pipe', 'pipe'], env: process.env });

  // Apply schema
  const migrationDir = path.resolve(process.cwd(), 'supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of migrationFiles) {
    let rawSql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    let sql = prepareMigrationSql(rawSql, testSchema, hasPostgis);
    const fullSql = `SET search_path TO ${testSchema}, public;\n${sql}`;
    execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: fullSql, stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
  }

  console.log('✅ Migrations applied cleanly in test schema.\n');

  // Seed test users: Alice (Driver), Bob (Driver), Carol (Owner 1), Dave (Owner 2)
  const aliceId = '11111111-1111-1111-1111-111111111111';
  const bobId   = '22222222-2222-2222-2222-222222222222';
  const carolId = '33333333-3333-3333-3333-333333333333';
  const daveId  = '44444444-4444-4444-4444-444444444444';

  execute(`
    INSERT INTO auth.users (id, email) VALUES 
      ('${aliceId}', 'alice@driver.com'),
      ('${bobId}', 'bob@driver.com'),
      ('${carolId}', 'carol@owner.com'),
      ('${daveId}', 'dave@owner.com')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, email, full_name, role, owner_status) VALUES
      ('${aliceId}', 'alice@driver.com', 'Alice Driver', 'driver', 'none'),
      ('${bobId}', 'bob@driver.com', 'Bob Driver', 'driver', 'none'),
      ('${carolId}', 'carol@owner.com', 'Carol Owner', 'owner', 'approved'),
      ('${daveId}', 'dave@owner.com', 'Dave Owner', 'owner', 'approved')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, owner_status = EXCLUDED.owner_status;
  `);

  // Enforce RLS even for the current table owner role
  execute(`
    ALTER TABLE bookings FORCE ROW LEVEL SECURITY;
    ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
    ALTER TABLE parking_spaces FORCE ROW LEVEL SECURITY;
    ALTER TABLE payments FORCE ROW LEVEL SECURITY;
  `);

  // Carol creates Parking Space C
  const spaceCId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const spaceDId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  setSession(carolId);
  execute(`
    INSERT INTO parking_spaces (id, owner_id, title, address, latitude, longitude, price_per_hour_car, status)
    VALUES ('${spaceCId}', '${carolId}', 'Carol Meenakshi Lot', '124 West Masi St', 9.9195, 78.1198, 40.00, 'active')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Dave creates Parking Space D
  setSession(daveId);
  execute(`
    INSERT INTO parking_spaces (id, owner_id, title, address, latitude, longitude, price_per_hour_car, status)
    VALUES ('${spaceDId}', '${daveId}', 'Dave Madurai Station Space', 'Railway Feeder Rd', 9.9200, 78.1200, 35.00, 'active')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Alice books Space C
  const bookingAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  setSession(aliceId);
  execute(`
    INSERT INTO bookings (
      id, pass_code, pass_token_hash, driver_id, user_id, parking_space_id, 
      vehicle_type, vehicle_number, booking_date, start_time, duration_hours, end_time,
      base_price, platform_fee, total_amount, booking_status, status, qr_data
    ) VALUES (
      '${bookingAId}', 'IDM-11111', 'token_hash_alice', '${aliceId}', '${aliceId}', '${spaceCId}',
      'car', 'TN 59 AA 1111', CURRENT_DATE, '10:00:00', 2, '12:00:00',
      80.00, 5.00, 85.00, 'confirmed', 'confirmed', 'IDAM:v2:IDM-11111'
    );
  `);
  console.log('✅ Baseline test entities created.');

  // If running as superuser (e.g. CI as postgres), grant permissions to test_authenticated_role
  // and activate SET ROLE so that PostgreSQL strictly enforces RLS policies instead of bypassing them.
  if (isSuperuser) {
    execute(`
      DO $$
      BEGIN
        GRANT USAGE ON SCHEMA ${testSchema} TO test_authenticated_role;
        GRANT ALL ON ALL TABLES IN SCHEMA ${testSchema} TO test_authenticated_role;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA ${testSchema} TO test_authenticated_role;
        GRANT ALL ON ALL ROUTINES IN SCHEMA ${testSchema} TO test_authenticated_role;
        GRANT USAGE ON SCHEMA auth TO test_authenticated_role;
        GRANT ALL ON ALL TABLES IN SCHEMA auth TO test_authenticated_role;
        GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO test_authenticated_role;
        GRANT test_authenticated_role TO CURRENT_USER;
      END $$;
    `);
    runAsTestUser = true;
    console.log('🔒 Superuser detected: RLS test role activated with SET ROLE test_authenticated_role');
  }

  // TEST 1: Anonymous user invokes check-in -> REJECTED
  console.log('\nTest 1: Anonymous user invokes check-in RPC');
  setSession(null, 'anon');
  console.log('Auth context Test 1:', queryJson(`SELECT auth.uid() AS uid, auth.jwt()->>'role' AS jwt_role`));
  const res1 = logResult(
    'Test 1 result',
    queryJson(`SELECT confirm_booking_check_in('${bookingAId}'::uuid, 'token_hash_alice', 'IDM-11111') AS r`)[0].r
  );
  assert.strictEqual(res1.success, false, 'Anonymous check-in must fail');
  assert.strictEqual(res1.code, 'UNAUTHENTICATED', 'Must return UNAUTHENTICATED error');
  console.log('  ✅ PASSED: Anonymous check-in rejected with UNAUTHENTICATED');

  // TEST 2: Driver Alice tries to check in her own or Bob's booking -> REJECTED
  console.log('\nTest 2: Driver invokes check-in RPC (drivers are not owners)');
  setSession(aliceId);
  console.log('Auth context Test 2:', queryJson(`SELECT auth.uid() AS uid, auth.jwt()->>'role' AS jwt_role`));
  console.log('Booking & Space verification before Test 2:', queryJson(`
    SELECT
      b.id AS booking_id,
      b.parking_space_id,
      s.owner_id,
      auth.uid() AS current_user_id
    FROM bookings b
    JOIN parking_spaces s
      ON s.id = b.parking_space_id
    WHERE b.id = '${bookingAId}'
  `));
  const res2 = logResult(
    'Test 2 result',
    queryJson(`SELECT confirm_booking_check_in('${bookingAId}'::uuid, 'token_hash_alice', 'IDM-11111') AS r`)[0].r
  );
  assert.strictEqual(res2.success, false, 'Driver check-in must fail');
  assert.strictEqual(res2.code, 'UNAUTHORIZED', 'Driver must not have space operator permission');
  console.log('  ✅ PASSED: Driver check-in rejected with UNAUTHORIZED');

  // TEST 3: Dave (owner of Space D) checks in booking for Carol's Space C -> REJECTED
  console.log('\nTest 3: Unrelated owner Dave checks in booking for Carol Space C');
  setSession(daveId);
  const res3 = logResult(
    'Test 3 result',
    queryJson(`SELECT confirm_booking_check_in('${bookingAId}'::uuid, 'token_hash_alice', 'IDM-11111') AS r`)[0].r
  );
  assert.strictEqual(res3.success, false, 'Unrelated owner check-in must fail');
  assert.ok(['UNAUTHORIZED', 'NOT_FOUND'].includes(res3.code), `Expected rejection error, got ${res3.code}`);
  console.log(`  ✅ PASSED: Unrelated space owner check-in rejected with ${res3.code}`);

  // TEST 4: Anonymous or driver calls check-out with arbitrary ID -> REJECTED
  console.log('\nTest 4: Driver / unauthenticated calls check-out RPC');
  setSession(bobId);
  const res4 = logResult(
    'Test 4 result',
    queryJson(`SELECT confirm_booking_check_out('${bookingAId}'::uuid) AS r`)[0].r
  );
  assert.strictEqual(res4.success, false, 'Arbitrary check-out must fail');
  assert.ok(['UNAUTHORIZED', 'NOT_FOUND'].includes(res4.code), `Expected rejection error, got ${res4.code}`);
  console.log(`  ✅ PASSED: Arbitrary user check-out rejected with ${res4.code}`);

  // TEST 5: Driver Bob attempts to insert a booking for Alice via RLS -> REJECTED
  console.log('\nTest 5: Driver Bob attempts to insert a booking for Alice');
  setSession(bobId);
  let insertBlocked = false;
  try {
    execute(`
      INSERT INTO bookings (
        pass_code, driver_id, user_id, parking_space_id, vehicle_type, vehicle_number,
        booking_date, start_time, duration_hours, end_time, base_price, total_amount, qr_data
      ) VALUES (
        'IDM-FORGE', '${aliceId}', '${aliceId}', '${spaceCId}', 'car', 'TN 59 FF 0000',
        CURRENT_DATE, '14:00:00', 1, '15:00:00', 40.00, 45.00, 'qr'
      );
    `);
  } catch (err) {
    insertBlocked = true;
  }
  assert.ok(insertBlocked, 'RLS must reject driver inserting booking with someone else driver_id');
  console.log('  ✅ PASSED: Cross-user booking insert blocked by RLS');

  // TEST 6: Driver Alice attempts to escalate role to owner via direct UPDATE -> REJECTED
  console.log('\nTest 6: Driver Alice attempts direct role escalation to owner');
  setSession(aliceId);
  let escalationBlocked = false;
  try {
    execute(`UPDATE profiles SET role = 'owner', owner_status = 'approved' WHERE id = '${aliceId}';`);
  } catch (err) {
    escalationBlocked = true;
  }
  assert.ok(escalationBlocked, 'Trigger protect_profile_role must block direct role change');
  console.log('  ✅ PASSED: Direct role escalation blocked by trigger');

  // TEST 7: Bob reads Alice private booking -> 0 rows returned
  console.log('\nTest 7: Bob reads Alice private booking via RLS');
  setSession(bobId);
  const rowsBob = queryJson(`SELECT id FROM bookings WHERE id = '${bookingAId}'`);
  assert.strictEqual(rowsBob.length, 0, 'Bob must not see Alice booking');
  console.log('  ✅ PASSED: Cross-user booking read blocked by RLS (0 rows returned)');

  // TEST 8: Carol (authorized owner of Space C) reads bookings for her space -> ALLOWED
  console.log('\nTest 8: Carol (authorized space owner) reads bookings for managed space');
  setSession(carolId);
  const rowsCarol = queryJson(`SELECT id, pass_code FROM bookings WHERE id = '${bookingAId}'`);
  assert.strictEqual(rowsCarol.length, 1, 'Carol must see booking for her managed space');
  assert.strictEqual(rowsCarol[0].pass_code, 'IDM-11111');
  console.log('  ✅ PASSED: Authorized space owner reads managed booking');

  // TEST 9: Carol verifies and checks in Alice booking with token hash -> SUCCEEDS
  console.log('\nTest 9: Carol verifies and checks in Alice booking');
  setSession(carolId);
  const res9 = logResult(
    'Test 9 result',
    queryJson(`SELECT confirm_booking_check_in('${bookingAId}'::uuid, 'token_hash_alice', 'IDM-11111') AS r`)[0].r
  );
  assert.strictEqual(res9.success, true, 'Authorized owner check-in must succeed');
  assert.strictEqual(res9.booking_id, bookingAId);
  console.log('  ✅ PASSED: Authorized check-in confirmed and audit logged');

  console.log('\n🎉 ALL 9 SECURITY BOUNDARY TESTS PASSED CLEANLY AGAINST POSTGRESQL!');
} finally {
  console.log(`\nCleaning up schema ${testSchema}...`);
  try {
    execSync(`psql -d myapp -c "DROP SCHEMA IF EXISTS ${testSchema} CASCADE;"`);
    console.log(`✅ Schema ${testSchema} dropped.`);
  } catch {}
}
