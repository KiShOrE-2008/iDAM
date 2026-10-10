import fs from 'fs';
import path from 'path';

const projectRoot = '/run/media/kishore/kishore-project/GIT/park';

console.log('--- iDAM Website Pages Verification Suite ---\n');

const plannedRoutes = [
  { path: '/', file: 'app/page.tsx', name: 'Home' },
  { path: '/about', file: 'app/about/page.tsx', name: 'About Us' },
  { path: '/features', file: 'app/features/page.tsx', name: 'Features' },
  { path: '/how-it-works', file: 'app/how-it-works/page.tsx', name: 'How It Works' },
  { path: '/owners', file: 'app/owners/page.tsx', name: 'For Parking Owners' },
  { path: '/faq', file: 'app/faq/page.tsx', name: 'Help & FAQ' },
  { path: '/contact', file: 'app/contact/page.tsx', name: 'Contact Us' },
  { path: '/privacy-policy', file: 'app/privacy-policy/page.tsx', name: 'Privacy Policy' },
  { path: '/terms', file: 'app/terms/page.tsx', name: 'Terms of Service' },
  { path: '/cancellation-refund', file: 'app/cancellation-refund/page.tsx', name: 'Cancellation & Refunds' },
  { path: '/account-deletion', file: 'app/account-deletion/page.tsx', name: 'Account Deletion' },
  { path: '/cookie-policy', file: 'app/cookie-policy/page.tsx', name: 'Cookie Policy' },
  { path: '/accessibility', file: 'app/accessibility/page.tsx', name: 'Accessibility Statement' },
  { path: '/security', file: 'app/security/page.tsx', name: 'Security' },
  { path: '/privacy-requests', file: 'app/privacy-requests/page.tsx', name: 'Privacy Requests' },
  { path: '/explore', file: 'app/explore/page.tsx', name: 'Explore Parking' },
  { path: '/list-your-space', file: 'app/list-your-space/page.tsx', name: 'List Your Space' },
  { path: '/login', file: 'app/login/page.tsx', name: 'Login' },
  { path: '/signup', file: 'app/signup/page.tsx', name: 'Signup' },
  { path: '/my-bookings', file: 'app/my-bookings/page.tsx', name: 'My Bookings' }
];

let allPassed = true;

// 1. File existence & export checks
console.log('1. Checking route file existence and default exports:');
for (const r of plannedRoutes) {
  const fullPath = path.join(projectRoot, r.file);
  if (!fs.existsSync(fullPath)) {
    console.error(`  ❌ Missing file: ${r.file} for route ${r.path}`);
    allPassed = false;
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  if (!content.includes('export default')) {
    console.error(`  ❌ Missing default export in: ${r.file}`);
    allPassed = false;
    continue;
  }
  console.log(`  ✅ ${r.name.padEnd(25)} (${r.path}) -> ${r.file} exists & has default export`);
}

// 2. HTTP Server status check
console.log('\n2. Testing HTTP endpoint response codes (dev server):');
for (const r of plannedRoutes) {
  try {
    const res = await fetch(`http://localhost:3000${r.path}`);
    if (res.status === 200) {
      console.log(`  ✅ HTTP 200 OK: ${r.path.padEnd(24)} -> OK`);
    } else {
      console.error(`  ❌ HTTP ${res.status}: ${r.path}`);
      allPassed = false;
    }
  } catch (err) {
    console.error(`  ❌ Fetch error for ${r.path}:`, err.message);
    allPassed = false;
  }
}

// 3. Check App.tsx registration
console.log('\n3. Checking App.tsx router registration:');
const appTsx = fs.readFileSync(path.join(projectRoot, 'src/App.tsx'), 'utf8');
for (const r of plannedRoutes) {
  if (r.path === '/') continue;
  if (!appTsx.includes(`path="${r.path}"`)) {
    console.error(`  ❌ Route ${r.path} not explicitly found in src/App.tsx`);
    allPassed = false;
  } else {
    console.log(`  ✅ Registered route: ${r.path}`);
  }
}

// 4. Check Warm Minimal color tokens in website components
console.log('\n4. Verifying Design Tokens & Bilingual attributes:');
const checkTokens = ['app/about/page.tsx', 'app/features/page.tsx', 'app/how-it-works/page.tsx', 'app/owners/page.tsx', 'app/faq/page.tsx', 'app/contact/page.tsx'];
for (const rel of checkTokens) {
  const content = fs.readFileSync(path.join(projectRoot, rel), 'utf8');
  const hasPageContainer = content.includes('PageContainer');
  const hasTamil = content.includes('titleTa') || content.includes('font-tamil');
  if (hasPageContainer && hasTamil) {
    console.log(`  ✅ ${rel.padEnd(28)} -> PageContainer + Tamil strings verified`);
  } else {
    console.warn(`  ⚠️ ${rel.padEnd(28)} -> PageContainer: ${hasPageContainer}, Tamil: ${hasTamil}`);
  }
}

console.log(`\nOverall Test Result: ${allPassed ? 'ALL CHECKS PASSED ✅' : 'SOME CHECKS FAILED ❌'}`);
if (!allPassed) process.exit(1);
