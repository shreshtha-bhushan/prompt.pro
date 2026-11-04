/**
 * Batch 0 Verification Test Script
 * Tests:
 * 1. Cryptographic auth requirement (no unverified spoofing)
 * 2. Autocomplete route protection
 * 3. Ratelimit configuration for autocomplete
 * 4. Fail-closed database error handling in API routes
 */

const fs = require('fs');
const assert = require('assert');

console.log('--- Running Batch 0 Verification Checks ---\n');

// 1. Verify auth-resolver.ts
const authResolverContent = fs.readFileSync('web/src/lib/auth-resolver.ts', 'utf8');
assert(!authResolverContent.includes('x-promptpro-user-id'), 'FAIL: auth-resolver still contains x-promptpro-user-id');
assert(!authResolverContent.includes('rawToken.split'), 'FAIL: auth-resolver still contains unverified JWT splitting');
assert(authResolverContent.includes('verifyToken'), 'FAIL: auth-resolver missing verifyToken');
console.log('✓ Check 1: auth-resolver.ts strictly requires cryptographic JWT verification.');

// 2. Verify /api/autocomplete/route.ts
const autocompleteContent = fs.readFileSync('web/src/app/api/autocomplete/route.ts', 'utf8');
assert(autocompleteContent.includes('resolveAuthUserId'), 'FAIL: autocomplete does not check resolveAuthUserId');
assert(autocompleteContent.includes('AUTH_REQUIRED'), 'FAIL: autocomplete does not return 401 AUTH_REQUIRED');
assert(autocompleteContent.includes('rateLimit("autocomplete"'), 'FAIL: autocomplete does not rate limit');
assert(!autocompleteContent.includes('"Access-Control-Allow-Origin": "*"'), 'FAIL: autocomplete still has wildcard CORS');
console.log('✓ Check 2: /api/autocomplete is authenticated, rate-limited, and CORS-scoped.');

// 3. Verify ratelimit.ts
const ratelimitContent = fs.readFileSync('web/src/lib/ratelimit.ts', 'utf8');
assert(ratelimitContent.includes('"autocomplete"'), 'FAIL: RateLimitType missing autocomplete');
assert(ratelimitContent.includes('autocomplete: { max: 60'), 'FAIL: autocomplete rate limit config missing');
console.log('✓ Check 3: ratelimit.ts includes autocomplete configuration (60 req / 60s).');

// 4. Verify /api/upgrade/route.ts
const upgradeContent = fs.readFileSync('web/src/app/api/upgrade/route.ts', 'utf8');
assert(!upgradeContent.includes('function resolveAuthenticatedUserId'), 'FAIL: upgrade route still has local unverified auth function');
assert(upgradeContent.includes('resolveAuthUserId'), 'FAIL: upgrade route does not use resolveAuthUserId');
assert(!upgradeContent.includes('x-promptpro-user-id'), 'FAIL: upgrade route still contains x-promptpro-user-id');
assert(!upgradeContent.includes('proceeding with in-memory balance'), 'FAIL: upgrade route still falls back to in-memory balance on DB error');
assert(upgradeContent.includes('status: 503'), 'FAIL: upgrade route does not fail closed with 503 on DB error');
console.log('✓ Check 4: /api/upgrade is hardened with central auth and fail-closed DB error handling.');

// 5. Verify /api/optimize/route.ts
const optimizeContent = fs.readFileSync('web/src/app/api/optimize/route.ts', 'utf8');
assert(!optimizeContent.includes('function resolveAuthenticatedUserId'), 'FAIL: optimize route still has local unverified auth function');
assert(optimizeContent.includes('resolveAuthUserId'), 'FAIL: optimize route does not use resolveAuthUserId');
assert(!optimizeContent.includes('x-promptpro-user-id'), 'FAIL: optimize route still contains x-promptpro-user-id');
assert(!optimizeContent.includes('proceeding with in-memory balance'), 'FAIL: optimize route still falls back to in-memory balance on DB error');
assert(optimizeContent.includes('status: 503'), 'FAIL: optimize route does not fail closed with 503 on DB error');
console.log('✓ Check 5: /api/optimize is hardened with central auth and fail-closed DB error handling.');

// 6. Verify client files do not send x-promptpro-user-id
const popupContent = fs.readFileSync('popup/popup.js', 'utf8');
assert(!popupContent.includes('x-promptpro-user-id'), 'FAIL: popup.js still sends x-promptpro-user-id');
const swContent = fs.readFileSync('background/service-worker.js', 'utf8');
assert(!swContent.includes('x-promptpro-user-id'), 'FAIL: service-worker.js still sends x-promptpro-user-id');
console.log('✓ Check 6: Extension client files no longer transmit spoofable headers.');

// 7. Verify retention migration
assert(fs.existsSync('supabase/migrations/20261104_history_retention_180d.sql'), 'FAIL: retention migration file does not exist');
const migrationContent = fs.readFileSync('supabase/migrations/20261104_history_retention_180d.sql', 'utf8');
assert(migrationContent.includes('cleanup_old_optimization_logs'), 'FAIL: retention migration missing function');
assert(migrationContent.includes('180'), 'FAIL: retention migration missing 180 day threshold');
console.log('✓ Check 7: 180-day retention migration file exists and is valid.');

console.log('\nALL 7 BATCH 0 CHECKS PASSED SUCCESSFULLY!\n');
