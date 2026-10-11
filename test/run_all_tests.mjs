import { execSync } from 'child_process';

const testSuites = [
  { name: 'Phase 1: Migration Idempotency & Schema Freshness', file: 'test/01_migrations_idempotency.test.mjs' },
  { name: 'Phase 2: Authentication & Security Boundaries', file: 'test/02_security_boundaries.test.mjs' },
  { name: 'Phase 3: Booking Engine & Concurrency Locking', file: 'test/03_booking_concurrency.test.mjs' },
  { name: 'Phase 4: Payment Processing & HMAC Verification', file: 'test/04_payment_processing.test.mjs' },
  { name: 'Phase 5: QR Pass Verification & Check-In Lifecycle', file: 'test/05_qr_checkin_lifecycle.test.mjs' },
  { name: 'Phase 6: Error Handling, 404 Pages & XML SEO', file: 'test/06_error_handling_and_xml.test.mjs' }
];

console.log('================================================================');
console.log('       iDAM COMPREHENSIVE AUTOMATED TEST SUITE RUNNER           ');
console.log('================================================================\n');

let passedCount = 0;
let failedCount = 0;
const results = [];

for (const suite of testSuites) {
  console.log(`▶ RUNNING: ${suite.name}`);
  const startTime = Date.now();
  try {
    execSync(`node --import tsx ${suite.file}`, {
      stdio: 'inherit',
      env: process.env
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  PASSED: ${suite.name} (${duration}s)\n`);
    results.push({ name: suite.name, status: 'PASSED', duration });
    passedCount++;
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`  FAILED: ${suite.name} (${duration}s)`);
    if (err?.status !== undefined) {
      console.error(`  Exit status: ${err.status}`);
    }
    if (err?.stderr) {
      console.error('  stderr:');
      console.error(err.stderr.toString());
    }
    if (err?.stdout) {
      console.error('  stdout:');
      console.error(err.stdout.toString());
    }
    console.error(err?.stack || err);
    console.error('');
    results.push({ name: suite.name, status: 'FAILED', duration });
    failedCount++;
  }
}

console.log('================================================================');
console.log('                       TEST EXECUTION SUMMARY                   ');
console.log('================================================================');
results.forEach(r => {
  const icon = r.status === 'PASSED' ? 'PASSED' : 'FAILED';
  console.log(`[${icon}] ${r.name} - ${r.duration}s`);
});
console.log('----------------------------------------------------------------');
console.log(`Total: ${testSuites.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
console.log('================================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('All automated integration and security suites passed successfully!\n');
  process.exit(0);
}
