/**
 * PromptPro Extension Analytics — Popup Context
 *
 * Identical lightweight PostHog HTTP transport as background/analytics.js.
 * Service workers and popup scripts run in separate JS contexts in MV3 —
 * they do NOT share module state. Each context needs its own analytics instance.
 *
 * Call initAnalytics() once when popup.js initializes, then track() events.
 * The opt-out preference and anonymous ID are shared via chrome.storage.local.
 */

'use strict';

// ── Configuration ─────────────────────────────────────────────────────────

// In production: replace these with your actual values, or use esbuild --define
const POSTHOG_API_KEY = 'phc_q3ax276fidL5wqRAE3ub48D2b7iSdVLVNeDLcY3TgATR';
const POSTHOG_INGEST_HOST = 'https://prompt-pro-liart.vercel.app/ingest';

const EXT_VERSION = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest)
  ? chrome.runtime.getManifest().version
  : '1.0.0';

// ── State ─────────────────────────────────────────────────────────────────

let _distinctId = null;
let _anonId = null;
let _initialized = false;
let _optedOut = false;

// ── Helpers ───────────────────────────────────────────────────────────────

function _uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function _stripContent(props) {
  if (!props || typeof props !== 'object') return {};
  const safe = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && v.length > 200) continue;
    safe[k] = v;
  }
  return safe;
}

async function _send(eventName, properties) {
  if (!POSTHOG_API_KEY || POSTHOG_API_KEY === 'phc_placeholder' || _optedOut) return;

  const distinctId = _distinctId || _anonId || 'anonymous';
  const payload = {
    api_key: POSTHOG_API_KEY,
    batch: [{
      event: eventName,
      distinct_id: distinctId,
      timestamp: new Date().toISOString(),
      properties: {
        $lib: 'promptpro-extension-popup',
        $lib_version: EXT_VERSION,
        extension_version: EXT_VERSION,
        ..._stripContent(properties || {}),
      },
    }],
  };

  try {
    const endpoint = POSTHOG_INGEST_HOST.replace(/\/+$/, '') + '/batch/';
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (_e) {
    // Never surface analytics errors to users
  }
}

// ── Public API ────────────────────────────────────────────────────────────

async function initAnalytics() {
  if (_initialized) return;
  _initialized = true;

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

async function identifyUser(clerkUserId, properties) {
  if (!clerkUserId || _optedOut) return;
  _distinctId = clerkUserId;

  if (POSTHOG_API_KEY === 'phc_placeholder') return;

  const payload = {
    api_key: POSTHOG_API_KEY,
    batch: [{
      event: '$identify',
      distinct_id: clerkUserId,
      timestamp: new Date().toISOString(),
      properties: {
        $anon_distinct_id: _anonId || clerkUserId,
        $lib: 'promptpro-extension-popup',
        $lib_version: EXT_VERSION,
        ..._stripContent(properties || {}),
      },
    }],
  };

  try {
    const endpoint = POSTHOG_INGEST_HOST.replace(/\/+$/, '') + '/batch/';
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (_e) {}
}

function track(eventName, properties) {
  _send(eventName, properties);
}

function resetAnalytics() {
  _distinctId = null;
}

function optOut() {
  _optedOut = true;
  try { chrome.storage.local.set({ pp_analytics_opt_out: true }); } catch (_e) {}
}

function optIn() {
  _optedOut = false;
  try { chrome.storage.local.set({ pp_analytics_opt_out: false }); } catch (_e) {}
}

function isOptedOut() {
  return _optedOut;
}
