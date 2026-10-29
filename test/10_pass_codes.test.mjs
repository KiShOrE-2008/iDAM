import assert from 'node:assert';
import { generatePassCode, parseScannedQrPayload } from '../lib/parking/passSecurity.ts';

console.log('=== PHASE 10: PASS CODES & GATE INPUT PARSING ===\n');

console.log('Test 1: pass codes are IDM-XXXX-XXXX from a typeable alphabet...');
const codes = Array.from({ length: 20000 }, () => generatePassCode());
for (const code of codes.slice(0, 200)) {
  assert.match(code, /^IDM-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/, code);
  assert.doesNotMatch(code.slice(4), /[01OIL]/, `look-alike character in ${code}`);
}
console.log('  PASSED\n');

console.log('Test 2: 20,000 codes, no collisions (old 5-digit codes collided after a few hundred)...');
assert.strictEqual(new Set(codes).size, codes.length);
console.log('  PASSED\n');

console.log('Test 3: characters are spread evenly (no modulo bias)...');
const counts = new Map();
for (const code of codes) for (const ch of code.slice(4).replace('-', '')) counts.set(ch, (counts.get(ch) || 0) + 1);
assert.strictEqual(counts.size, 31, 'every alphabet character must appear');
const expected = (codes.length * 8) / 31;
for (const [ch, n] of counts) assert(Math.abs(n - expected) / expected < 0.1, `character ${ch} appears ${n} times, expected ~${expected}`);
console.log('  PASSED\n');

console.log('Test 4: the gate recognises typed codes (new and old) as pass codes, not QR tokens...');
for (const typed of ['IDM-7K2Q-9XMP', 'idm-7k2q-9xmp', ' IDM-7K2Q-9XMP ', 'IDM-82931']) {
  const parsed = await parseScannedQrPayload(typed);
  assert.strictEqual(parsed.isValidFormat, true, typed);
  assert.strictEqual(parsed.type, 'legacy_raw', typed);
  assert.strictEqual(parsed.passCode, typed.trim().toUpperCase(), typed);
  assert.strictEqual(parsed.tokenHash, undefined, `${typed} must not be treated as a QR token`);
}
const qr = await parseScannedQrPayload('IDAM:v2:0123456789abcdef0123456789abcdef');
assert.strictEqual(qr.type, 'v2_token');
assert.ok(qr.tokenHash, 'QR payload must yield a token hash');
for (const junk of ['IDM-', 'IDM-<script>', 'hello']) {
  assert.strictEqual((await parseScannedQrPayload(junk)).isValidFormat, false, junk);
}
console.log('  PASSED\n');

console.log('ALL PHASE 10 PASS CODE TESTS PASSED!');
