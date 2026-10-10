// Automated Test for iDAM Authentication & Local Account Storage Logic
import assert from 'node:assert';

// Mock localStorage
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

const LOCAL_STORAGE_KEYS = {
  ACCOUNTS: 'idam_local_accounts',
  ACTIVE_USER: 'idam_active_user',
  DEMO_MODE: 'idam_demo_mode',
  DEMO_USER: 'idam_user',
};

const SEED_ACCOUNTS = [
  {
    id: 'seed_driver_1',
    name: 'Kishore Kumar',
    email: 'kishore.k@example.com',
    password: 'password123',
    phone: '+91 98765 43210',
    role: 'driver',
    vehicleNumber: 'TN 59 AZ 8899',
    vehicleType: 'car',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'seed_owner_1',
    name: 'Kishore (Meenakshi Parking)',
    email: 'owner@meenakshiparking.com',
    password: 'password123',
    phone: '+91 98765 43210',
    role: 'owner',
    vehicleNumber: 'TN 59 AZ 8899',
    vehicleType: 'car',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

function getLocalAccounts() {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCOUNTS);
  if (!raw) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCOUNTS, JSON.stringify(SEED_ACCOUNTS));
    return [...SEED_ACCOUNTS];
  }
  return JSON.parse(raw);
}

function saveLocalAccounts(accounts) {
  localStorage.setItem(LOCAL_STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
}

function signUp({ email, password, fullName, phone }) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();
  const cleanPassword = password.trim();
  const cleanPhone = phone?.trim() || '+91 98765 43210';

  if (!cleanName) return { success: false, error: 'Full name is required.' };
  if (!cleanEmail || !cleanEmail.includes('@')) return { success: false, error: 'A valid email address is required.' };
  if (!cleanPassword || cleanPassword.length < 6) return { success: false, error: 'Password must be at least 6 characters long.' };

  const accounts = getLocalAccounts();
  const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
  if (existing) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const newAccount = {
    id: `usr_${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    password: cleanPassword,
    phone: cleanPhone,
    role: 'driver',
    vehicleNumber: 'TN 59 AZ 8899',
    vehicleType: 'car',
    createdAt: new Date().toISOString(),
  };

  accounts.push(newAccount);
  saveLocalAccounts(accounts);

  const profile = {
    name: newAccount.name,
    email: newAccount.email,
    phone: newAccount.phone,
    role: newAccount.role,
    vehicleNumber: newAccount.vehicleNumber,
    vehicleType: newAccount.vehicleType,
  };

  localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_USER, JSON.stringify(profile));
  localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_USER);

  return { success: true, profile };
}

function signIn(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) return { success: false, error: 'Email and password are required.' };

  const accounts = getLocalAccounts();
  const account = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

  if (!account) {
    return { success: false, error: 'No account found with this email.' };
  }

  if (account.password && account.password !== cleanPassword) {
    return { success: false, error: 'Incorrect password.' };
  }

  const profile = {
    name: account.name,
    email: account.email,
    phone: account.phone || '+91 98765 43210',
    role: account.role || 'driver',
    vehicleNumber: account.vehicleNumber || 'TN 59 AZ 8899',
    vehicleType: account.vehicleType || 'car',
  };

  localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_USER, JSON.stringify(profile));
  localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_USER);

  return { success: true, profile };
}

function signOut() {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_USER);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_USER);
}

function startDemo(role = 'driver') {
  const demoProfile = role === 'owner' ? {
    name: 'Kishore (Meenakshi Parking)',
    phone: '+91 98765 43210',
    email: 'owner@meenakshiparking.com',
    role: 'owner',
    propertyName: 'Meenakshi Temple Square Smart Lot',
    propertyAddress: '124 West Masi Street, Madurai',
    totalSpots: 24,
    availableSpots: 8,
  } : {
    name: 'Kishore Kumar',
    phone: '+91 98765 43210',
    email: 'kishore.k@example.com',
    role: 'driver',
    vehicleNumber: 'TN 59 AZ 8899',
    vehicleType: 'car',
  };

  localStorage.setItem(LOCAL_STORAGE_KEYS.DEMO_MODE, 'true');
  localStorage.setItem(LOCAL_STORAGE_KEYS.DEMO_USER, JSON.stringify(demoProfile));
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_USER);

  return { isDemoMode: true, profile: demoProfile };
}

function exitDemo() {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_USER);
  const activeUserRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_USER);
  const profile = activeUserRaw ? JSON.parse(activeUserRaw) : null;
  return { isDemoMode: false, profile };
}

function updatePassword(email, newPassword) {
  const clean = newPassword.trim();
  if (!clean || clean.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }
  const accounts = getLocalAccounts();
  const target = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!target) {
    return { success: false, error: 'Account not found.' };
  }
  target.password = clean;
  saveLocalAccounts(accounts);
  return { success: true };
}

// ================= TEST SUITE =================
console.log('--- RUNNING AUTH FLOW UNIT TESTS ---');

// 1. Initial State
assert.strictEqual(localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_USER), null, 'Initial state has no active user');
console.log('✓ Initial state is strictly unauthenticated (no auto login)');

// 2. Sign Up with new credentials
const regResult = signUp({
  fullName: 'Ravi Shankar',
  email: 'ravi.shankar@example.com',
  password: 'raviPassword2026',
  phone: '+91 94433 22110'
});

assert.strictEqual(regResult.success, true, 'Registration succeeded');
assert.strictEqual(regResult.profile.name, 'Ravi Shankar', 'Profile name matches entered name');
assert.strictEqual(regResult.profile.email, 'ravi.shankar@example.com', 'Profile email matches entered email');
assert.notStrictEqual(regResult.profile.name, 'Kishore Kumar', 'User is NOT randomly signed up as Kishore Kumar');
console.log('✓ Real user registration preserves full name and email without Kishore Kumar overwrite');

// 3. Duplicate registration prevention
const dupResult = signUp({
  fullName: 'Another Ravi',
  email: 'ravi.shankar@example.com',
  password: 'password123'
});
assert.strictEqual(dupResult.success, false, 'Duplicate email registration fails');
assert.ok(dupResult.error.includes('already exists'), 'Duplicate error message clear');
console.log('✓ Duplicate registration rejected properly');

// 4. Sign Out
signOut();
assert.strictEqual(localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_USER), null, 'Sign out clears active user');
console.log('✓ Sign out cleanly resets auth storage');

// 5. Sign In with wrong password
const wrongPassResult = signIn('ravi.shankar@example.com', 'wrongpassword');
assert.strictEqual(wrongPassResult.success, false, 'Wrong password fails');
assert.ok(wrongPassResult.error.includes('Incorrect password'), 'Wrong password message clear');
console.log('✓ Wrong password rejected');

// 6. Sign In with unknown email
const unknownEmailResult = signIn('unknown@example.com', 'somePassword');
assert.strictEqual(unknownEmailResult.success, false, 'Unknown email fails');
assert.ok(unknownEmailResult.error.includes('No account found'), 'Unknown email message clear');
console.log('✓ Unknown email rejected (does NOT fallback to random user)');

// 7. Sign In with correct credentials
const validLoginResult = signIn('ravi.shankar@example.com', 'raviPassword2026');
assert.strictEqual(validLoginResult.success, true, 'Valid login succeeds');
assert.strictEqual(validLoginResult.profile.name, 'Ravi Shankar', 'Logged in profile name is correct');
assert.strictEqual(validLoginResult.profile.email, 'ravi.shankar@example.com', 'Logged in profile email is correct');
console.log('✓ Valid sign in succeeds with exact user credentials');

// 8. Sign In with Seed Account
const seedLogin = signIn('owner@meenakshiparking.com', 'password123');
assert.strictEqual(seedLogin.success, true, 'Seed owner login succeeds');
assert.strictEqual(seedLogin.profile.role, 'owner', 'Seed owner role matches');
console.log('✓ Seed account login works when credentials provided');

// 9. Demo Mode Driver Isolation
const demoDriver = startDemo('driver');
assert.strictEqual(demoDriver.isDemoMode, true, 'Driver demo mode active');
assert.strictEqual(demoDriver.profile.role, 'driver', 'Driver demo role is driver');
assert.strictEqual(localStorage.getItem(LOCAL_STORAGE_KEYS.DEMO_MODE), 'true', 'Demo mode flag set in storage');
assert.strictEqual(localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_USER), null, 'Real active user cleared during demo');
console.log('✓ Driver Demo Mode correctly isolated from real user account');

// 10. Demo Mode Owner Isolation
const demoOwner = startDemo('owner');
assert.strictEqual(demoOwner.isDemoMode, true, 'Owner demo mode active');
assert.strictEqual(demoOwner.profile.role, 'owner', 'Owner demo role is owner');
console.log('✓ Owner Demo Mode correctly isolated with owner properties');

// 11. Exit Demo Mode
const exitResult = exitDemo();
assert.strictEqual(exitResult.isDemoMode, false, 'Demo mode disabled on exit');
assert.strictEqual(localStorage.getItem(LOCAL_STORAGE_KEYS.DEMO_MODE), null, 'Demo mode flag removed from storage');
console.log('✓ Exit Demo Mode cleanly unsets demo flags and restores unauthenticated state');

// 12. Real Sign-In Overrides Demo Mode
startDemo('driver');
assert.strictEqual(localStorage.getItem(LOCAL_STORAGE_KEYS.DEMO_MODE), 'true');
const overrideLogin = signIn('ravi.shankar@example.com', 'raviPassword2026');
assert.strictEqual(overrideLogin.success, true, 'Login succeeds');
assert.strictEqual(localStorage.getItem(LOCAL_STORAGE_KEYS.DEMO_MODE), null, 'Demo flag automatically wiped on real sign-in');
assert.strictEqual(overrideLogin.profile.name, 'Ravi Shankar', 'Real user profile restored');
console.log('✓ Real sign-in automatically deactivates Demo Mode');

// 13. Password Recovery & Update
const shortPass = updatePassword('ravi.shankar@example.com', '12345');
assert.strictEqual(shortPass.success, false, 'Password shorter than 6 characters rejected');
assert.ok(shortPass.error.includes('at least 6 characters'));

const goodPass = updatePassword('ravi.shankar@example.com', 'newSecurePassword2026');
assert.strictEqual(goodPass.success, true, 'Password update succeeds');

signOut();
const oldLogin = signIn('ravi.shankar@example.com', 'raviPassword2026');
assert.strictEqual(oldLogin.success, false, 'Old password no longer works');

const newLogin = signIn('ravi.shankar@example.com', 'newSecurePassword2026');
assert.strictEqual(newLogin.success, true, 'Login with new updated password succeeds');
console.log('✓ Password recovery & update flow validated with credential verification');

console.log('ALL 13 PHASE 2 AUTHENTICATION & DEMO MODE ASSERTIONS PASSED! 🎉');
