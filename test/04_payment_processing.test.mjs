import { execSync } from 'child_process';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { checkHasPostgis, getPostgisBootstrapSql, prepareMigrationSql } from './test_db_helper.mjs';

console.log('=== PHASE 4: AUTOMATED PAYMENT PROCESSING & RECONCILIATION VERIFICATION ===\n');

const testSchema = `payments_test_${Date.now()}`;
let createdVaultStub = false;
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

  // Helper: books a 2-hour car slot for the current session and returns the booking id
  let bookingSeq = 0;
  function createBooking(hoursFromNow, paymentRef = null) {
    bookingSeq++;
    const res = queryJson(`
      SELECT ${testSchema}.create_verified_booking(
        '${spaceId}'::UUID,
        'car',
        NOW() + INTERVAL '${hoursFromNow} hours',
        2,
        'TN 59 AA ${1000 + bookingSeq}',
        'Driver One',
        '9876543210',
        ARRAY[]::TEXT[],
        'hash_token_test_${bookingSeq}',
        'IDM-PAY-${String(bookingSeq).padStart(2, '0')}',
        ${paymentRef ? `'${paymentRef}'` : 'NULL'}
      ) as result;
    `);
    assert(res.length > 0 && res[0].result.success === true, `Booking ${bookingSeq} must succeed`);
    return res[0].result;
  }

  // Helper: what a backend order-creation function does after calling Razorpay's Orders API
  function attachOrder(bookingId, razorpayOrderId) {
    execute(`UPDATE ${testSchema}.bookings SET razorpay_order_id = '${razorpayOrderId}' WHERE id = '${bookingId}';`);
  }

  function verify(bookingId, orderId, paymentId, signature) {
    return queryJson(`
      SELECT ${testSchema}.verify_razorpay_payment(
        '${bookingId}'::UUID, '${orderId}', '${paymentId}', '${signature}'
      ) as result;
    `)[0].result;
  }

  function bookingRow(bookingId) {
    return queryJson(`SELECT * FROM ${testSchema}.bookings WHERE id = '${bookingId}';`)[0];
  }

  const sign = (secret, orderId, paymentId) =>
    crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  // TEST 3: a client-supplied payment ref no longer confirms a booking
  console.log('Test 3: create_verified_booking ignores client payment ref (booking stays pending)...');
  setSession(driverId, 'authenticated');
  const paymentRef1 = 'pay_test_rzp_' + Date.now();
  const booking1 = createBooking(1, paymentRef1);
  assert.strictEqual(booking1.booking_status, 'pending');
  assert.strictEqual(booking1.payment_status, 'pending');
  assert.strictEqual(bookingRow(booking1.booking_id).payment_status, 'pending');
  const paymentRow1 = queryJson(`SELECT * FROM ${testSchema}.payments WHERE transaction_ref = '${paymentRef1}';`);
  assert.strictEqual(paymentRow1.length, 0, 'An unverified client payment ref must not create a payment record');
  console.log('  PASSED: Client payment ref is not trusted; booking awaits verified payment.\n');

  // TEST 4: create_verified_booking without payment reference leaves booking pending
  console.log('Test 4: create_verified_booking without payment ref sets pending status...');
  const booking2 = createBooking(4);
  assert.strictEqual(booking2.booking_status, 'pending');
  assert.strictEqual(booking2.payment_status, 'pending');
  const booking2Id = booking2.booking_id;
  console.log('  PASSED: Unpaid booking initialized in pending state.\n');

  // TEST 5: trusted backend reconciliation confirms a pending booking
  console.log('Test 5: record_payment_reconciliation (service path) reconciles pending booking to confirmed...');
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
  const reconciledBooking = bookingRow(booking2Id);
  assert.strictEqual(reconciledBooking.booking_status, 'confirmed');
  assert.strictEqual(reconciledBooking.payment_status, 'completed');
  assert.strictEqual(reconciledBooking.payment_id, paymentRef2);
  console.log('  PASSED: Pending booking reconciled to confirmed state.\n');

  // TEST 6: idempotency of reconciliation
  console.log('Test 6: Idempotency: duplicate reconciliation call updates cleanly...');
  const reconRes2 = queryJson(`
    SELECT ${testSchema}.record_payment_reconciliation(
      '${booking2Id}'::UUID, '${paymentRef2}', 105.00, 'Razorpay', 'success',
      '{"order_id": "order_test_1_retry"}'::jsonb
    ) as result;
  `);
  assert(reconRes2.length > 0 && reconRes2[0].result.success === true);
  console.log('  PASSED: Duplicate reconciliation call was idempotent.\n');

  // TEST 7: replay of a payment ref across bookings is rejected
  console.log('Test 7: Replay attack: reconciling different booking with used ref is rejected...');
  const booking3 = createBooking(10);
  const replayReconRes = queryJson(`
    SELECT ${testSchema}.record_payment_reconciliation(
      '${booking3.booking_id}'::UUID, '${paymentRef2}', 30.00, 'Razorpay', 'success'
    ) as result;
  `);
  assert.strictEqual(replayReconRes[0].result.success, false);
  assert.strictEqual(replayReconRes[0].result.error, 'PAYMENT_ALREADY_USED');
  console.log('  PASSED: Cross-booking payment reference replay blocked.\n');

  // Server-side secret, stored where production keeps it (Supabase Vault)
  const testSecret = 'idam_test_razorpay_secret_key_99';
  createdVaultStub = queryJson(`SELECT to_regnamespace('vault') IS NULL AS missing`)[0].missing;
  execute(`
    CREATE SCHEMA IF NOT EXISTS vault;
    CREATE TABLE IF NOT EXISTS vault.decrypted_secrets (name TEXT, decrypted_secret TEXT);
    DELETE FROM vault.decrypted_secrets WHERE name = 'razorpay_key_secret';
  `);

  // TEST 8: with no secret configured, verification fails closed
  console.log('Test 8: verify_razorpay_payment fails closed when no server secret is configured...');
  const booking8 = createBooking(12);
  attachOrder(booking8.booking_id, 'order_test_888');
  const noSecretRes = verify(booking8.booking_id, 'order_test_888', 'pay_nosecret_1', 'sig_anything');
  assert.strictEqual(noSecretRes.success, false);
  assert.strictEqual(noSecretRes.error, 'PAYMENT_VERIFICATION_UNAVAILABLE');
  const lenSig = verify(booking8.booking_id, 'order_test_888', 'pay_nosecret_2', 'a'.repeat(64));
  assert.strictEqual(lenSig.success, false, 'A 64-character signature must not be accepted without a secret');
  assert.strictEqual(bookingRow(booking8.booking_id).payment_status, 'pending');
  console.log('  PASSED: No secret -> no payment can be verified (sig_ / 64-char shortcuts removed).\n');

  execute(`INSERT INTO vault.decrypted_secrets (name, decrypted_secret) VALUES ('razorpay_key_secret', '${testSecret}');`);

  // TEST 9: valid HMAC signature confirms the booking
  console.log('Test 9: verify_razorpay_payment verifies HMAC signature using the server secret...');
  const orderId = 'order_test_999';
  const paymentId = 'pay_sig_test_' + Date.now();
  const booking9 = createBooking(14);
  attachOrder(booking9.booking_id, orderId);
  const verifyRes1 = verify(booking9.booking_id, orderId, paymentId, sign(testSecret, orderId, paymentId));
  assert.strictEqual(verifyRes1.success, true, 'Valid signature must be verified');
  const verifiedBooking = bookingRow(booking9.booking_id);
  assert.strictEqual(verifiedBooking.booking_status, 'confirmed');
  assert.strictEqual(verifiedBooking.payment_status, 'completed');
  assert.strictEqual(Number(queryJson(`SELECT amount FROM ${testSchema}.payments WHERE transaction_ref = '${paymentId}';`)[0].amount),
    Number(verifiedBooking.total_amount), 'Recorded amount must be the server-computed booking total');
  const retry = verify(booking9.booking_id, orderId, paymentId, sign(testSecret, orderId, paymentId));
  assert.strictEqual(retry.success, true, 'Retrying the same verified payment must be idempotent');
  console.log('  PASSED: Valid HMAC signature verified and booking confirmed.\n');

  // TEST 10: forged signature / attacker-chosen secret are rejected
  console.log('Test 10: verify_razorpay_payment rejects forged signatures and caller-supplied secrets...');
  const booking10 = createBooking(17);
  attachOrder(booking10.booking_id, 'order_test_1010');
  const forged = verify(booking10.booking_id, 'order_test_1010', 'pay_forged_1', 'sig_forged');
  assert.strictEqual(forged.error, 'INVALID_SIGNATURE');
  const ownSecretSig = sign('attacker_secret', 'order_test_1010', 'pay_forged_2');
  assert.strictEqual(verify(booking10.booking_id, 'order_test_1010', 'pay_forged_2', ownSecretSig).error, 'INVALID_SIGNATURE');
  assert.throws(() => execute(`
    SELECT ${testSchema}.verify_razorpay_payment(
      '${booking10.booking_id}'::UUID, 'order_test_1010', 'pay_forged_3', '${sign('x', 'order_test_1010', 'pay_forged_3')}', 'x'
    );
  `), 'The 5-argument variant that accepted a caller-supplied secret must no longer exist');
  assert.strictEqual(bookingRow(booking10.booking_id).payment_status, 'pending');
  console.log('  PASSED: Forged signatures and caller-supplied secrets rejected.\n');

  // TEST 11: a real payment for one order cannot pay for a different booking
  console.log('Test 11: verify_razorpay_payment rejects an order that does not belong to the booking...');
  const booking11 = createBooking(20);
  const noOrder = verify(booking11.booking_id, orderId, 'pay_other_1', sign(testSecret, orderId, 'pay_other_1'));
  assert.strictEqual(noOrder.error, 'ORDER_MISMATCH', 'Booking without a server-created order cannot be paid');
  attachOrder(booking11.booking_id, 'order_test_1111');
  const cheapOrder = 'order_cheap_1';
  const mismatch = verify(booking11.booking_id, cheapOrder, 'pay_other_2', sign(testSecret, cheapOrder, 'pay_other_2'));
  assert.strictEqual(mismatch.error, 'ORDER_MISMATCH');
  console.log('  PASSED: Payments are bound to the order created for that booking.\n');

  // TEST 12: only the booking's driver can verify its payment
  console.log("Test 12: verify_razorpay_payment rejects another driver's booking and anonymous callers...");
  const otherDriverId = '22222222-2222-4222-8222-222222222222';
  setSession(otherDriverId, 'authenticated');
  const foreign = verify(booking11.booking_id, 'order_test_1111', 'pay_foreign', sign(testSecret, 'order_test_1111', 'pay_foreign'));
  assert.strictEqual(foreign.error, 'FORBIDDEN');
  setSession(null, 'anon');
  const anon = verify(booking11.booking_id, 'order_test_1111', 'pay_anon', sign(testSecret, 'order_test_1111', 'pay_anon'));
  assert.strictEqual(anon.error, 'UNAUTHENTICATED');
  setSession(driverId, 'authenticated');
  console.log('  PASSED: Ownership enforced on payment verification.\n');

  // TEST 13: cancel_booking marks a paid booking refunded
  console.log('Test 13: cancel_booking automatically updates payment status to refunded...');
  const cancelRes = queryJson(`
    SELECT ${testSchema}.cancel_booking('${booking9.booking_id}'::UUID, 'Driver had change of plans') as result;
  `);
  assert(cancelRes.length > 0 && cancelRes[0].result.success === true);
  const cancelledBooking = bookingRow(booking9.booking_id);
  assert.strictEqual(cancelledBooking.booking_status, 'cancelled');
  assert.strictEqual(cancelledBooking.payment_status, 'refunded');
  const refundedPayment = queryJson(`SELECT * FROM ${testSchema}.payments WHERE booking_id = '${booking9.booking_id}';`);
  assert.strictEqual(refundedPayment[0].status, 'refunded');
  console.log('  PASSED: Booking and payment record transitioned to refunded.\n');

  console.log('================================================================');
  console.log('ALL PHASE 4 PAYMENT PROCESSING & RECONCILIATION TESTS PASSED!');
  console.log('================================================================');

} finally {
  console.log(`\nCleaning up test schema ${testSchema}...`);
  execSync(`psql -d myapp -c "DROP SCHEMA IF EXISTS ${testSchema} CASCADE;"`, { stdio: 'inherit' });
  if (createdVaultStub) {
    execSync(`psql -d myapp -c "DROP SCHEMA IF EXISTS vault CASCADE;"`, { stdio: 'inherit' });
  } else {
    execSync(`psql -d myapp -c "DO \\$\\$ BEGIN IF to_regclass('vault.decrypted_secrets') IS NOT NULL THEN DELETE FROM vault.decrypted_secrets WHERE name = 'razorpay_key_secret'; END IF; END \\$\\$;"`, { stdio: 'inherit' });
  }
}
