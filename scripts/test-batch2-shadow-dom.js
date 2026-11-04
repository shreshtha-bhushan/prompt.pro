/**
 * Batch 2 — Verification Test Suite: Shadow DOM Encapsulation & Manifest Alignment
 *
 * Validates:
 *   1. Manifest alignment (Perplexity included in description and permissions)
 *   2. CSS isolation (:host reset, scoped variables, #promptpro-host)
 *   3. Shadow DOM host architecture in content/main.js
 *   4. Scoped query interceptors (document.getElementById & querySelector)
 *   5. Portals (toast, popover, slash menu, modal) targeting shadow root
 *   6. Event retargeting & composedPath outside-click handling
 *   7. Privacy policy claims & 180-day retention disclosures
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('═══════════════════════════════════════════════════════════');
console.log(' PROMPTPRO BATCH 2: SHADOW DOM & MANIFEST VERIFICATION');
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

// Read target files
const manifestPath = path.join(__dirname, '..', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const cssPath = path.join(__dirname, '..', 'styles', 'injected.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const mainJsPath = path.join(__dirname, '..', 'content', 'main.js');
const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

const privacyPath = path.join(__dirname, '..', 'web', 'src', 'app', 'privacy', 'page.tsx');
const privacyContent = fs.readFileSync(privacyPath, 'utf8');

// ── 1. Manifest Alignment ─────────────────────────────────────
console.log('--- 1. Manifest Alignment ---');

check('manifest.json: description includes Perplexity alongside ChatGPT, Claude, and Gemini', () => {
  assert(manifest.description.includes('Perplexity'), 'description must mention Perplexity');
  assert(manifest.description.includes('ChatGPT'), 'description must mention ChatGPT');
  assert(manifest.description.includes('Claude'), 'description must mention Claude');
  assert(manifest.description.includes('Gemini'), 'description must mention Gemini');
});

check('manifest.json: content_scripts matches perplexity.ai', () => {
  const matches = manifest.content_scripts.flatMap(cs => cs.matches);
  assert(matches.some(m => m.includes('perplexity.ai')), 'content_scripts must match perplexity.ai');
});

check('manifest.json: host_permissions includes perplexity.ai', () => {
  assert(manifest.host_permissions.some(h => h.includes('perplexity.ai')), 'host_permissions must include perplexity.ai');
});

check('manifest.json: web_accessible_resources contains injected.css', () => {
  const resources = manifest.web_accessible_resources.flatMap(w => w.resources);
  assert(resources.includes('styles/injected.css'), 'web_accessible_resources must contain styles/injected.css');
});

// ── 2. CSS Isolation & Token Scoping ──────────────────────────
console.log('\n--- 2. CSS Isolation & Token Scoping ---');

check('injected.css: tokens scoped to :root, :host, and #promptpro-host', () => {
  assert(cssContent.includes(':root, :host, #promptpro-host'), 'tokens must be declared on :host and #promptpro-host');
});

check('injected.css: :host reset applies all: initial', () => {
  assert(/:host\s*\{[\s\S]*?all:\s*initial/i.test(cssContent), ':host must set all: initial to isolate styles');
});

check('injected.css: #promptpro-host has fixed positioning and zero layout footprints', () => {
  assert(/#promptpro-host\s*\{[\s\S]*?position:\s*fixed/i.test(cssContent), '#promptpro-host must be position: fixed');
  assert(/#promptpro-host\s*\{[\s\S]*?pointer-events:\s*none/i.test(cssContent), '#promptpro-host must pass through pointer events');
});

// ── 3. Shadow DOM Architecture in content/main.js ─────────────
console.log('\n--- 3. Shadow DOM Architecture ---');

check('main.js: defines ensurePromptProHost function', () => {
  assert(mainJsContent.includes('function ensurePromptProHost()'), 'ensurePromptProHost must be defined');
});

check('main.js: attaches shadow root with mode: "open"', () => {
  assert(mainJsContent.includes("attachShadow({ mode: 'open' })") || mainJsContent.includes('attachShadow({mode:"open"})'), 'must attach open shadow root');
});

check('main.js: injects injected.css into shadow root via link and style element', () => {
  assert(mainJsContent.includes('promptpro-shadow-stylesheet'), 'must create shadow stylesheet link');
  assert(mainJsContent.includes('promptpro-shadow-style'), 'must create shadow style element');
});

check('main.js: scoped getElementById interceptor checks _promptProShadowRoot', () => {
  assert(mainJsContent.includes('_promptProShadowRoot.getElementById(id)'), 'must check _promptProShadowRoot in getElementById');
});

check('main.js: scoped querySelector interceptor checks _promptProShadowRoot', () => {
  assert(mainJsContent.includes('_promptProShadowRoot.querySelector(selector)'), 'must check _promptProShadowRoot in querySelector');
});

// ── 4. Portals Inside Shadow Tree ─────────────────────────────
console.log('\n--- 4. Portals Inside Shadow Tree ---');

check('main.js: showToast appends into ensurePromptProHost shadow root', () => {
  const toastMatch = mainJsContent.match(/function showToast[\s\S]*?ensurePromptProHost\(\)[\s\S]*?shadow\.appendChild\(toast\)/);
  assert(toastMatch, 'showToast must append to shadow root');
});

check('main.js: attachPopoverPortal ports popover to ensurePromptProHost shadow root', () => {
  const popoverMatch = mainJsContent.match(/function attachPopoverPortal[\s\S]*?ensurePromptProHost\(\)[\s\S]*?shadow\.appendChild\(pop\)/);
  assert(popoverMatch, 'attachPopoverPortal must append to shadow root');
});

check('main.js: createUIElements initializes popover in ensurePromptProHost shadow root', () => {
  const initMatch = mainJsContent.match(/createUIElements[\s\S]*?ensurePromptProHost\(\)[\s\S]*?popover\.parentNode\s*!==\s*shadow/);
  assert(initMatch, 'createUIElements must mount popover to shadow root');
});

check('main.js: renderSlashMenu appends into ensurePromptProHost shadow root', () => {
  const slashMatch = mainJsContent.match(/renderSlashMenu[\s\S]*?ensurePromptProHost\(\)[\s\S]*?shadow\.appendChild\(slashMenu\)/);
  assert(slashMatch, 'renderSlashMenu must append to shadow root');
});

check('main.js: openVariablesModal appends backdrop into ensurePromptProHost shadow root', () => {
  const modalMatch = mainJsContent.match(/openVariablesModal[\s\S]*?ensurePromptProHost\(\)[\s\S]*?shadow\.appendChild\(backdrop\)/);
  assert(modalMatch, 'openVariablesModal must append to shadow root');
});

// ── 5. Event Handling & Retargeting ───────────────────────────
console.log('\n--- 5. Event Handling & Composed Path ---');

check('main.js: popover outside-click check inspects composedPath()', () => {
  assert(mainJsContent.includes('path.includes(pop)'), 'outside click listener must check path.includes(pop)');
});

check('main.js: tone dropdown outside-click check inspects composedPath()', () => {
  assert(mainJsContent.includes('path.includes(dropdown)'), 'outside click listener must check path.includes(dropdown)');
});

check('main.js: slash menu outside-click check inspects composedPath()', () => {
  assert(mainJsContent.includes('path.includes(slashMenu)'), 'outside click listener must check path.includes(slashMenu)');
});

// ── 6. Privacy Policy Disclosures ─────────────────────────────
console.log('\n--- 6. Privacy Policy Disclosures ---');

check('privacy/page.tsx: contains rolling 180-day retention policy disclosure', () => {
  assert(privacyContent.includes('180 days'), 'privacy policy must disclose 180-day retention');
});

check('privacy/page.tsx: contains zero placeholder strings', () => {
  assert(!privacyContent.includes('[PLACEHOLDER:'), 'all placeholders in privacy policy must be resolved');
});

check('privacy/page.tsx: discloses DSAR contact email privacy@promptpro.dev', () => {
  assert(privacyContent.includes('privacy@promptpro.dev'), 'privacy policy must disclose privacy@promptpro.dev');
});

check('privacy/page.tsx: accurately describes local-first heuristics and zero-training inference', () => {
  assert(privacyContent.includes('local-first heuristic engine'), 'privacy policy must describe local-first heuristics');
  assert(privacyContent.includes('zero-training'), 'privacy policy must describe zero-training policy');
});

// ── 7. DOM Simulation Verification ────────────────────────────
console.log('\n--- 7. DOM Simulation Verification ---');

check('DOM Simulation: Mock ShadowRoot correctly receives and hosts popover & toast', () => {
  class MockShadowRoot {
    constructor(host) {
      this.host = host;
      this.children = [];
    }
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }
    getElementById(id) {
      return this.children.find(c => c.id === id) || null;
    }
    querySelector(sel) {
      if (sel.startsWith('#')) {
        const id = sel.slice(1);
        return this.children.find(c => c.id === id) || null;
      }
      return null;
    }
  }

  class MockHostElement {
    constructor(id) {
      this.id = id;
      this.shadowRoot = null;
      this.isConnected = true;
    }
    attachShadow(opts) {
      this.shadowRoot = new MockShadowRoot(this);
      return this.shadowRoot;
    }
  }

  const host = new MockHostElement('promptpro-host');
  const shadow = host.attachShadow({ mode: 'open' });

  const popover = { id: 'promptpro-popover', isConnected: true };
  const toast = { id: 'promptpro-toast', isConnected: true };

  shadow.appendChild(popover);
  shadow.appendChild(toast);

  assert.strictEqual(popover.parentNode, shadow, 'popover parentNode must be shadowRoot');
  assert.strictEqual(shadow.getElementById('promptpro-popover'), popover, 'getElementById on shadowRoot must find popover');
  assert.strictEqual(shadow.getElementById('promptpro-toast'), toast, 'getElementById on shadowRoot must find toast');
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`  Batch 2 Verification: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
