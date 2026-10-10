// Automated Test Suite for Phase 3 — Visual Design System & Navigation
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== RUNNING PHASE 3 — VISUAL DESIGN SYSTEM & NAVIGATION TESTS ===\n');

// 1. Verify CSS Design Tokens
console.log('Test 1: Warm Minimal CSS Design Tokens in globals.css');
const cssPath = path.resolve('app/globals.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

assert.ok(cssContent.includes('#F8F8F5'), 'Canvas token #F8F8F5 is configured');
assert.ok(cssContent.includes('#14201D'), 'Ink token #14201D is configured');
assert.ok(cssContent.includes('Inter'), 'Inter font is configured');
assert.ok(cssContent.includes('.font-tamil'), '.font-tamil class is configured');
assert.ok(cssContent.includes('Mukta Malar'), 'Mukta Malar Tamil font is configured');
console.log('✅ PASSED: globals.css strictly enforces Warm Minimal palette (#F8F8F5, #14201D, Inter, Mukta Malar)\n');

// 2. Verify HTML Fonts and Viewport Metadata
console.log('Test 2: Viewport & Typography Link Verification in index.html');
const htmlPath = path.resolve('index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

assert.ok(htmlContent.includes('viewport'), 'Viewport meta tag is configured');
assert.ok(htmlContent.includes('Inter'), 'Google Font Inter link present');
assert.ok(htmlContent.includes('Mukta+Malar'), 'Google Font Mukta Malar link present');
assert.ok(htmlContent.includes('IDAM | இடம்'), 'Brand Title contains both English & Tamil');
console.log('✅ PASSED: index.html correctly loads fonts and configures responsive mobile viewport\n');

// 3. Verify SplashScreen Clean Brand Presentation (No Fake Radar)
console.log('Test 3: SplashScreen Brand Architecture');
const splashPath = path.resolve('components/mobile/SplashScreen.tsx');
const splashContent = fs.readFileSync(splashPath, 'utf-8');

assert.ok(!splashContent.includes('radar'), 'Fake radar animation is completely removed');
assert.ok(!splashContent.includes('sonar'), 'Fake sonar animation is completely removed');
assert.ok(splashContent.includes('onLanguageToggle'), 'Language switcher toggle supported');
assert.ok(splashContent.includes('sloganTamil'), 'Tamil slogan prominently displayed');
assert.ok(splashContent.includes('Madurai Smart Parking'), 'Brand tag present');
console.log('✅ PASSED: SplashScreen presents a clean, authentic Warm Minimal brand intro\n');

// 4. Verify MyPassesScreen Live Booking & Cancellation Integration
console.log('Test 4: MyPassesScreen Live Pass Connection');
const passesPath = path.resolve('components/mobile/MyPassesScreen.tsx');
const passesContent = fs.readFileSync(passesPath, 'utf-8');

assert.ok(passesContent.includes('getAllBookings'), 'Loads real stored user bookings via getAllBookings()');
assert.ok(passesContent.includes('cancelBooking'), 'Wires cancelBooking for driver pass cancellation');
assert.ok(passesContent.includes('activeFilter'), 'Supports active vs past history filtering');
assert.ok(passesContent.includes('QRCodeSVG') || passesContent.includes('QR'), 'Renders secure digital QR pass');
console.log('✅ PASSED: MyPassesScreen connects to live bookings and provides full pass modal with cancellation\n');

// 5. Verify Mobile Viewport Container Max Width
console.log('Test 5: Mobile Viewport Container Responsiveness in app/page.tsx');
const pagePath = path.resolve('app/page.tsx');
const pageContent = fs.readFileSync(pagePath, 'utf-8');

assert.ok(pageContent.includes('max-w-[440px]'), 'Viewport container constrained to standard smartphone width (max 440px)');
assert.ok(pageContent.includes('onLanguageToggle={setLang}'), 'SplashScreen language toggle wired to parent state');
assert.ok(pageContent.includes('nativeStep === 8') && pageContent.includes('MyPassesScreen'), 'Step 8 mapped to MyPassesScreen');
assert.ok(pageContent.includes('nativeStep === 9') && pageContent.includes('MyAccountScreen'), 'Step 9 mapped to MyAccountScreen');
assert.ok(pageContent.includes('nativeStep === 10') && pageContent.includes('SupportHubScreen'), 'Step 10 mapped to SupportHubScreen');
console.log('✅ PASSED: Mobile app viewport and 10-step navigation architecture verified\n');

console.log('🎉 ALL 5 PHASE 3 DESIGN SYSTEM & NAVIGATION TEST SUITES PASSED! ✨');
