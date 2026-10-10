import { spawnSync } from 'node:child_process';
import path from 'node:path';

const testFiles = [
  { name: 'Phase 1: Database & Security (RLS, PostGIS RPCs, Schema)', path: 'scratch/test_phase1_database.mjs' },
  { name: 'Phase 2: Supabase Auth & Demo Isolation', path: 'scratch/test_auth_flow.mjs' },
  { name: 'Phase 3: Warm Minimal Design System & Standalone Navigation', path: 'scratch/test_phase3_design_and_navigation.mjs' },
  { name: 'Phase 4: Driver Reservation, Quotes & Payment Badges', path: 'scratch/test_driver_quote_and_recovery.mjs' },
  { name: 'Phase 5: User Garage, Wallet Presets & Support Hub', path: 'scratch/test_phase5_garage_and_support.mjs' },
  { name: 'Phase 6 & 7: Owner QR Scanner, Check-In/Check-Out & Security Hashes', path: 'scratch/test_owner_qr_checkin.mjs' },
  { name: 'Android Back Navigation: Capacitor Modal Priority Stack', path: 'scratch/test_back_navigation.mjs' },
  { name: 'Website Pages: Foundation, Product, Help, Legal & Routing (20 Routes)', path: 'scratch/test_website_pages.mjs' },
];

console.log('===============================================================');
console.log('   iDAM | இடம் — COMPREHENSIVE END-TO-END VERIFICATION SUITE   ');
console.log('===============================================================\n');

let totalSuites = testFiles.length;
let passedSuites = 0;
const results = [];

for (const test of testFiles) {
  process.stdout.write(`▶ Running: ${test.name}... `);
  const startTime = Date.now();
  const proc = spawnSync('node', [test.path], {
    encoding: 'utf-8',
    env: process.env
  });
  const duration = Date.now() - startTime;

  if (proc.status === 0) {
    passedSuites++;
    console.log(`✅ PASSED (${duration}ms)`);
    results.push({ name: test.name, status: 'PASSED', duration });
  } else {
    console.log(`❌ FAILED (${duration}ms)`);
    console.error(proc.stderr || proc.stdout);
    results.push({ name: test.name, status: 'FAILED', duration, error: proc.stderr });
  }
}

console.log('\n===============================================================');
console.log('                      VERIFICATION SUMMARY                     ');
console.log('===============================================================');
results.forEach((r, idx) => {
  const icon = r.status === 'PASSED' ? '✅' : '❌';
  console.log(`${icon} [${idx + 1}/${totalSuites}] ${r.name} (${r.duration}ms)`);
});

console.log('---------------------------------------------------------------');
console.log(`Total Suites: ${totalSuites} | Passed: ${passedSuites} | Failed: ${totalSuites - passedSuites}`);

if (passedSuites === totalSuites) {
  console.log('\n🎉 ALL PHASE 0 THROUGH PHASE 8 AUTOMATED TESTS PASSED CLEANLY!');
  process.exit(0);
} else {
  console.error('\n⚠️ Some test suites failed.');
  process.exit(1);
}
