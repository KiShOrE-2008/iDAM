import { execSync } from 'child_process';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

console.log('=== PHASE 4: AUTOMATED PAYMENT PROCESSING & RECONCILIATION VERIFICATION ===\n');

const testSchema = `payments_test_${Date.now()}`;

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
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'geography') THEN
        CREATE DOMAIN geography AS text;
      END IF;
    END $$;

    CREATE OR REPLACE FUNCTION ST_SetSRID(pt text, srid int) RETURNS text AS $$ SELECT pt; $$ LANGUAGE sql;
    CREATE OR REPLACE FUNCTION ST_MakePoint(x float8, y float8) RETURNS text AS $$ SELECT x || ',' || y; $$ LANGUAGE sql;
    CREATE OR REPLACE FUNCTION ST_Distance(g1 text, g2 text) RETURNS float8 AS $$ SELECT 0.0::float8; $$ LANGUAGE sql;
    CREATE OR REPLACE FUNCTION ST_DWithin(g1 text, g2 text, r float8) RETURNS boolean AS $$ SELECT true; $$ LANGUAGE sql;
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
    let sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS postgis;/gi, '-- CREATE EXTENSION IF NOT EXISTS postgis;');
    sql = sql.replace(/\bGEOGRAPHY\b(\([^\)]+\))?/gi, 'TEXT');
    sql = sql.replace(/::geography/gi, '::text');
    sql = sql.replace(/CREATE INDEX [^;]+USING GIST[^;]+;/gi, '-- GIST index omitted in mock postgis test');
    sql = sql.replace(/public\./g, `${testSchema}.`);
    const fullSql = `SET search_path TO ${testSchema}, public;\n${sql}`;
    execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: fullSql, stdio: ['pipe', 'pipe', 'pipe'] });
  }
  console.log('   All migrations applied cleanly.\n');

  // 3. Seed test users and parking space
  const driverId = '11111111-1111-4111-8111-111111111111';
  const driver2Id = '22222222-2222-4222-8222-222222222222';
  const ownerId = '33333333-3333-4333-8333-333333333333';
  const spaceId = '44444444-4444-4444-8444-444444444444';

  execute(`
    INSERT INTO auth.users (id, email) VALUES
      ('${driverId}', 'driver1@idam.test'),
      ('${driver2Id}', 'driver2@idam.test'),
      ('${ownerId}', 'owner@idam.test')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO ${testSchema}.profiles (id, email, full_name, role) VALUES
      ('${driverId}', 'driver1@idam.test', 'Driver One', 'driver'),
      ('${driver2Id}', 'driver2@idam.test', 'Driver Two', 'driver'),
      ('${ownerId}', 'owner@idam.test', 'Owner Smart Lot', 'owner')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO ${testSchema}.parking_spaces (
      id, owner_id, title, address, latitude, longitude, price_per_hour_car, price_per_hour_bike, car_capacity, bike_capacity, status
    ) VALUES (
      '${spaceId}', '${ownerId}', 'Madurai West Smart Parking', 'West Perumal St', 9.92, 78.12, 50.00, 25.00, 10, 15, 'active'
    ) ON CONFLICT (id) DO NOTHING;
  `);

  console.log('3. Running Test Suites:\n');

  // TEST 1: create_payment_order computes authoritative quote
  console.log('Test 1: create_payment_order calculates authoritative quote...');
  setSession(driverId, 'authenticated');
  const orderRes = queryJson(`
    SELECT ${testSchema}.create_payment_order(
      '${spaceId}'::UUID,
      'car',
      3,
      'TN 59 AB 9999',
      ARRAY['cctv']
    ) as result;
  `);
  assert(orderRes.length > 0 && orderRes[0].result.success === true, 'Order creation should succeed');
  const orderData = orderRes[0].result;
  assert(orderData.order_id.startsWith('order_idam_'), 'Order ID should have canonical order_idam_ prefix');
  // 50 * 3 + 5 (platform fee) = 155
  assert.strictEqual(Number(orderData.amount), 155, 'Order amount should be 155');
  assert.strictEqual(Number(orderData.amount_paise), 15500, 'Order amount in paise should be 15500');
  console.log('  PASSED: Server order generated:', orderData.order_id, `(₹${orderData.amount})\n`);

  // TEST 2: create_payment_order rejects unauthenticated caller
  console.log('Test 2: create_payment_order rejects unauthenticated caller...');
  setSession(null, 'anon');
  const unauthOrderRes = queryJson(`
    SELECT ${testSchema}.create_payment_order(
      '${spaceId}'::UUID,
      'car',
      2,
      'TN 59 AB 9999',
      ARRAY[]::TEXT[]
    ) as result;
  `);
  assert(unauthOrderRes.length > 0 && unauthOrderRes[0].result.success === false, 'Unauth order must be rejected');
  assert.strictEqual(unauthOrderRes[0].result.error, 'UNAUTHENTICATED');
  console.log('  PASSED: Unauthenticated caller rejected cleanly.\n');

  // TEST 3: create_verified_booking with valid payment ref creates confirmed booking & payment record
  console.log('Test 3: create_verified_booking with payment ref sets confirmed & completed status...');
  setSession(driverId, 'authenticated');
  const paymentRef1 = 'pay_test_rzp_' + Date.now();
  const bookRes1 = queryJson(`
    SELECT ${testSchema}.create_verified_booking(
      '${spaceId}'::UUID,
      'car',
      NOW() + INTERVAL '1 hour',
      2,
      'TN 59 AA 1111',
      'Driver One',
      '9876543210',
      ARRAY[]::TEXT[],
      'hash_token_test_1',
      'IDM-PAY-01',
      '${paymentRef1}'
    ) as result;
  `);
  assert(bookRes1.length > 0 && bookRes1[0].result.success === true, 'Booking with payment ref must succeed');
  assert.strictEqual(bookRes1[0].result.booking_status, 'confirmed');
  assert.strictEqual(bookRes1[0].result.payment_status, 'completed');
  const booking1Id = bookRes1[0].result.booking_id;

  // Verify record in payments table
  const paymentRow1 = queryJson(`SELECT * FROM ${testSchema}.payments WHERE transaction_ref = '${paymentRef1}';`);
  assert(paymentRow1.length > 0, 'Payment record must be inserted');
  assert.strictEqual(paymentRow1[0].status, 'success');
  assert.strictEqual(paymentRow1[0].booking_id, booking1Id);
  console.log('  PASSED: Booking confirmed and payment persisted in payments table.\n');

  // TEST 4: create_verified_booking without payment reference leaves booking pending
  console.log('Test 4: create_verified_booking without payment ref sets pending status...');
  const bookRes2 = queryJson(`
    SELECT ${testSchema}.create_verified_booking(
      '${spaceId}'::UUID,
      'car',
      NOW() + INTERVAL '4 hours',
      2,
      'TN 59 BB 2222',
      'Driver One',
      '9876543210',
      ARRAY[]::TEXT[],
      'hash_token_test_2',
      'IDM-PAY-02',
      NULL
    ) as result;
  `);
  assert(bookRes2.length > 0 && bookRes2[0].result.success === true);
  assert.strictEqual(bookRes2[0].result.booking_status, 'pending');
  assert.strictEqual(bookRes2[0].result.payment_status, 'pending');
  const booking2Id = bookRes2[0].result.booking_id;
  console.log('  PASSED: Unpaid booking initialized in pending state.\n');

  // TEST 5: Anti-replay protection in create_verified_booking
  console.log('Test 5: Anti-replay protection prevents reusing payment reference...');
  const replayRes = queryJson(`
    SELECT ${testSchema}.create_verified_booking(
      '${spaceId}'::UUID,
      'car',
      NOW() + INTERVAL '7 hours',
      2,
      'TN 59 CC 3333',
      'Driver One',
      '9876543210',
      ARRAY[]::TEXT[],
      'hash_token_test_3',
      'IDM-PAY-03',
      '${paymentRef1}'
    ) as result;
  `);
  assert(replayRes.length > 0 && replayRes[0].result.success === false, 'Reused payment ref must be rejected');
  assert.strictEqual(replayRes[0].result.error, 'PAYMENT_ALREADY_USED');
  console.log('  PASSED: Replay attack with duplicate payment ref blocked.\n');

  // TEST 6: Idempotent payment reconciliation confirms pending booking
  console.log('Test 6: record_payment_reconciliation reconciles pending booking to confirmed...');
  const paymentRef2 = 'pay_test_rzp_' + (Date.now() + 100);
  const reconRes1 = queryJson(`
    SELECT ${testSchema}.record_payment_reconciliation(
      '${booking2Id}'::UUID,
      '${paymentRef2}',
      105.00,
      'Razorpay',
      'success',
      '{"order_id": "order_test_1"}'::jsonb
    ) as result;
  `);
  assert(reconRes1.length > 0 && reconRes1[0].result.success === true);
  assert.strictEqual(reconRes1[0].result.status, 'success');

  const reconciledBooking = queryJson(`SELECT * FROM ${testSchema}.bookings WHERE id = '${booking2Id}';`);
  assert.strictEqual(reconciledBooking[0].booking_status, 'confirmed');
  assert.strictEqual(reconciledBooking[0].payment_status, 'completed');
  assert.strictEqual(reconciledBooking[0].payment_id, paymentRef2);
  console.log('  PASSED: Pending booking reconciled to confirmed state.\n');

  // TEST 7: Idempotency of reconciliation
  console.log('Test 7: Idempotency: duplicate reconciliation call updates cleanly...');
  const reconRes2 = queryJson(`
    SELECT ${testSchema}.record_payment_reconciliation(
      '${booking2Id}'::UUID,
      '${paymentRef2}',
      105.00,
      'Razorpay',
      'success',
      '{"order_id": "order_test_1_retry"}'::jsonb
    ) as result;
  `);
  assert(reconRes2.length > 0 && reconRes2[0].result.success === true);
  console.log('  PASSED: Duplicate reconciliation call was idempotent.\n');

  // TEST 8: Replay attack in reconciliation across bookings
  console.log('Test 8: Replay attack: reconciling different booking with used ref is rejected...');
  const bookRes3 = queryJson(`
    SELECT ${testSchema}.create_verified_booking(
      '${spaceId}'::UUID,
      'bike',
      NOW() + INTERVAL '10 hours',
      1,
      'TN 59 BK 4444',
      'Driver One',
      '9876543210',
      ARRAY[]::TEXT[],
      'hash_token_test_4',
      'IDM-PAY-04',
      NULL
    ) as result;
  `);
  const booking3Id = bookRes3[0].result.booking_id;
  const replayReconRes = queryJson(`
    SELECT ${testSchema}.record_payment_reconciliation(
      '${booking3Id}'::UUID,
      '${paymentRef1}',
      30.00,
      'Razorpay',
      'success'
    ) as result;
  `);
  assert(replayReconRes.length > 0 && replayReconRes[0].result.success === false);
  assert.strictEqual(replayReconRes[0].result.error, 'PAYMENT_ALREADY_USED');
  console.log('  PASSED: Cross-booking payment reference replay blocked.\n');

  // TEST 9: verify_razorpay_payment with HMAC-SHA256 signature
  console.log('Test 9: verify_razorpay_payment verifies HMAC signature on server...');
  const testSecret = 'idam_test_razorpay_secret_key_99';
  const orderId = 'order_test_999';
  const paymentId = 'pay_sig_test_' + Date.now();
  const validSignature = crypto.createHmac('sha256', testSecret).update(`${orderId}|${paymentId}`).digest('hex');

  const bookRes4 = queryJson(`
    SELECT ${testSchema}.create_verified_booking(
      '${spaceId}'::UUID,
      'car',
      NOW() + INTERVAL '12 hours',
      2,
      'TN 59 SIG 5555',
      'Driver One',
      '9876543210',
      ARRAY[]::TEXT[],
      'hash_token_test_5',
      'IDM-PAY-05',
      NULL
    ) as result;
  `);
  const booking4Id = bookRes4[0].result.booking_id;

  const verifyRes1 = queryJson(`
    SELECT ${testSchema}.verify_razorpay_payment(
      '${booking4Id}'::UUID,
      '${orderId}',
      '${paymentId}',
      '${validSignature}',
      '${testSecret}'
    ) as result;
  `);
  assert(verifyRes1.length > 0 && verifyRes1[0].result.success === true, 'Valid signature must be verified');

  const verifiedBooking = queryJson(`SELECT * FROM ${testSchema}.bookings WHERE id = '${booking4Id}';`);
  assert.strictEqual(verifiedBooking[0].booking_status, 'confirmed');
  assert.strictEqual(verifiedBooking[0].payment_status, 'completed');
  console.log('  PASSED: Valid HMAC signature verified and booking confirmed.\n');

  // TEST 10: verify_razorpay_payment rejects forged signature
  console.log('Test 10: verify_razorpay_payment rejects forged signature...');
  const bookRes5 = queryJson(`
    SELECT ${testSchema}.create_verified_booking(
      '${spaceId}'::UUID,
      'car',
      NOW() + INTERVAL '15 hours',
      2,
      'TN 59 FORGE 666',
      'Driver One',
      '9876543210',
      ARRAY[]::TEXT[],
      'hash_token_test_6',
      'IDM-PAY-06',
      NULL
    ) as result;
  `);
  const booking5Id = bookRes5[0].result.booking_id;

  const forgedSig = 'forged_signature_00000000000000000000000000000000000000000000000000';
  const verifyRes2 = queryJson(`
    SELECT ${testSchema}.verify_razorpay_payment(
      '${booking5Id}'::UUID,
      '${orderId}',
      '${paymentId}_2',
      '${forgedSig}',
      '${testSecret}'
    ) as result;
  `);
  assert(verifyRes2.length > 0 && verifyRes2[0].result.success === false);
  assert.strictEqual(verifyRes2[0].result.error, 'INVALID_SIGNATURE');
  console.log('  PASSED: Forged HMAC signature rejected.\n');

  // TEST 11: cancel_booking automatically refunds payment
  console.log('Test 11: cancel_booking automatically updates payment status to refunded...');
  const cancelRes = queryJson(`
    SELECT ${testSchema}.cancel_booking(
      '${booking1Id}'::UUID,
      'Driver had change of plans'
    ) as result;
  `);
  assert(cancelRes.length > 0 && cancelRes[0].result.success === true);

  const cancelledBooking = queryJson(`SELECT * FROM ${testSchema}.bookings WHERE id = '${booking1Id}';`);
  assert.strictEqual(cancelledBooking[0].booking_status, 'cancelled');
  assert.strictEqual(cancelledBooking[0].payment_status, 'refunded');

  const refundedPayment = queryJson(`SELECT * FROM ${testSchema}.payments WHERE booking_id = '${booking1Id}';`);
  assert.strictEqual(refundedPayment[0].status, 'refunded');
  console.log('  PASSED: Booking and payment record transitioned to refunded.\n');

  console.log('================================================================');
  console.log('ALL PHASE 4 PAYMENT PROCESSING & RECONCILIATION TESTS PASSED!');
  console.log('================================================================');

} finally {
  console.log(`\nCleaning up test schema ${testSchema}...`);
  execSync(`psql -d myapp -c "DROP SCHEMA IF EXISTS ${testSchema} CASCADE;"`, { stdio: 'inherit' });
}
