import { execSync } from 'node:child_process';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { checkHasPostgis, getPostgisBootstrapSql, prepareMigrationSql } from './test_db_helper.mjs';

console.log('=== PHASE 7: SUPABASE ROLE PRIVILEGES (anon / authenticated / service_role) ===\n');

// Runs as the real Supabase API roles with Supabase's default privileges, so it checks
// which functions and table writes each role can reach, not just the functions' own logic.
// Creating these cluster roles needs superuser (CI) or roles that already exist.

const testSchema = `roles_test_${Date.now()}`;
const hasPostgis = checkHasPostgis();
const ROLES = ['anon', 'authenticated', 'service_role'];

function psql(sql, { tuples = false } = {}) {
  return execSync(`psql -d myapp -v ON_ERROR_STOP=1 ${tuples ? '-t -A' : ''}`, {
    input: `SET search_path TO ${testSchema}, public;\n${sql}`,
    stdio: ['pipe', 'pipe', 'pipe']
  }).toString();
}

function asRole(role, sql) {
  const out = psql(`SET ROLE ${role};\n${sql}`, { tuples: true });
  const line = out.split('\n').find(l => l.startsWith('{') || l.startsWith('['));
  return line ? JSON.parse(line) : out.trim();
}

function expectDenied(role, sql, label) {
  try {
    asRole(role, sql);
  } catch (err) {
    const stderr = err.stderr?.toString() || '';
    assert.match(stderr, /permission denied|row-level security|approved by iDAM|Only iDAM/, `${label}: unexpected error ${stderr}`);
    return;
  }
  assert.fail(`${label}: expected ${role} to be denied`);
}

const { isSuperuser, missingRoles } = (() => {
  const out = execSync(`psql -d myapp -t -A -c "SELECT current_setting('is_superuser') || '|' || COALESCE((SELECT string_agg(r, ',') FROM unnest(ARRAY['anon','authenticated','service_role']) r WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r)), '')"`, {
    stdio: ['pipe', 'pipe', 'pipe']
  }).toString().trim().split('\n').pop();
  const [su, missing] = out.split('|');
  return { isSuperuser: su === 'on', missingRoles: missing ? missing.split(',') : [] };
})();

if (!isSuperuser) {
  const reason = missingRoles.length
    ? `roles ${missingRoles.join(', ')} do not exist and the current user cannot create them`
    : 'the current user cannot SET ROLE to the Supabase roles';
  if (process.env.CI) {
    console.error(`FAILED: cannot run role privilege tests in CI: ${reason}.`);
    process.exit(1);
  }
  console.log(`SKIPPED: ${reason}. Run as a superuser (as CI does) to execute this suite.`);
  process.exit(0);
}

try {
  console.log(`1. Creating Supabase roles and isolated schema ${testSchema}`);
  execSync(`psql -d myapp -v ON_ERROR_STOP=1`, {
    input: `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN NOINHERIT; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN NOINHERIT; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS; END IF;
      END $$;
      CREATE SCHEMA ${testSchema};
      -- Supabase's default privileges for objects created in exposed schemas
      ALTER DEFAULT PRIVILEGES IN SCHEMA ${testSchema} GRANT ALL ON TABLES TO ${ROLES.join(', ')};
      ALTER DEFAULT PRIVILEGES IN SCHEMA ${testSchema} GRANT ALL ON FUNCTIONS TO ${ROLES.join(', ')};
      ALTER DEFAULT PRIVILEGES IN SCHEMA ${testSchema} GRANT ALL ON SEQUENCES TO ${ROLES.join(', ')};
      GRANT USAGE ON SCHEMA ${testSchema} TO ${ROLES.join(', ')};
    `,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  psql(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}'::jsonb);
    CREATE TABLE ${testSchema}._current_test_session (user_id UUID, role TEXT);
    INSERT INTO ${testSchema}._current_test_session VALUES (NULL, 'anon');
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
      SELECT user_id FROM ${testSchema}._current_test_session LIMIT 1;
    $$ LANGUAGE sql STABLE;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB AS $$
      SELECT jsonb_build_object('role', COALESCE(role, 'anon')) FROM ${testSchema}._current_test_session LIMIT 1;
    $$ LANGUAGE sql STABLE;
    GRANT USAGE ON SCHEMA auth TO ${ROLES.join(', ')};
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO ${ROLES.join(', ')};
    ${getPostgisBootstrapSql()}
  `);

  const migrationsDir = path.resolve('supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  console.log(`2. Applying migrations (${migrationFiles.length} files)...`);
  for (const file of migrationFiles) {
    psql(prepareMigrationSql(fs.readFileSync(path.join(migrationsDir, file), 'utf8'), testSchema, hasPostgis));
  }
  psql(`GRANT SELECT ON ${testSchema}._current_test_session TO ${ROLES.join(', ')};`);

  const driverId = '11111111-1111-4111-8111-111111111111';
  const ownerId = '33333333-3333-4333-8333-333333333333';
  const spaceId = '44444444-4444-4444-8444-444444444444';
  psql(`
    INSERT INTO auth.users (id, email) VALUES ('${driverId}', 'driver@idam.test'), ('${ownerId}', 'owner@idam.test')
      ON CONFLICT (id) DO NOTHING;
    INSERT INTO profiles (id, email, full_name, role) VALUES
      ('${driverId}', 'driver@idam.test', 'Driver', 'driver'),
      ('${ownerId}', 'owner@idam.test', 'Owner', 'owner')
      ON CONFLICT (id) DO NOTHING;
    INSERT INTO parking_spaces (id, owner_id, title, address, latitude, longitude, price_per_hour_car, price_per_hour_bike, car_capacity, bike_capacity, status)
      VALUES ('${spaceId}', '${ownerId}', 'Roles Test Lot', 'Test St', 9.92, 78.12, 40, 20, 5, 5, 'active');
  `);
  const setSession = (userId, role) =>
    psql(`UPDATE _current_test_session SET user_id = ${userId ? `'${userId}'::uuid` : 'NULL'}, role = '${role}';`);

  console.log('3. Running Test Suites:\n');

  // Driver creates a booking through the RPC (allowed)
  setSession(driverId, 'authenticated');
  const booking = asRole('authenticated', `
    SELECT create_verified_booking('${spaceId}'::uuid, 'car', NOW() + INTERVAL '1 hour', 2, 'TN 59 RL 0001',
      'Driver', '9876543210', ARRAY[]::text[], 'hash_roles_1', 'IDM-ROLES-1', 'pay_client_claims_paid')::text;
  `);
  assert.strictEqual(booking.success, true, 'authenticated can create bookings via RPC');
  assert.strictEqual(booking.payment_status, 'pending');
  const bookingId = booking.booking_id;
  const paymentStatus = () => psql(`SELECT payment_status FROM bookings WHERE id = '${bookingId}';`, { tuples: true }).trim().split('\n').pop();

  console.log('Test 1: authenticated cannot call record_payment_reconciliation...');
  expectDenied('authenticated', `SELECT record_payment_reconciliation('${bookingId}'::uuid, 'pay_fake_1', 1, 'Razorpay', 'success');`, 'Test 1');
  console.log('  PASSED\n');

  console.log('Test 2: anon cannot call record_payment_reconciliation, verify_razorpay_payment or cancel_booking...');
  setSession(null, 'anon');
  expectDenied('anon', `SELECT record_payment_reconciliation('${bookingId}'::uuid, 'pay_fake_2', 1, 'Razorpay', 'success');`, 'Test 2a');
  expectDenied('anon', `SELECT verify_razorpay_payment('${bookingId}'::uuid, 'o', 'p', 'sig_x');`, 'Test 2b');
  expectDenied('anon', `SELECT cancel_booking('${bookingId}'::uuid, 'anon cancel');`, 'Test 2c');
  console.log('  PASSED\n');

  console.log('Test 3: no client role can read the Razorpay secret helper...');
  expectDenied('anon', `SELECT get_razorpay_key_secret();`, 'Test 3a');
  expectDenied('authenticated', `SELECT get_razorpay_key_secret();`, 'Test 3b');
  console.log('  PASSED\n');

  console.log('Test 4: driver cannot insert a booking directly (would let the client set price and paid status)...');
  setSession(driverId, 'authenticated');
  expectDenied('authenticated', `
    INSERT INTO bookings (pass_code, driver_id, user_id, parking_space_id, vehicle_type, vehicle_number,
      booking_date, start_time, duration_hours, end_time, total_amount, payment_status, booking_status, status)
    VALUES ('IDM-ROLES-X', '${driverId}', '${driverId}', '${spaceId}', 'car', 'TN 59 X', CURRENT_DATE, '10:00', 2, '12:00', 1, 'completed', 'confirmed', 'confirmed');
  `, 'Test 4');
  console.log('  PASSED\n');

  console.log('Test 5: driver cannot mark their own booking paid with a direct UPDATE...');
  asRole('authenticated', `UPDATE bookings SET payment_status = 'completed', booking_status = 'confirmed' WHERE id = '${bookingId}';`);
  assert.strictEqual(paymentStatus(), 'pending', 'Direct UPDATE must not change payment_status');
  console.log('  PASSED\n');

  console.log('Test 6: authenticated can call verify_razorpay_payment, which fails closed...');
  const verifyRes = asRole('authenticated', `SELECT verify_razorpay_payment('${bookingId}'::uuid, 'order_x', 'pay_x', 'sig_x')::text;`);
  assert.strictEqual(verifyRes.success, false);
  assert.strictEqual(verifyRes.error, 'ORDER_MISMATCH');
  assert.strictEqual(paymentStatus(), 'pending');
  console.log('  PASSED\n');

  console.log('Test 7: service_role (trusted backend) can reconcile a payment...');
  setSession(null, 'service_role');
  const recon = asRole('service_role', `
    SELECT record_payment_reconciliation('${bookingId}'::uuid, 'pay_webhook_1',
      (SELECT total_amount FROM bookings WHERE id = '${bookingId}'), 'Razorpay', 'success')::text;
  `);
  assert.strictEqual(recon.success, true);
  assert.strictEqual(paymentStatus(), 'completed');
  console.log('  PASSED\n');

  console.log('Test 8: owners cannot publish unreviewed listings (C1)...');
  setSession(ownerId, 'authenticated');
  const fakeSpaceId = '55555555-5555-4555-8555-555555555555';
  asRole('authenticated', `
    INSERT INTO parking_spaces (id, owner_id, title, address, latitude, longitude, price_per_hour_car, status, is_approved)
    VALUES ('${fakeSpaceId}', '${ownerId}', 'Scam Lot', 'Nowhere', 9.9, 78.1, 1, 'active', TRUE);
  `);
  const fakeSpace = () => psql(`SELECT status || '|' || is_approved FROM parking_spaces WHERE id = '${fakeSpaceId}';`, { tuples: true }).trim().split('\n').pop();
  assert.strictEqual(fakeSpace(), 'pending_review|false', 'Owner insert must be forced into review');
  expectDenied('authenticated', `UPDATE parking_spaces SET status = 'active' WHERE id = '${fakeSpaceId}';`, 'Test 8 self-publish');
  expectDenied('authenticated', `UPDATE parking_spaces SET is_approved = TRUE WHERE id = '${fakeSpaceId}';`, 'Test 8 self-approve');
  expectDenied('authenticated', `INSERT INTO parking_locations (owner_id, title, address, latitude, longitude) VALUES ('${ownerId}', 'Legacy scam', 'x', 9.9, 78.1);`, 'Test 8 legacy table');
  setSession(null, 'anon');
  const anonSees = asRole('anon', `SELECT json_build_object('n', count(*))::text FROM parking_spaces WHERE id = '${fakeSpaceId}';`);
  assert.strictEqual(anonSees.n, 0, 'Unreviewed listings must be invisible to the public');
  setSession(driverId, 'authenticated');
  const bookFake = asRole('authenticated', `
    SELECT create_verified_booking('${fakeSpaceId}'::uuid, 'car', NOW() + INTERVAL '1 hour', 1, 'TN 59 RL 0002',
      'Driver', '9876543210', ARRAY[]::text[], 'hash_roles_2', 'IDM-ROLES-2', NULL)::text;
  `);
  assert.strictEqual(bookFake.error, 'SPACE_UNAVAILABLE', 'Unreviewed listings must not be bookable');
  assert.strictEqual(fakeSpace(), 'pending_review|false');
  console.log('  PASSED\n');

  console.log('Test 9: profiles (email, phone) are private (C2)...');
  setSession(null, 'anon');
  assert.strictEqual(asRole('anon', `SELECT json_build_object('n', count(*))::text FROM profiles;`).n, 0);
  setSession(driverId, 'authenticated');
  const visible = asRole('authenticated', `SELECT json_build_object('ids', json_agg(id))::text FROM profiles;`).ids;
  assert.deepStrictEqual(visible, [driverId], 'A user must see only their own profile');
  console.log('  PASSED\n');

  console.log('Test 10: clients cannot write the booking audit log (C3)...');
  for (const [who, role] of [[driverId, 'authenticated'], [ownerId, 'authenticated']]) {
    setSession(who, role);
    expectDenied('authenticated', `
      INSERT INTO booking_events (booking_id, event_type, actor_id, details)
      VALUES ('${bookingId}', 'checked_in', '${who}', '{"forged": true}'::jsonb);
    `, 'Test 10');
  }
  console.log('  PASSED\n');

  console.log('Test 11: unknown vehicle types cannot bypass capacity...');
  setSession(driverId, 'authenticated');
  const truck = asRole('authenticated', `
    SELECT create_verified_booking('${spaceId}'::uuid, 'truck', NOW() + INTERVAL '1 hour', 1, 'TN 59 RL 0003',
      'Driver', '9876543210', ARRAY[]::text[], 'hash_roles_3', 'IDM-ROLES-3', NULL)::text;
  `);
  assert.strictEqual(truck.error, 'INVALID_VEHICLE_TYPE');
  console.log('  PASSED\n');

  console.log('================================================================');
  console.log('ALL PHASE 7 SUPABASE ROLE PRIVILEGE TESTS PASSED!');
  console.log('================================================================');
} finally {
  console.log(`\nCleaning up test schema ${testSchema}...`);
  execSync(`psql -d myapp -c "DROP SCHEMA IF EXISTS ${testSchema} CASCADE;"`, { stdio: 'inherit' });
}
