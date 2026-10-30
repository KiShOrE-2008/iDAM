import { execSync } from 'node:child_process';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { checkHasPostgis, getPostgisBootstrapSql, prepareMigrationSql } from './test_db_helper.mjs';

console.log('=== PHASE 11: ADMIN CONSOLE FUNCTIONS (admin-only access, numbers, reviews) ===\n');

// Runs as the real Supabase API roles with Supabase's default privileges, so it checks
// which functions and table writes each role can reach, not just the functions' own logic.
// Creating these cluster roles needs superuser (CI) or roles that already exist.

const testSchema = `admin_test_${Date.now()}`;
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
    assert.match(stderr, /permission denied|row-level security|approved by iDAM|Only iDAM|can only be changed by iDAM/, `${label}: unexpected error ${stderr}`);
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

  const admin = 'aaaaaaaa-0000-4000-8000-000000000001';
  const owner = 'aaaaaaaa-0000-4000-8000-000000000002';
  const driver = 'aaaaaaaa-0000-4000-8000-000000000003';
  const liveSpace = 'bbbbbbbb-0000-4000-8000-000000000001';
  const pendingSpace = 'bbbbbbbb-0000-4000-8000-000000000002';
  psql(`
    INSERT INTO auth.users (id, email) VALUES ('${admin}', 'p11.admin@idam.test'), ('${owner}', 'p11.owner@idam.test'), ('${driver}', 'p11.driver@idam.test')
      ON CONFLICT DO NOTHING; -- auth.users is shared by all test phases
    INSERT INTO profiles (id, email, full_name, phone, role) VALUES
      ('${admin}', 'p11.admin@idam.test', 'Ada Admin', '900', 'admin'),
      ('${owner}', 'p11.owner@idam.test', 'Olu Owner', '901', 'owner'),
      ('${driver}', 'p11.driver@idam.test', 'Dev Driver', '902', 'driver')
      ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name;
    INSERT INTO parking_spaces (id, owner_id, title, address, latitude, longitude, price_per_hour_car, price_per_hour_bike, car_capacity, bike_capacity, status, is_approved) VALUES
      ('${liveSpace}', '${owner}', 'Live Lot', 'Main St', 9.92, 78.12, 40, 20, 5, 5, 'active', TRUE),
      ('${pendingSpace}', '${owner}', 'New Driveway', 'Side St', 9.93, 78.13, 30, 15, 2, 2, 'pending_review', FALSE);
  `);
  const setSession = (userId, role) =>
    psql(`UPDATE _current_test_session SET user_id = ${userId ? `'${userId}'::uuid` : 'NULL'}, role = '${role}';`);

  // One paid booking (₹85 incl. ₹5 fee) and one unpaid
  setSession(driver, 'authenticated');
  const paid = asRole('authenticated', `SELECT create_verified_booking('${liveSpace}'::uuid, 'car', NOW() + INTERVAL '1 hour', 2, 'TN 01 AA 1111', 'Dev', '902', ARRAY[]::text[], 'h_adm_1', 'IDM-ADM1-AAAA', NULL)::text;`);
  asRole('authenticated', `SELECT create_verified_booking('${liveSpace}'::uuid, 'car', NOW() + INTERVAL '5 hours', 1, 'TN 01 AA 1111', 'Dev', '902', ARRAY[]::text[], 'h_adm_2', 'IDM-ADM2-BBBB', NULL)::text;`);
  setSession(null, 'service_role');
  asRole('service_role', `SELECT record_payment_reconciliation('${paid.booking_id}'::uuid, 'pay_adm_1', 85, 'Razorpay', 'success')::text;`);

  const adminCalls = [
    `SELECT admin_summary()::text;`,
    `SELECT admin_list_spaces('pending_review')::text;`,
    `SELECT admin_review_space('${pendingSpace}'::uuid, 'approve', NULL)::text;`,
    `SELECT admin_analytics(7)::text;`,
    `SELECT admin_list_bookings(NULL, NULL, 50)::text;`,
    `SELECT admin_list_users(NULL, 50)::text;`
  ];

  console.log('3. Running Test Suites:\n');

  console.log('Test 1: visitors cannot call any admin function...');
  setSession(null, 'anon');
  for (const sql of adminCalls) expectDenied('anon', sql, `anon ${sql}`);
  console.log('  PASSED\n');

  console.log('Test 2: signed-in drivers and owners are refused by every admin function...');
  for (const who of [driver, owner]) {
    setSession(who, 'authenticated');
    assert.strictEqual(asRole('authenticated', `SELECT json_build_object('a', is_admin())::text;`).a, false);
    for (const sql of adminCalls) {
      try {
        asRole('authenticated', sql);
        assert.fail(`non-admin was allowed: ${sql}`);
      } catch (e) {
        assert.match(e.stderr?.toString() || String(e), /Admins only/, sql);
      }
    }
  }
  console.log('  PASSED\n');

  console.log('Test 3: the admin summary counts users, listings, bookings and money...');
  setSession(admin, 'authenticated');
  assert.strictEqual(asRole('authenticated', `SELECT json_build_object('a', is_admin())::text;`).a, true);
  const summary = asRole('authenticated', `SELECT admin_summary()::text;`);
  assert.strictEqual(summary.users.total, 3);
  assert.strictEqual(summary.users.admins, 1);
  assert.strictEqual(summary.users.owners, 1);
  assert.strictEqual(summary.listings.active, 1);
  assert.strictEqual(summary.listings.pending_review, 1);
  assert.strictEqual(summary.bookings.total, 2);
  assert.strictEqual(summary.bookings.awaiting_payment, 1);
  assert.strictEqual(summary.bookings.confirmed, 1);
  assert.strictEqual(Number(summary.money.paid_total), 85);
  assert.strictEqual(Number(summary.money.platform_fees), 5);
  console.log('  PASSED\n');

  console.log('Test 4: listing requests show the owner contact; reject needs a note; approve publishes...');
  const requests = asRole('authenticated', `SELECT json_build_object('r', admin_list_spaces('pending_review'))::text;`).r;
  assert.strictEqual(requests.length, 1);
  assert.strictEqual(requests[0].title, 'New Driveway');
  assert.strictEqual(requests[0].owner.email, 'p11.owner@idam.test');
  assert.strictEqual(requests[0].owner.other_listings, 1);
  assert.strictEqual(asRole('authenticated', `SELECT admin_review_space('${pendingSpace}'::uuid, 'reject', '  ')::text;`).error, 'NOTE_REQUIRED');
  assert.strictEqual(asRole('authenticated', `SELECT admin_review_space('${pendingSpace}'::uuid, 'teleport', NULL)::text;`).error, 'INVALID_ACTION');
  const rejected = asRole('authenticated', `SELECT admin_review_space('${pendingSpace}'::uuid, 'reject', 'Photos missing')::text;`);
  assert.deepStrictEqual([rejected.status, rejected.is_approved], ['draft', false]);
  const approved = asRole('authenticated', `SELECT admin_review_space('${pendingSpace}'::uuid, 'approve', NULL)::text;`);
  assert.deepStrictEqual([approved.status, approved.is_approved], ['active', true]);
  const reviewer = psql(`SELECT reviewed_by FROM parking_spaces WHERE id = '${pendingSpace}';`, { tuples: true }).trim().split('\n').pop();
  assert.strictEqual(reviewer, admin, 'review must record which admin acted');
  const suspended = asRole('authenticated', `SELECT admin_review_space('${pendingSpace}'::uuid, 'suspend', 'Complaint from driver')::text;`);
  assert.strictEqual(suspended.status, 'suspended');
  console.log('  PASSED\n');

  console.log('Test 5: owners still cannot approve, publish or un-suspend their own listing...');
  // While suspended (still approved), the owner cannot reopen it
  setSession(owner, 'authenticated');
  expectDenied('authenticated', `UPDATE parking_spaces SET status = 'active' WHERE id = '${pendingSpace}';`, 'owner un-suspend');
  // Once rejected (unapproved), the owner cannot approve or publish it
  setSession(admin, 'authenticated');
  asRole('authenticated', `SELECT admin_review_space('${pendingSpace}'::uuid, 'reject', 'Needs clearer address')::text;`);
  setSession(owner, 'authenticated');
  expectDenied('authenticated', `UPDATE parking_spaces SET is_approved = TRUE WHERE id = '${pendingSpace}';`, 'owner self-approve');
  expectDenied('authenticated', `UPDATE parking_spaces SET status = 'active' WHERE id = '${pendingSpace}';`, 'owner self-publish');
  const state = psql(`SELECT status || '|' || is_approved FROM parking_spaces WHERE id = '${pendingSpace}';`, { tuples: true }).trim().split('\n').pop();
  assert.strictEqual(state, 'draft|false');
  console.log('  PASSED\n');

  console.log('Test 6: analytics give a full daily series and owner/driver/amount breakdowns...');
  setSession(admin, 'authenticated');
  const a = asRole('authenticated', `SELECT admin_analytics(7)::text;`);
  assert.strictEqual(a.daily.length, 7, 'one point per day, including days with no bookings');
  assert.strictEqual(a.daily.reduce((s, d) => s + Number(d.revenue), 0), 85);
  assert.strictEqual(Number(a.totals.revenue), 85);
  assert.strictEqual(Number(a.totals.platform_fees), 5);
  assert.strictEqual(Number(a.totals.owner_earnings), 80);
  assert.strictEqual(a.owners[0].email, 'p11.owner@idam.test');
  assert.strictEqual(Number(a.owners[0].earnings), 80);
  assert.strictEqual(a.drivers[0].email, 'p11.driver@idam.test');
  assert.strictEqual(Number(a.drivers[0].spent), 85);
  assert.strictEqual(a.drivers[0].bookings, 2);
  console.log('  PASSED\n');

  console.log('Test 7: bookings and users lists filter and search...');
  const unpaid = asRole('authenticated', `SELECT json_build_object('r', admin_list_bookings('pending', NULL, 50))::text;`).r;
  assert.strictEqual(unpaid.length, 1);
  assert.strictEqual(unpaid[0].pass_code, 'IDM-ADM2-BBBB');
  assert.strictEqual(asRole('authenticated', `SELECT json_build_object('r', admin_list_bookings(NULL, 'adm1', 50))::text;`).r.length, 1);
  const users = asRole('authenticated', `SELECT json_build_object('r', admin_list_users('dev', 50))::text;`).r;
  assert.strictEqual(users.length, 1);
  assert.deepStrictEqual([users[0].bookings, Number(users[0].spent)], [2, 85]);
  console.log('  PASSED\n');

  console.log('Test 8: paying opens an owner payout; clients cannot touch the ledger...');
  const payoutOf = (bookingId) =>
    psql(`SELECT json_build_object('status', status, 'amount', amount, 'owner', owner_id)::text FROM owner_payouts WHERE booking_id = '${bookingId}';`, { tuples: true })
      .split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l))[0];
  const first = payoutOf(paid.booking_id);
  assert.deepStrictEqual([first.status, Number(first.amount), first.owner], ['awaiting_account', 80, owner], 'owner share = 85 paid - 5 fee, waiting for a bank account');
  for (const role of ['anon', 'authenticated']) {
    setSession(role === 'anon' ? null : owner, role);
    expectDenied(role, `SELECT count(*) FROM owner_payouts;`, `${role} read ledger`);
    expectDenied(role, `UPDATE owner_payouts SET status = 'released';`, `${role} edit ledger`);
    expectDenied(role, `INSERT INTO owner_payout_accounts (owner_id, activation_status) VALUES ('${owner}', 'activated');`, `${role} self-activate`);
  }
  setSession(null, 'anon');
  expectDenied('anon', `SELECT owner_payout_overview()::text;`, 'anon payout overview');
  setSession(owner, 'authenticated');
  const mine = asRole('authenticated', `SELECT owner_payout_overview()::text;`);
  assert.strictEqual(mine.has_listings, true);
  assert.strictEqual(mine.account, null);
  assert.strictEqual(Number(mine.totals.waiting_for_bank), 80);
  assert.deepStrictEqual(mine.payouts.map(p => p.pass_code), ['IDM-ADM1-AAAA']);
  setSession(driver, 'authenticated');
  const notMine = asRole('authenticated', `SELECT owner_payout_overview()::text;`);
  assert.deepStrictEqual([notMine.has_listings, notMine.payouts.length], [false, 0], 'drivers see no one else\'s payouts');
  try {
    asRole('authenticated', `SELECT admin_payouts(NULL)::text;`);
    assert.fail('driver read admin_payouts');
  } catch (e) {
    assert.match(e.stderr?.toString() || String(e), /Admins only/);
  }
  console.log('  PASSED\n');

  console.log('Test 9: account activation releases waiting payouts; cancellations drop or reverse them...');
  setSession(null, 'service_role');
  asRole('service_role', `INSERT INTO owner_payout_accounts (owner_id, razorpay_account_id, activation_status) VALUES ('${owner}', 'acc_test1', 'under_review');`);
  assert.strictEqual(payoutOf(paid.booking_id).status, 'awaiting_account', 'not released before Razorpay activates the account');
  asRole('service_role', `UPDATE owner_payout_accounts SET activation_status = 'activated' WHERE owner_id = '${owner}';`);
  assert.strictEqual(payoutOf(paid.booking_id).status, 'ready');

  // Pay the second booking: the account is live, so it is ready straight away
  const second = psql(`SELECT id FROM bookings WHERE pass_code = 'IDM-ADM2-BBBB';`, { tuples: true }).trim().split('\n').pop();
  asRole('service_role', `SELECT record_payment_reconciliation('${second}'::uuid, 'pay_adm_2', 45, 'Razorpay', 'success')::text;`);
  assert.strictEqual(payoutOf(second).status, 'ready');
  // Sent and on hold, then the driver cancels -> must be taken back
  asRole('service_role', `UPDATE owner_payouts SET status = 'on_hold', razorpay_transfer_id = 'trf_test2' WHERE booking_id = '${second}';`);
  setSession(driver, 'authenticated');
  assert.strictEqual(asRole('authenticated', `SELECT cancel_booking('${second}'::uuid, 'Plans changed')::text;`).success, true);
  assert.strictEqual(payoutOf(second).status, 'reversal_pending');

  // Paid and cancelled before anything was sent -> simply cancelled
  const third = asRole('authenticated', `SELECT create_verified_booking('${liveSpace}'::uuid, 'bike', NOW() + INTERVAL '8 hours', 1, 'TN 01 BB 2222', 'Dev', '902', ARRAY[]::text[], 'h_adm_3', 'IDM-ADM3-CCCC', NULL)::text;`);
  setSession(null, 'service_role');
  asRole('service_role', `SELECT record_payment_reconciliation('${third.booking_id}'::uuid, 'pay_adm_3', 25, 'Razorpay', 'success')::text;`);
  assert.strictEqual(payoutOf(third.booking_id).status, 'ready');
  setSession(driver, 'authenticated');
  asRole('authenticated', `SELECT cancel_booking('${third.booking_id}'::uuid, NULL)::text;`);
  assert.strictEqual(payoutOf(third.booking_id).status, 'cancelled');

  // Released money is never silently changed by a late cancellation, but it is flagged
  asRole('service_role', `UPDATE owner_payouts SET status = 'released' WHERE booking_id = '${paid.booking_id}';`);
  setSession(driver, 'authenticated');
  asRole('authenticated', `SELECT cancel_booking('${paid.booking_id}'::uuid, 'No-show')::text;`);
  const late = psql(`SELECT status || '|' || COALESCE(last_error, '') FROM owner_payouts WHERE booking_id = '${paid.booking_id}';`, { tuples: true }).trim().split('\n').pop();
  assert.match(late, /^released\|Booking was cancelled after the payout was released$/);

  setSession(admin, 'authenticated');
  const ap = asRole('authenticated', `SELECT admin_payouts(NULL)::text;`);
  assert.strictEqual(ap.payouts.length, 3);
  assert.strictEqual(Number(ap.totals.released), 80);
  assert.strictEqual(Number(ap.totals.reversals), 40);
  assert.strictEqual(ap.totals.problems, 1);
  assert.deepStrictEqual(ap.owners.map(o => [o.email, o.activation_status]), [['p11.owner@idam.test', 'activated']]);
  assert.strictEqual(asRole('authenticated', `SELECT admin_payouts('reversal_pending')::text;`).payouts.length, 1);
  console.log('  PASSED\n');

  console.log('================================================================');
  console.log('ALL PHASE 11 ADMIN CONSOLE TESTS PASSED!');
  console.log('================================================================');
} finally {
  console.log(`\nCleaning up test schema ${testSchema}...`);
  execSync(`psql -d myapp -c "DROP SCHEMA IF EXISTS ${testSchema} CASCADE;"`, { stdio: 'inherit' });
}
