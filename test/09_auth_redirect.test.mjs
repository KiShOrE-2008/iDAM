import assert from 'node:assert';
import { safeNextPath, loginUrlReturningTo } from '../lib/auth/redirect.ts';

console.log('=== PHASE 9: SIGN-IN RETURN PATH (OPEN-REDIRECT SAFETY) ===\n');

console.log('Test 1: pages on this site are allowed...');
assert.strictEqual(safeNextPath('/list-your-space'), '/list-your-space');
assert.strictEqual(safeNextPath('/explore'), '/explore');
assert.strictEqual(safeNextPath('%2Fmy-bookings'), '/my-bookings');
assert.strictEqual(safeNextPath('/pass/IDM-12345?x=1'), '/pass/IDM-12345?x=1');
console.log('  PASSED\n');

console.log('Test 2: anything that could leave the site falls back to home...');
for (const bad of [
  'https://evil.example', '//evil.example', '/\\evil.example', '%2F%2Fevil.example',
  'javascript:alert(1)', 'evil.example', '/%0d%0aLocation:x', '%E0%A4%A', '', null, undefined
]) {
  assert.strictEqual(safeNextPath(bad), '/', `must reject ${JSON.stringify(bad)}`);
}
console.log('  PASSED\n');

console.log('Test 3: never loops back to the sign-in pages...');
assert.strictEqual(safeNextPath('/login'), '/');
assert.strictEqual(safeNextPath('/signup?next=/x'), '/');
assert.strictEqual(safeNextPath('/login-help'), '/login-help');
console.log('  PASSED\n');

console.log('Test 4: login links carry the encoded return path...');
assert.strictEqual(loginUrlReturningTo('/list-your-space'), '/login?next=%2Flist-your-space');
assert.strictEqual(loginUrlReturningTo('https://evil.example'), '/login?next=%2F');
console.log('  PASSED\n');

console.log('ALL PHASE 9 SIGN-IN RETURN PATH TESTS PASSED!');
