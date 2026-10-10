import assert from 'node:assert/strict';

// Mock localStorage for Node test runner
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};
globalThis.window = globalThis;

// Dynamic import of garageService
const {
  getUserVehicles,
  saveUserVehicles,
  addVehicle,
  deleteVehicle,
  setDefaultVehicle,
  getDefaultVehicle,
  getWalletBalance,
  getWalletTransactions,
  topUpWallet
} = await import('../lib/user/garageService.ts');

console.log('🧪 Starting Phase 5 Garage & Support Suite...\n');

// 1. Initial Garage State
const initialVehicles = getUserVehicles();
assert.ok(Array.isArray(initialVehicles), 'getUserVehicles should return an array');
assert.ok(initialVehicles.length >= 2, 'Default garage should have at least 2 vehicles');
const initialDefault = getDefaultVehicle();
assert.ok(initialDefault, 'Initial default vehicle should exist');
assert.equal(initialDefault.default, true, 'Default flag should be true');
console.log('✅ Initial garage vehicles loaded correctly:', initialVehicles.map(v => v.plate).join(', '));

// 2. Add New Vehicle
const afterAdd = addVehicle({
  plate: 'TN 59 XY 9999',
  type: 'EV',
  nickname: 'Electric Nexon',
  makeDefault: false
});
assert.equal(afterAdd.length, initialVehicles.length + 1, 'Should have 1 more vehicle');
const added = afterAdd.find(v => v.plate === 'TN 59 XY 9999');
assert.ok(added, 'New vehicle should exist in garage');
assert.equal(added.type, 'EV');
assert.equal(added.nickname, 'Electric Nexon');
assert.equal(added.default, false);
console.log('✅ Add vehicle works with EV type and nickname');

// 3. Set Default Vehicle
const afterSetDefault = setDefaultVehicle(added.id);
const newDefault = getDefaultVehicle();
assert.equal(newDefault.id, added.id, 'New default vehicle should match');
assert.equal(newDefault.plate, 'TN 59 XY 9999');
const oldDefault = afterSetDefault.find(v => v.id === initialDefault.id);
assert.equal(oldDefault.default, false, 'Old default should no longer be marked default');
console.log('✅ setDefaultVehicle correctly updates primary default');

// 4. Delete Vehicle & Fallback Default
const afterDelete = deleteVehicle(added.id);
assert.equal(afterDelete.length, initialVehicles.length, 'Vehicle should be removed');
const reevaluatedDefault = getDefaultVehicle();
assert.ok(reevaluatedDefault, 'A fallback default vehicle should still exist after deleting default');
assert.equal(reevaluatedDefault.default, true);
console.log('✅ deleteVehicle successfully removes vehicle and reassigns default');

// 5. Wallet Initial Balance
const initialBalance = getWalletBalance();
assert.equal(initialBalance, 500, 'Initial wallet balance should be ₹500');
const initialTxns = getWalletTransactions();
assert.ok(Array.isArray(initialTxns), 'Transactions should be an array');
console.log('✅ Wallet initial balance is ₹500');

// 6. Wallet Top-Up
const topUpResult = topUpWallet(500);
assert.equal(topUpResult.newBalance, 1000, 'Balance should increase to ₹1000');
assert.equal(getWalletBalance(), 1000, 'Persisted wallet balance should be ₹1000');
assert.ok(topUpResult.transactions.length > initialTxns.length, 'New transaction record should be created');
assert.equal(topUpResult.transactions[0].amount, 500);
console.log('✅ topUpWallet updates balance and adds transaction');

// 7. Successive Top-Up Preset ₹200
const topUp200 = topUpWallet(200);
assert.equal(topUp200.newBalance, 1200);
console.log('✅ Preset ₹200 top-up brings balance to ₹1200');

console.log('\n🎉 ALL 7 PHASE 5 GARAGE & WALLET ASSERTIONS PASSED!');
