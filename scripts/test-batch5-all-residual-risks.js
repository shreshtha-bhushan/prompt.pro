// scripts/test-batch5-all-residual-risks.js
// Verification suite for all residual risk mitigations (R-1 through R-6)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('============================================================');
console.log(' PROMPTPRO VERIFICATION: ALL RESIDUAL RISKS (R-1 to R-6)');
console.log('============================================================\n');

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failed++;
  }
}

// ─── 1. Risk R-1: Clerk JWT Expiry & Extension Session Resilience ──
console.log('--- 1. Risk R-1: Extension JWT Expiry & Session Resilience ---');

const swCode = fs.readFileSync('background/service-worker.js', 'utf8');

check(
  'service-worker.js: exports decodeJWTPayload',
  swCode.includes('function decodeJWTPayload(token)')
);

check(
  'service-worker.js: exports isJwtExpired with exp claim check',
  swCode.includes('function isJwtExpired(token)') && swCode.includes('payload.exp * 1000')
);

check(
  'service-worker.js: exports getCookieToken for __session cookie extraction',
  swCode.includes('async function getCookieToken(') && swCode.includes('chrome.cookies.getAll')
);

check(
  'service-worker.js: exports resolveFreshToken with automatic renewal',
  swCode.includes('async function resolveFreshToken(session, apiBase)')
);

check(
  'service-worker.js: OPTIMIZE_PROMPT has transparent 401 cookie retry',
  swCode.includes('OPTIMIZE_PROMPT 401, checking for fresh session cookie')
);

check(
  'service-worker.js: OPTIMIZE_PROMPT falls back to local synthesis on expired session',
  swCode.includes('swTrack(\'optimization_fallback_local\', { mode, error_type: \'SESSION_EXPIRED\' })')
);

check(
  'service-worker.js: UPGRADE_PROMPT has transparent 401 cookie retry',
  swCode.includes('UPGRADE_PROMPT 401 received, checking for fresh session cookie')
);

// ─── 2. Risk R-2: 180-Day Data Retention Policy & Automated Pruning ──
console.log('\n--- 2. Risk R-2: 180-Day Log Retention & Automated Pruning ---');

const pruneRoute = fs.readFileSync('web/src/app/api/admin/prune-logs/route.ts', 'utf8');
const vercelJson = fs.readFileSync('web/vercel.json', 'utf8');
const migrationSql = fs.readFileSync('supabase/migrations/20261104_history_retention_180d.sql', 'utf8');

check(
  'prune-logs route: exists and enforces 180-day retention threshold',
  pruneRoute.includes('const daysThreshold = 180;')
);

check(
  'prune-logs route: requires CRON_SECRET or Clerk Admin RBAC',
  pruneRoute.includes('process.env.CRON_SECRET') && pruneRoute.includes('getRole(adminUser) === "admin"')
);

check(
  'prune-logs route: exports maxDuration = 30',
  pruneRoute.includes('export const maxDuration = 30;')
);

check(
  'web/vercel.json: configures automated daily cron for prune-logs',
  vercelJson.includes('/api/admin/prune-logs') && vercelJson.includes('30 3 * * *')
);

check(
  'migration SQL: creates cleanup_old_optimization_logs function',
  migrationSql.includes('cleanup_old_optimization_logs') && migrationSql.includes('interval')
);

// ─── 3. Risk R-3: Serverless Execution Budget & Timeout Bounds ──
console.log('\n--- 3. Risk R-3: Serverless Timeout Budget & Retry Bounds ---');

const upgradeRoute = fs.readFileSync('web/src/app/api/upgrade/route.ts', 'utf8');
const optimizeRoute = fs.readFileSync('web/src/app/api/optimize/route.ts', 'utf8');

check(
  'upgrade route: exports maxDuration = 30',
  upgradeRoute.includes('export const maxDuration = 30;')
);

check(
  'optimize route: exports maxDuration = 30',
  optimizeRoute.includes('export const maxDuration = 30;')
);

check(
  'upgrade route: bounds OpenRouter call to { maxRetries: 1, timeoutMs: 11000 }',
  upgradeRoute.includes('maxRetries: 1, timeoutMs: 11000')
);

check(
  'optimize route: bounds OpenRouter call to { maxRetries: 1, timeoutMs: 11000 }',
  optimizeRoute.includes('maxRetries: 1, timeoutMs: 11000')
);

// ─── 4. Risk R-4: Host Composer DOM Mutation Watchdog ──
console.log('\n--- 4. Risk R-4: Host Composer Mutation Watchdog ---');

const mainJs = fs.readFileSync('content/main.js', 'utf8');

check(
  'main.js: captures focusin and pointerdown on document',
  mainJs.includes("document.addEventListener('focusin', this._onFocusIn, { capture: true, passive: true });") &&
  mainJs.includes("document.addEventListener('pointerdown', this._onInteraction, { capture: true, passive: true });")
);

check(
  'main.js: runs 2.5s liveness heartbeat interval',
  mainJs.includes('this._watchdogInterval = setInterval(') && mainJs.includes('2500')
);

check(
  'main.js: GeminiAdapter falls back to toolbar when send button is absent',
  mainJs.includes('const toolbar = this.getToolbar();\n        if (toolbar) return { parent: toolbar, before: null };')
);

// ─── 5. Risk R-5: Multi-Lambda Global Rate Limiting ──
console.log('\n--- 5. Risk R-5: Vercel KV / Upstash Redis Global Rate Limiting ---');

const ratelimitModule = fs.readFileSync('web/src/lib/ratelimit.ts', 'utf8');

check(
  'ratelimit.ts: supports process.env.KV_REST_API_URL',
  ratelimitModule.includes('process.env.KV_REST_API_URL')
);

check(
  'ratelimit.ts: supports process.env.KV_REST_API_TOKEN',
  ratelimitModule.includes('process.env.KV_REST_API_TOKEN')
);

check(
  'ratelimit.ts: maintains sliding-window counter',
  ratelimitModule.includes('Ratelimit.slidingWindow')
);

// ─── 6. Risk R-6: Atomic Credit Refund on Request Abort / Crash ──
console.log('\n--- 6. Risk R-6: Atomic Credit Refund on Abort ---');

check(
  'upgrade route: registers request.signal abort listener',
  upgradeRoute.includes('request.signal.addEventListener("abort"')
);

check(
  'optimize route: registers request.signal abort listener',
  optimizeRoute.includes('request.signal.addEventListener("abort"')
);

check(
  'upgrade route: wraps inference in try/finally safe refund',
  upgradeRoute.includes('safeRefund') && upgradeRoute.includes('finally {\n    if (!responseDelivered) {')
);

check(
  'optimize route: wraps inference in try/finally safe refund',
  optimizeRoute.includes('safeRefund') && optimizeRoute.includes('finally {\n    if (!responseDelivered) {')
);

// ─── Summary ───────────────────────────────────────────────────
console.log('\n============================================================');
console.log(` RESULTS: ${passed} passed, ${failed} failed (${Math.round((passed / (passed + failed)) * 100)}%)`);
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
}
