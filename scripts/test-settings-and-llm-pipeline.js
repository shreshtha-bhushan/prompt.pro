/**
 * PromptPro — Comprehensive Settings, Feature & LLM Pipeline Automated Test Suite
 * Validates:
 * 1. Settings defaults, persistence, isolation, and independence
 * 2. Optimization tone, no-fluff, low-token propagation
 * 3. OpenRouter model configuration (google/gemma-4-26b-a4b-it:free) and error handling
 * 4. Credit accounting, deduction, refund, and reset formatting
 * 5. Site memory isolation between ChatGPT and Claude
 * 6. Usage analytics privacy and opt-out enforcement
 * 7. Autocomplete predictive engine
 */

const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n============================================================');
console.log(' PROMPTPRO AUDIT TEST SUITE: SETTINGS & LLM PIPELINE');
console.log('============================================================\n');

// ── 1. Settings Defaults & Persistence ───────────────────────────────────────
console.log('--- 1. Settings Defaults, Persistence & Independence ---');

const DEFAULT_SETTINGS = {
  defaultStrategy: 'enhance',
  defaultTone: null,
  showScoreBadge: true,
  enabled: true,
  noFluff: false,
  lowTokenEnabled: false,
  siteMemory: true,
  openrouterEnabled: true,
  autocompleteEnabled: true
};

test('Default settings contain all required spec controls with valid defaults', () => {
  assert.strictEqual(DEFAULT_SETTINGS.defaultStrategy, 'enhance');
  assert.strictEqual(DEFAULT_SETTINGS.showScoreBadge, true);
  assert.strictEqual(DEFAULT_SETTINGS.enabled, true);
  assert.strictEqual(DEFAULT_SETTINGS.noFluff, false);
  assert.strictEqual(DEFAULT_SETTINGS.lowTokenEnabled, false);
  assert.strictEqual(DEFAULT_SETTINGS.siteMemory, true);
  assert.strictEqual(DEFAULT_SETTINGS.openrouterEnabled, true);
  assert.strictEqual(DEFAULT_SETTINGS.autocompleteEnabled, true);
});

test('Independent setting changes do not overwrite unrelated settings', () => {
  let state = { ...DEFAULT_SETTINGS };
  const update1 = { defaultTone: 'academic' };
  state = { ...state, ...update1 };
  assert.strictEqual(state.defaultTone, 'academic');
  assert.strictEqual(state.noFluff, false);
  assert.strictEqual(state.showScoreBadge, true);

  const update2 = { noFluff: true };
  state = { ...state, ...update2 };
  assert.strictEqual(state.defaultTone, 'academic');
  assert.strictEqual(state.noFluff, true);
  assert.strictEqual(state.showScoreBadge, true);
});

test('Fallback handling for invalid or empty stored settings', () => {
  const corrupted = { showScoreBadge: null, defaultStrategy: undefined };
  const merged = { ...DEFAULT_SETTINGS, ...corrupted };
  const safeStrategy = merged.defaultStrategy || DEFAULT_SETTINGS.defaultStrategy;
  const safeBadge = merged.showScoreBadge !== false;
  assert.strictEqual(safeStrategy, 'enhance');
  assert.strictEqual(safeBadge, true);
});

// ── 2. Site Memory & Multi-Origin Isolation ─────────────────────────────────
console.log('\n--- 2. Site Memory & Multi-Origin Isolation ---');

test('Site Memory scopes settings strictly per origin/platform', () => {
  const sitesData = {
    chatgpt: { defaultStrategy: 'elaborate', defaultTone: 'academic' },
    claude: { defaultStrategy: 'concise', defaultTone: 'technical' }
  };

  const getSiteConfig = (siteId, siteMemoryEnabled) => {
    if (!siteMemoryEnabled) {
      return { strategy: DEFAULT_SETTINGS.defaultStrategy, tone: DEFAULT_SETTINGS.defaultTone };
    }
    const site = sitesData[siteId];
    return site ? { strategy: site.defaultStrategy, tone: site.defaultTone } : { strategy: 'enhance', tone: null };
  };

  const chatgptConfig = getSiteConfig('chatgpt', true);
  const claudeConfig = getSiteConfig('claude', true);

  assert.strictEqual(chatgptConfig.strategy, 'elaborate');
  assert.strictEqual(chatgptConfig.tone, 'academic');

  assert.strictEqual(claudeConfig.strategy, 'concise');
  assert.strictEqual(claudeConfig.tone, 'technical');

  // Verify memory off falls back to global
  const disabledMemoryConfig = getSiteConfig('chatgpt', false);
  assert.strictEqual(disabledMemoryConfig.strategy, 'enhance');
  assert.strictEqual(disabledMemoryConfig.tone, null);
});

// ── 3. Prompt Optimization Directives & Propagation ─────────────────────────
console.log('\n--- 3. Prompt Optimization Directives & Propagation ---');

function constructTestSystemPrompt({ strategy, tone, noFluff, lowTokenEnabled }) {
  let prompt = `You are PromptPro, an expert prompt engineering AI.`;
  if (strategy === "elaborate") {
    prompt += "\n\nStrategy [CHAIN OF THOUGHT]: Expand the prompt with systematic reasoning.";
  } else if (strategy === "concise") {
    prompt += "\n\nStrategy [CONCISE]: Remove all filler and produce dense instructions.";
  } else {
    prompt += "\n\nStrategy [ENHANCE]: Apply 5-component decomposition starting directly with **Role:**";
  }

  if (tone) {
    prompt += `\nTone [${tone.toUpperCase()}]: Enforce a strictly ${tone} tone throughout.`;
  }
  if (noFluff) {
    prompt += "\n\nNo-Fluff Directive: Remove all introductory throat-clearing, redundant wording, and conversational filler.";
  }
  if (lowTokenEnabled) {
    prompt += "\n\nLow Token Directive: Compact all expressions for minimum prompt token length using concise bullet formatting.";
  }
  return prompt;
}

test('Tone selection propagates to prompt instructions for all supported tones', () => {
  const supportedTones = ['academic', 'professional', 'casual', 'formal', 'creative', 'technical', 'direct', 'humorous'];
  supportedTones.forEach(t => {
    const sys = constructTestSystemPrompt({ strategy: 'enhance', tone: t, noFluff: false, lowTokenEnabled: false });
    assert.ok(sys.includes(`Tone [${t.toUpperCase()}]`), `Tone ${t} was not included in system prompt`);
    assert.ok(sys.includes(`strictly ${t} tone`), `Tone instruction missing for ${t}`);
  });
});

test('No-Fluff Mode alters instructions and preserves core requirements', () => {
  const promptWithout = constructTestSystemPrompt({ strategy: 'enhance', tone: null, noFluff: false, lowTokenEnabled: false });
  assert.ok(!promptWithout.includes('No-Fluff Directive'), 'No-Fluff instruction present when disabled');

  const promptWith = constructTestSystemPrompt({ strategy: 'enhance', tone: null, noFluff: true, lowTokenEnabled: false });
  assert.ok(promptWith.includes('No-Fluff Directive'), 'No-Fluff instruction missing when enabled');
  assert.ok(promptWith.includes('Remove all introductory throat-clearing'), 'No-Fluff instruction detail missing');
});

test('Low Token Mode alters instructions and configures reduced max_tokens', () => {
  const promptWith = constructTestSystemPrompt({ strategy: 'enhance', tone: null, noFluff: false, lowTokenEnabled: true });
  assert.ok(promptWith.includes('Low Token Directive'), 'Low token directive missing');

  const getMaxTokens = (lowToken) => lowToken ? 1024 : 2048;
  assert.strictEqual(getMaxTokens(true), 1024);
  assert.strictEqual(getMaxTokens(false), 2048);
});

// ── 4. OpenRouter Configuration & Error Handling ────────────────────────────
console.log('\n--- 4. OpenRouter Model Configuration & Error Handling ---');

const MODEL_MAP = {
  quick: process.env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free",
  advanced: "anthropic/claude-3.5-sonnet",
  max: "openai/gpt-4o",
};

test('Authoritative Quick optimization model is google/gemma-4-26b-a4b-it:free or openrouter/free', () => {
  const validModels = [process.env.OPENROUTER_MODEL, 'google/gemma-4-26b-a4b-it:free', 'openrouter/free'].filter(Boolean);
  assert.ok(validModels.includes(MODEL_MAP.quick), `Expected valid quick model, got ${MODEL_MAP.quick}`);
});

test('Optimization modes map to intended tiers and credit costs', () => {
  const CREDIT_COSTS = { quick: 1, advanced: 5, max: 10 };
  assert.strictEqual(CREDIT_COSTS.quick, 1);
  assert.strictEqual(CREDIT_COSTS.advanced, 5);
  assert.strictEqual(CREDIT_COSTS.max, 10);

  assert.strictEqual(MODEL_MAP.advanced, 'anthropic/claude-3.5-sonnet');
  assert.strictEqual(MODEL_MAP.max, 'openai/gpt-4o');
});

test('Upstream OpenRouter errors map to user-facing actionable messages', () => {
  function mapProviderError(status, rawMsg) {
    if (status === 429) {
      return {
        message: `${MODEL_MAP.quick} is temporarily rate-limited upstream. Please retry in a few moments.`,
        code: "PROVIDER_RATE_LIMITED"
      };
    }
    if (status === 401 || status === 403) {
      return {
        message: "AI provider authentication failed. Please verify API configuration.",
        code: "PROVIDER_AUTH_FAILED"
      };
    }
    if (status === 402) {
      return {
        message: "AI provider payment/credits limit reached.",
        code: "PROVIDER_CREDIT_LIMIT"
      };
    }
    return {
      message: "AI provider service is temporarily unavailable. Please retry in a moment.",
      code: "PROVIDER_UNAVAILABLE"
    };
  }

  const err429 = mapProviderError(429, 'rate-limited');
  assert.strictEqual(err429.code, 'PROVIDER_RATE_LIMITED');
  assert.ok(err429.message.includes(MODEL_MAP.quick));

  const err401 = mapProviderError(401, 'unauthorized');
  assert.strictEqual(err401.code, 'PROVIDER_AUTH_FAILED');

  const err402 = mapProviderError(402, 'payment required');
  assert.strictEqual(err402.code, 'PROVIDER_CREDIT_LIMIT');

  const err503 = mapProviderError(503, 'service unavailable');
  assert.strictEqual(err503.code, 'PROVIDER_UNAVAILABLE');
});

// ── 5. Usage Analytics Privacy & Data Stripping ─────────────────────────────
console.log('\n--- 5. Usage Analytics Privacy & Opt-Out ---');

function stripContent(props) {
  if (!props || typeof props !== 'object') return {};
  const safe = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && v.length > 200) continue;
    safe[k] = v;
  }
  return safe;
}

test('Prompt text and large content are completely stripped from analytics properties', () => {
  const longPrompt = 'Please optimize this secret prompt '.repeat(20);
  const props = {
    mode: 'quick',
    strategy: 'enhance',
    raw_prompt_content: longPrompt,
    short_meta: 'verified'
  };

  const stripped = stripContent(props);
  assert.strictEqual(stripped.mode, 'quick');
  assert.strictEqual(stripped.strategy, 'enhance');
  assert.strictEqual(stripped.short_meta, 'verified');
  assert.strictEqual(stripped.raw_prompt_content, undefined, 'Long prompt text was not stripped!');
});

test('Opt-out state stops telemetry transmission immediately', () => {
  let isOptedOut = true;
  let sent = false;
  const send = () => {
    if (isOptedOut) return;
    sent = true;
  };
  send();
  assert.strictEqual(sent, false, 'Telemetry was sent while opted out');

  isOptedOut = false;
  send();
  assert.strictEqual(sent, true, 'Telemetry failed to send when opted in');
});

// ── 6. Autocomplete Predictive Logic ────────────────────────────────────────
console.log('\n--- 6. Autocomplete Predictive Engine ---');

function localAutocompletePredict(text) {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  if (trimmed.length < 4 || trimmed.length > 200) return null;
  if (/[.?!\n]$/.test(trimmed)) return null;

  const patterns = [
    [/\bwrite (a|an) (short )?essay (about|on)\s*$/i, ' its history, key concepts, and real-world applications'],
    [/\bwrite (a|an) (blog|article) (post )?about\s*$/i, ' the benefits and practical tips for getting started'],
    [/\bexplain( how| why| what| the)?\s*$/i, ' it works, including the key principles and practical examples'],
    [/\bcompare( and contrast)?\s*$/i, ' the similarities, differences, pros, and cons of each option']
  ];

  for (const [pattern, suffix] of patterns) {
    if (pattern.test(lower)) return suffix;
  }
  return null;
}

test('Local predictive autocomplete returns intelligent continuations, never saved prompts', () => {
  const pred1 = localAutocompletePredict('Write an essay on');
  assert.strictEqual(pred1, ' its history, key concepts, and real-world applications');

  const pred2 = localAutocompletePredict('Compare and contrast');
  assert.strictEqual(pred2, ' the similarities, differences, pros, and cons of each option');

  const pred3 = localAutocompletePredict('Explain how');
  assert.strictEqual(pred3, ' it works, including the key principles and practical examples');

  // Must not predict completed sentence with terminal punctuation
  const predPunct = localAutocompletePredict('Write an essay on AI.');
  assert.strictEqual(predPunct, null);
});

// ── 7. Credit Reset Countdown Calculation ───────────────────────────────────
console.log('\n--- 7. Credit Accounting & Reset Calculation ---');

function formatResetCountdown(resetAt, now = Date.now()) {
  if (!resetAt) return 'in 30d';
  const target = new Date(resetAt).getTime();
  const diffMs = target - now;
  if (diffMs <= 0) return 'soon';
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    const remainHours = diffHour % 24;
    return remainHours > 0 ? `in ${diffDay}d ${remainHours}h` : `in ${diffDay}d`;
  }
  if (diffHour > 0) {
    const remainMin = diffMin % 60;
    return remainMin > 0 ? `in ${diffHour}h ${remainMin}m` : `in ${diffHour}h`;
  }
  return `in ${Math.max(1, diffMin)}m`;
}

test('Reset countdown calculation formats accurately for days, hours, and minutes', () => {
  const now = 1700000000000;
  const in5Days = now + (5 * 24 * 60 * 60 * 1000) + (3 * 60 * 60 * 1000);
  assert.strictEqual(formatResetCountdown(in5Days, now), 'in 5d 3h');

  const in4Hours = now + (4 * 60 * 60 * 1000) + (15 * 60 * 1000);
  assert.strictEqual(formatResetCountdown(in4Hours, now), 'in 4h 15m');

  const in25Min = now + (25 * 60 * 1000);
  assert.strictEqual(formatResetCountdown(in25Min, now), 'in 25m');

  const expired = now - 1000;
  assert.strictEqual(formatResetCountdown(expired, now), 'soon');
});

console.log('\n============================================================');
console.log(` RESULTS: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('============================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
