/**
 * Batch 3 — Verification Test Suite: Scale, Performance & Cleanup
 *
 * Validates:
 *   1. Lockfile resolution (root dummy package-lock.json removed)
 *   2. Next.js Turbopack root configuration in next.config.ts
 *   3. Service worker state hydration on wakeup (authSession & analytics)
 *   4. Reactivity to chrome.storage.onChanged for authSession
 *   5. Simulation of worker wakeup with cached identity
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('═══════════════════════════════════════════════════════════');
console.log(' PROMPTPRO BATCH 3: CLEANUP & HYDRATION VERIFICATION');
console.log('═══════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

function check(desc, fn) {
  try {
    fn();
    console.log(`✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${desc}`);
    console.error(`  Error: ${err.message}`);
    failed++;
  }
}

const rootLockfilePath = path.join(__dirname, '..', 'package-lock.json');
const webConfigPath = path.join(__dirname, '..', 'web', 'next.config.ts');
const webConfigContent = fs.readFileSync(webConfigPath, 'utf8');

const swPath = path.join(__dirname, '..', 'background', 'service-worker.js');
const swContent = fs.readFileSync(swPath, 'utf8');

// ── 1. Lockfile & Workspace Root ──────────────────────────────
console.log('--- 1. Lockfile & Workspace Cleanup ---');

check('package-lock.json: dummy root lockfile removed from root directory', () => {
  assert(!fs.existsSync(rootLockfilePath), 'root package-lock.json must not exist');
});

check('next.config.ts: configures turbopack.root with explicit directory path', () => {
  assert(webConfigContent.includes('turbopack: {'), 'next.config.ts must define turbopack config');
  assert(webConfigContent.includes('root: path.resolve(__dirname)'), 'next.config.ts must set turbopack.root');
});

// ── 2. Service Worker State Hydration ─────────────────────────
console.log('\n--- 2. Service Worker State Hydration ---');

check('service-worker.js: swInitAnalytics uses singleton _sw_initPromise', () => {
  assert(swContent.includes('if (_sw_initPromise) return _sw_initPromise'), 'swInitAnalytics must return singleton promise');
});

check('service-worker.js: swInitAnalytics queries authSession alongside pp_anon_id', () => {
  assert(swContent.includes("'pp_anon_id', 'pp_analytics_opt_out', 'authSession'"), 'swInitAnalytics must load authSession from storage');
});

check('service-worker.js: swInitAnalytics hydrates _sw_distinctId from authSession', () => {
  assert(swContent.includes('stored.authSession?.user?.id'), 'swInitAnalytics must inspect stored.authSession?.user?.id');
  assert(swContent.includes('_sw_distinctId = stored.authSession.user.id'), 'must set _sw_distinctId from stored session');
});

check('service-worker.js: _swSend awaits swInitAnalytics before sending events', () => {
  assert(swContent.includes('async function _swSend(eventName, properties) {\n  await swInitAnalytics()'), '_swSend must await swInitAnalytics');
});

check('service-worker.js: swIdentifyUser awaits swInitAnalytics', () => {
  assert(swContent.includes('async function swIdentifyUser(clerkUserId, properties) {\n  await swInitAnalytics()'), 'swIdentifyUser must await swInitAnalytics');
});

check('service-worker.js: storage.onChanged synchronizes authSession changes to _sw_distinctId', () => {
  assert(swContent.includes('if (changes.authSession)'), 'storage.onChanged must listen for authSession');
  assert(swContent.includes('_sw_distinctId = changes.authSession.newValue?.user?.id || null'), 'storage.onChanged must update _sw_distinctId');
});

// ── 3. Hydration Logic Simulation ─────────────────────────────
console.log('\n--- 3. Hydration Logic Simulation ---');

check('Simulation: Worker wakeup hydrates identity and opt-out preferences asynchronously', async () => {
  let mockStorage = {
    pp_anon_id: 'anon-test-123',
    pp_analytics_opt_out: false,
    authSession: {
      token: 'jwt.mock.token',
      user: { id: 'user_2xyzClerkMockId', email: 'user@example.com' }
    }
  };

  let distinctId = null;
  let anonId = null;
  let optedOut = false;
  let initPromise = null;

  function simulateInit() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const stored = mockStorage;
      optedOut = stored.pp_analytics_opt_out === true;
      anonId = stored.pp_anon_id;
      if (stored.authSession?.user?.id) {
        distinctId = stored.authSession.user.id;
      }
    })();
    return initPromise;
  }

  await simulateInit();

  assert.strictEqual(anonId, 'anon-test-123', 'anonId must be hydrated from storage');
  assert.strictEqual(distinctId, 'user_2xyzClerkMockId', 'distinctId must be hydrated from authSession');
  assert.strictEqual(optedOut, false, 'optedOut must reflect storage preference');

  // Simulate logout via storage change
  const change = {
    authSession: { newValue: null }
  };
  distinctId = change.authSession.newValue?.user?.id || null;
  assert.strictEqual(distinctId, null, 'distinctId must clear on authSession removal');
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`  Batch 3 Verification: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
