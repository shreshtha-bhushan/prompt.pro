/**
 * PromptPro Extension Analytics — MV3-Safe PostHog HTTP Transport
 *
 * WHY NOT posthog-js default bundle:
 *   PostHog's standard bundle lazily fetches remote assets (recorder.js,
 *   toolbar.js, surveys.js) from posthog.com CDN at runtime. Chrome Web Store
 *   Manifest V3 policy bans "remotely hosted code" and flags dynamic script
 *   injection — multiple teams have had extensions rejected for this reason.
 *
 *   This module implements only the PostHog Capture API (HTTP POST to /e/)
 *   using the extension's existing fetch() call pattern. Zero dynamic eval,
 *   zero remote scripts, zero rrweb, zero DOM autocapture.
 *
 * Configuration (injected at build time or set via initAnalytics):
 *   POSTHOG_KEY  — project API key (phc_...)
 *   POSTHOG_HOST — full URL to the ingestion proxy, e.g.:
 *                  https://prompt-pro-liart.vercel.app/ingest
 *
 * Usage in Service Worker (background context):
 *   import { initAnalytics, track, identifyUser } from './analytics.js';
 *   initAnalytics();
 *   identifyUser(clerkUserId, { plan_tier: 'plus' });
 *   track('optimization_run', { mode: 'advanced', platform: 'chatgpt', credit_cost: 5 });
 *
 * Privacy rules — enforced by this module:
 *   - stripContent() removes any key whose value looks like long text (>200 chars)
 *   - Never pass prompt text, optimized output, or conversation content as properties
 *   - Only shaped metadata: mode, platform, credit numbers, boolean flags, error codes
 */

'use strict';

// ── Configuration ────────────────────────────────────────────────────────────

/**
 * These are compile-time constants when using an esbuild define:
 *   --define:POSTHOG_KEY=\"phc_...\" --define:POSTHOG_HOST=\"https://...\"
 *
 * When not using esbuild (plain JS), they fall back to empty strings and
 * initAnalytics({ apiKey, host }) must be called explicitly.
 */
const _DEFAULT_KEY = (typeof POSTHOG_KEY !== 'undefined') ? POSTHOG_KEY : '';
const _DEFAULT_HOST = (typeof POSTHOG_HOST !== 'undefined') ? POSTHOG_HOST : '';
const _VERSION = (typeof chrome !== 'undefined' && chrome.runtime)
  ? (chrome.runtime.getManifest ? chrome.runtime.getManifest().version : '1.0.0')
  : '1.0.0';

// ── Internal state ───────────────────────────────────────────────────────────

let _apiKey = _DEFAULT_KEY;
let _host = _DEFAULT_HOST;
let _distinctId = null;         // Clerk user ID when identified; anonymous UUID otherwise
let _anonId = null;             // Stable anonymous ID (persisted in chrome.storage.local)
let _initialized = false;
let _optedOut = false;          // Respect user's analytics opt-out preference

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a UUID v4 for anonymous distinct_id */
function _uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Remove any property whose value is a string longer than 200 characters.
 * This is a safety net to prevent accidental prompt text inclusion.
 */
function _stripContent(props) {
  if (!props || typeof props !== 'object') return {};
  const safe = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && v.length > 200) continue; // drop long strings
    safe[k] = v;
  }
  return safe;
}

/**
 * Send an event payload directly to the PostHog /e/ batch endpoint.
 * Uses `fetch()` which is available in both service workers and popup scripts.
 * Silently swallows errors — analytics must never break core functionality.
 */
async function _send(eventName, properties) {
  if (!_apiKey || !_host || _optedOut) return;

  const distinctId = _distinctId || _anonId || 'anonymous';
  const safeProps = _stripContent(properties);

  const payload = {
    api_key: _apiKey,
    batch: [{
      event: eventName,
      distinct_id: distinctId,
      timestamp: new Date().toISOString(),
      properties: {
        $lib: 'promptpro-extension',
        $lib_version: _VERSION,
        extension_version: _VERSION,
        ...safeProps,
      },
    }],
  };

  try {
    // POST to the batch endpoint — works without browser fetch interceptors
    const endpoint = _host.replace(/\/+$/, '') + '/batch/';
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true, // Allows request to outlive service worker script execution
    });
  } catch (_err) {
    // Never surface analytics errors to users
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize the analytics module.
 * Call once at startup in both service worker and popup contexts.
 * Each context (SW / popup) has its own JS state in MV3.
 *
 * @param {Object} [options]
 * @param {string} [options.apiKey]   Override the compile-time POSTHOG_KEY
 * @param {string} [options.host]     Override the compile-time POSTHOG_HOST
 */
async function initAnalytics(options = {}) {
  if (_initialized) return;
  _initialized = true;

  if (options.apiKey) _apiKey = options.apiKey;
  if (options.host) _host = options.host;

  // Load persisted anonymous ID and opt-out preference
  try {
    const stored = await new Promise((resolve) =>
      chrome.storage.local.get(['pp_anon_id', 'pp_analytics_opt_out'], resolve)
    );

    _optedOut = stored.pp_analytics_opt_out === true;

    if (stored.pp_anon_id) {
      _anonId = stored.pp_anon_id;
    } else {
      _anonId = _uuid();
      chrome.storage.local.set({ pp_anon_id: _anonId });
    }
  } catch (_e) {
    _anonId = _uuid();
  }
}

/**
 * Identify the signed-in user so that extension events merge with dashboard
 * events in PostHog under a single person profile.
 *
 * Use the Clerk user ID as distinct_id — same value used by the dashboard.
 *
 * @param {string} clerkUserId
 * @param {Object} [properties]  e.g. { plan_tier: 'plus', email: '...' }
 */
async function identifyUser(clerkUserId, properties) {
  if (!clerkUserId || _optedOut) return;
  _distinctId = clerkUserId;

  // Send a $identify event to link the anon ID to the user
  if (!_apiKey || !_host) return;
  const payload = {
    api_key: _apiKey,
    batch: [{
      event: '$identify',
      distinct_id: clerkUserId,
      timestamp: new Date().toISOString(),
      properties: {
        $anon_distinct_id: _anonId || clerkUserId,
        $lib: 'promptpro-extension',
        $lib_version: _VERSION,
        ..._stripContent(properties || {}),
      },
    }],
  };

  try {
    const endpoint = _host.replace(/\/+$/, '') + '/batch/';
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (_e) {}
}

/**
 * Capture a named event.
 *
 * @param {string} eventName  snake_case, object_action (e.g. "optimization_run")
 * @param {Object} [properties]
 */
function track(eventName, properties) {
  _send(eventName, properties);
}

/**
 * Reset identity — call on sign-out so subsequent events use anonymous ID.
 */
function resetAnalytics() {
  _distinctId = null;
}

/**
 * Opt the user out of all event capture and persist the preference.
 * Respects the "Share anonymous usage data" toggle in Preferences.
 */
function optOut() {
  _optedOut = true;
  try { chrome.storage.local.set({ pp_analytics_opt_out: true }); } catch (_e) {}
}

/**
 * Opt the user back in and persist.
 */
function optIn() {
  _optedOut = false;
  try { chrome.storage.local.set({ pp_analytics_opt_out: false }); } catch (_e) {}
}

/** Read current opt-out state */
function isOptedOut() {
  return _optedOut;
}
