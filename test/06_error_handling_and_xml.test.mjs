import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('=== PHASE 6 & 7: ERROR HANDLING, 404 PAGES & XML SEO TESTS ===\n');

const projectRoot = process.cwd();

// Test 1: Sitemap XML Structure & Canonical URLs
console.log('Test 1: Validate public/sitemap.xml format & URL inclusion...');
const sitemapPath = path.resolve(projectRoot, 'public/sitemap.xml');
assert.ok(fs.existsSync(sitemapPath), 'public/sitemap.xml must exist');

const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
assert.ok(sitemapContent.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Sitemap must have valid XML declaration');
assert.ok(sitemapContent.includes('<urlset'), 'Sitemap must contain <urlset>');
assert.ok(sitemapContent.includes('<loc>https://idam.app/</loc>'), 'Sitemap must include root canonical URL');
assert.ok(sitemapContent.includes('<loc>https://idam.app/explore</loc>'), 'Sitemap must include /explore');
assert.ok(sitemapContent.includes('<loc>https://idam.app/list-your-space</loc>'), 'Sitemap must include /list-your-space');

// Exclusions check
assert.ok(!sitemapContent.includes('/pass/'), 'Sitemap must NOT expose private /pass/ routes');
assert.ok(!sitemapContent.includes('/my-bookings'), 'Sitemap must NOT expose /my-bookings');
assert.ok(!sitemapContent.includes('/owner<'), 'Sitemap must NOT expose private /owner portal');
console.log('  PASSED: Sitemap XML is valid and excludes private driver/pass paths.\n');

// Test 2: Robots.txt Rules & Sitemap Declaration
console.log('Test 2: Validate public/robots.txt rules...');
const robotsPath = path.resolve(projectRoot, 'public/robots.txt');
assert.ok(fs.existsSync(robotsPath), 'public/robots.txt must exist');

const robotsContent = fs.readFileSync(robotsPath, 'utf8');
assert.ok(robotsContent.includes('Sitemap: https://idam.app/sitemap.xml'), 'robots.txt must declare sitemap location');
assert.ok(robotsContent.includes('Disallow: /pass/'), 'robots.txt must disallow /pass/');
assert.ok(robotsContent.includes('Disallow: /my-bookings'), 'robots.txt must disallow /my-bookings');
assert.ok(robotsContent.includes('Disallow: /owner'), 'robots.txt must disallow /owner');
console.log('  PASSED: robots.txt protects private endpoints and links to sitemap.\n');

// Test 3: Catch-all 404 Route in App.tsx
console.log('Test 3: Verify catch-all 404 route in src/App.tsx...');
const appPath = path.resolve(projectRoot, 'src/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');
assert.ok(appContent.includes('<Route path="*" element={<NotFoundPage />} />'), 'App.tsx must register catch-all 404 route');
assert.ok(appContent.includes('<ErrorBoundary>'), 'App.tsx must be wrapped in ErrorBoundary');
assert.ok(appContent.includes('<NetworkStatus />'), 'App.tsx must include NetworkStatus banner');
console.log('  PASSED: Catch-all route, ErrorBoundary, and NetworkStatus verified in App.tsx.\n');

// Test 4: AndroidManifest Deep Linking Intent Filters
console.log('Test 4: Verify Android deep linking intent filters in AndroidManifest.xml...');
const manifestPath = path.resolve(projectRoot, 'android/app/src/main/AndroidManifest.xml');
const manifestContent = fs.readFileSync(manifestPath, 'utf8');
assert.ok(manifestContent.includes('android:host="idam.app"'), 'Manifest must configure idam.app host intent-filter');
assert.ok(manifestContent.includes('android:scheme="idam"'), 'Manifest must configure custom idam:// scheme filter');
assert.ok(manifestContent.includes('android.permission.CAMERA'), 'Manifest must declare CAMERA permission');
console.log('  PASSED: Android deep linking and camera permissions verified.\n');

// Test 5: Error Mapping & SQL Sanitization Engine
console.log('Test 5: Verify ErrorMessageMapper sanitizes database internals...');
const { mapToAppError } = await import('../lib/error/errorMapper.ts');

// Case A: Raw PostgreSQL Table Missing Error (42P01)
const pgError = { code: '42P01', message: 'relation "secret_table" does not exist in public schema' };
const sanitizedA = mapToAppError(pgError);
assert.strictEqual(sanitizedA.category, 'SERVER_ERROR');
assert.ok(!sanitizedA.message.includes('relation'), 'SQL internals must never leak to user message');
assert.ok(!sanitizedA.message.includes('secret_table'), 'Table names must never leak to user message');
assert.ok(sanitizedA.correlationId && sanitizedA.correlationId.startsWith('err_'), 'Correlation ID must be generated');

// Case B: Slot Capacity Conflict
const conflictError = { code: '409', message: 'NO_CAPACITY_AVAILABLE' };
const sanitizedB = mapToAppError(conflictError);
assert.strictEqual(sanitizedB.category, 'BOOKING_CONFLICT');
assert.strictEqual(sanitizedB.statusCode, 409);
assert.ok(sanitizedB.message.includes('reserved by another driver'), 'Conflict message must explain slot contention');

// Case C: Timeout / Abort Error
const timeoutError = { code: 'ABORT_ERR', message: 'The user aborted a request.' };
const sanitizedC = mapToAppError(timeoutError);
assert.strictEqual(sanitizedC.category, 'REQUEST_TIMEOUT');
assert.strictEqual(sanitizedC.statusCode, 408);

console.log('  PASSED: All error sanitization rules and correlation IDs behave as designed.\n');

console.log('================================================================');
console.log('ALL PHASE 6 & 7 ERROR HANDLING, 404 & XML TESTS PASSED!');
console.log('================================================================\n');
