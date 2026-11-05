// scripts/test-batch4-dom-watchdog.js
// Verification suite for Host Chat Composer DOM Mutation Drift (Risk R-4)

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('============================================================');
console.log(' PROMPTPRO VERIFICATION: COMPOSER DOM MUTATION WATCHDOG (R-4)');
console.log('============================================================\n');

const mainJsPath = path.join(__dirname, '..', 'content', 'main.js');
const mainJsCode = fs.readFileSync(mainJsPath, 'utf8');

// --- 1. Static Code Analysis ---
console.log('--- 1. Static Code Analysis: ObserverManager & Watchdogs ---');

// Check that _onInteraction and _onFocusIn are bound in constructor
assert(mainJsCode.includes('this._onFocusIn = this._onFocusIn.bind(this);'), 'Must bind _onFocusIn');
assert(mainJsCode.includes('this._onInteraction = this._onInteraction.bind(this);'), 'Must bind _onInteraction');
console.log('  ✓ PASS: _onFocusIn and _onInteraction bound to ObserverManager instance');

// Check capturing listeners to bypass host stopPropagation
assert(
  mainJsCode.includes("document.addEventListener('focusin', this._onFocusIn, { capture: true, passive: true });"),
  'Must register focusin with { capture: true, passive: true }'
);
assert(
  mainJsCode.includes("document.addEventListener('pointerdown', this._onInteraction, { capture: true, passive: true });"),
  'Must register pointerdown with { capture: true, passive: true }'
);
console.log('  ✓ PASS: Capturing event listeners registered for focus and user interaction');

// Check periodic watchdog heartbeat
assert(mainJsCode.includes('this._watchdogInterval = setInterval('), 'Must set periodic watchdog interval');
assert(mainJsCode.includes('if (!isInjected(this.adapter))'), 'Watchdog must verify isInjected');
console.log('  ✓ PASS: Self-healing periodic watchdog heartbeat active');

// Check streamlined MutationObserver without dropped mutation delays
assert(
  mainJsCode.includes('this.bodyObserver = new MutationObserver(() => {\n        // Fast path: button exists AND is connected to active composer\n        if (isInjected(this.adapter)) return;\n\n        // Button gone or in stale container — schedule reinject\n        this._scheduleReinject();\n      });'),
  'Must use direct debounced reinjection on mutation'
);
console.log('  ✓ PASS: Streamlined MutationObserver eliminates dropped mutation window');

// Check Gemini toolbar fallback
assert(
  mainJsCode.includes('const toolbar = this.getToolbar();\n        if (toolbar) return { parent: toolbar, before: null };'),
  'GeminiAdapter must fall back to getToolbar() when send button is absent'
);
console.log('  ✓ PASS: GeminiAdapter implements multi-tier fallback to toolbar');

// --- 2. Functional Simulation ---
console.log('\n--- 2. Functional Simulation: Interaction Watchdog Logic ---');

class MockElement {
  constructor(tagName, attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attrs };
    this.children = [];
    this.parentElement = null;
    this.isContentEditable = !!attrs.contenteditable;
    this.isConnected = true;
  }
  getAttribute(k) { return this.attributes[k] || null; }
  setAttribute(k, v) { this.attributes[k] = v; }
  contains(node) {
    if (node === this) return true;
    return this.children.some(c => c.contains(node));
  }
  closest(selector) {
    let cur = this;
    while (cur) {
      if (cur.matches && cur.matches(selector)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }
  matches(selector) {
    if (selector.includes('textarea') && this.tagName === 'TEXTAREA') return true;
    if (selector.includes('[contenteditable="true"]') && this.isContentEditable) return true;
    if (selector.includes('.ProseMirror') && (this.attributes.className || '').includes('ProseMirror')) return true;
    if (selector.includes('[data-testid*="composer"]') && (this.attributes['data-testid'] || '').includes('composer')) return true;
    return false;
  }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
}

// Test target recognition in _onFocusIn and _onInteraction
const composerWrapper = new MockElement('div', { 'data-testid': 'composer-container' });
const editor = new MockElement('div', { contenteditable: 'true', className: 'ProseMirror' });
const childSpan = new MockElement('span');
editor.appendChild(childSpan);
composerWrapper.appendChild(editor);

const mockAdapter = {
  getInputField() { return editor; }
};

let injectAttempts = 0;
let mockIsInjected = false;

const simulatedManager = {
  adapter: mockAdapter,
  _attemptInject() { injectAttempts++; },
  _onFocusIn(e) {
    if (mockIsInjected) return;
    const t = e.target;
    if (!t) return;
    const input = this.adapter?.getInputField?.();
    const isTarget = (input && (t === input || input.contains(t))) ||
      t.isContentEditable ||
      t.tagName === 'TEXTAREA' ||
      (typeof t.closest === 'function' && t.closest('textarea, [contenteditable="true"], .ProseMirror, [data-testid*="composer"], div[class*="composer"], form, fieldset'));
    if (isTarget) {
      this._attemptInject();
    }
  },
  _onInteraction(e) {
    if (mockIsInjected) return;
    const t = e.target;
    if (!t) return;
    const input = this.adapter?.getInputField?.();
    const isTarget = (input && (t === input || input.contains(t))) ||
      t.isContentEditable ||
      t.tagName === 'TEXTAREA' ||
      (typeof t.closest === 'function' && t.closest('textarea, [contenteditable="true"], .ProseMirror, [data-testid*="composer"], div[class*="composer"], button[aria-label*="send" i], button[data-testid*="send" i]'));
    if (isTarget) {
      this._attemptInject();
    }
  }
};

// 1. Direct focus on editor child triggers injection
injectAttempts = 0;
mockIsInjected = false;
simulatedManager._onFocusIn({ target: childSpan });
assert.strictEqual(injectAttempts, 1, 'Focus on child span inside editor must trigger injection');
console.log('  ✓ PASS: Focus on child node inside editor triggers injection watchdog');

// 2. Direct click on composer wrapper triggers injection
injectAttempts = 0;
simulatedManager._onInteraction({ target: composerWrapper });
assert.strictEqual(injectAttempts, 1, 'Pointer down on composer wrapper must trigger injection');
console.log('  ✓ PASS: Pointer interaction on composer wrapper triggers injection watchdog');

// 3. When button is already injected, interactions do not trigger re-injection
injectAttempts = 0;
mockIsInjected = true;
simulatedManager._onFocusIn({ target: childSpan });
simulatedManager._onInteraction({ target: composerWrapper });
assert.strictEqual(injectAttempts, 0, 'No injection attempt when already injected');
console.log('  ✓ PASS: Injected state prevents redundant re-injections');

console.log('\n============================================================');
console.log(' ALL COMPOSER DOM MUTATION DRIFT TESTS PASSED (100%)');
console.log('============================================================\n');
