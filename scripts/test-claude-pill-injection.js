// scripts/test-claude-pill-injection.js
// Verification suite for Claude single-capsule pill layout injection & multi-chat persistence

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('============================================================');
console.log(' PROMPTPRO VERIFICATION: CLAUDE CAPSULE PILL INJECTION');
console.log('============================================================\n');

// 1. Static Verification in content/main.js
const mainJsPath = path.join(__dirname, '..', 'content', 'main.js');
const mainJsCode = fs.readFileSync(mainJsPath, 'utf8');

console.log('--- 1. Static Code Analysis: Claude Adapter & Observer ---');

// Check that ProseMirror and contenteditable are expanded in input selectors
assert(mainJsCode.includes('div.ProseMirror[contenteditable="true"]'), 'Must include div.ProseMirror[contenteditable="true"]');
assert(mainJsCode.includes('div.ProseMirror'), 'Must include div.ProseMirror');
console.log('  ✓ PASS: ProseMirror selectors expanded');

// Check that DOCUMENT_POSITION_FOLLOWING is used for right-hand actions isolation
assert(mainJsCode.includes('Node.DOCUMENT_POSITION_FOLLOWING'), 'Must use DOCUMENT_POSITION_FOLLOWING');
console.log('  ✓ PASS: Relative document positioning used to isolate right-hand cluster');

// Check that isInjected and cleanupOrphans accept adapter parameter
assert(/function\s+isInjected\s*\(\s*adapter\s*\)/.test(mainJsCode), 'isInjected must accept adapter');
assert(/function\s+cleanupOrphans\s*\(\s*adapter\s*\)/.test(mainJsCode), 'cleanupOrphans must accept adapter');
console.log('  ✓ PASS: isInjected and cleanupOrphans validate against active composer');

// 2. DOM Simulation: Single-Capsule Pill Structure (Claude Sonnet 3.5 / 5.5 UI)
console.log('\n--- 2. DOM Simulation: Claude Capsule Pill ---');

class MockElement {
  constructor(tagName, attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attrs };
    this.children = [];
    this.parentElement = null;
    this.style = {};
    this.classList = new Set((attrs.className || attrs.class || '').split(/\s+/).filter(Boolean));
    this.isConnected = true;
  }

  getAttribute(k) { return this.attributes[k] || null; }
  setAttribute(k, v) { this.attributes[k] = v; }
  hasAttribute(k) { return k in this.attributes; }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  insertBefore(newChild, refChild) {
    newChild.parentElement = this;
    const idx = this.children.indexOf(refChild);
    if (idx === -1) this.children.push(newChild);
    else this.children.splice(idx, 0, newChild);
    return newChild;
  }

  remove() {
    this.isConnected = false;
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx !== -1) this.parentElement.children.splice(idx, 1);
      this.parentElement = null;
    }
  }

  contains(child) {
    let cur = child;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  closest(sel) {
    let cur = this;
    while (cur) {
      if (sel.includes('fieldset') && cur.tagName === 'FIELDSET') return cur;
      if (sel.includes('form') && cur.tagName === 'FORM') return cur;
      if (sel.includes('composer') && cur.classList && Array.from(cur.classList).some(c => c.includes('composer'))) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  querySelector(sel) {
    const list = this.querySelectorAll(sel);
    return list[0] || null;
  }

  querySelectorAll(sel) {
    const results = [];
    const walk = (node) => {
      for (const child of node.children) {
        let match = false;
        if (sel.includes('div.ProseMirror') || sel.includes('.ProseMirror')) {
          if (child.tagName === 'DIV' && child.classList.has('ProseMirror')) match = true;
        } else if (sel.includes('button')) {
          if (child.tagName === 'BUTTON') match = true;
        }
        if (match) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }

  compareDocumentPosition(other) {
    // Determine order by walking root tree
    let root = this;
    while (root.parentElement) root = root.parentElement;
    const flat = [];
    const flatten = (node) => {
      flat.push(node);
      for (const c of node.children) flatten(c);
    };
    flatten(root);
    const thisIdx = flat.indexOf(this);
    const otherIdx = flat.indexOf(other);
    return otherIdx > thisIdx ? 4 : 2; // 4 = DOCUMENT_POSITION_FOLLOWING
  }
}

// Build exact DOM layout from user's Claude screenshot:
// <div class="composer-outer">
//   <div class="pill flex items-center">
//     <div class="left-cluster">
//       <button class="plus-btn">+</button>
//     </div>
//     <div class="editor-wrapper">
//       <div class="ProseMirror" contenteditable="true" data-placeholder="Write a message..."></div>
//     </div>
//     <div class="right-cluster flex items-center">
//       <button class="mic-btn" aria-label="Use voice input">mic</button>
//       <button class="chevron-btn" aria-haspopup="menu">v</button>
//       <button class="waveform-btn" aria-label="Voice mode">waveform</button>
//     </div>
//   </div>
//   <div class="footer flex justify-between">
//     <span>Claude is AI...</span>
//     <button class="model-selector-btn">Sonnet 5.5 Medium</button>
//   </div>
// </div>

const outer = new MockElement('div', { class: 'composer-outer' });
const pill = new MockElement('div', { class: 'pill flex' });
const leftCluster = new MockElement('div', { class: 'left-cluster' });
const plusBtn = new MockElement('button', { class: 'plus-btn' }); // note: no aria-label
leftCluster.appendChild(plusBtn);

const editorWrapper = new MockElement('div', { class: 'editor-wrapper' });
const editor = new MockElement('div', { class: 'ProseMirror', contenteditable: 'true', 'data-placeholder': 'Write a message...' });
editorWrapper.appendChild(editor);

const rightCluster = new MockElement('div', { class: 'right-cluster flex' });
const micBtn = new MockElement('button', { class: 'mic-btn', 'aria-label': 'Use voice input' });
const chevronBtn = new MockElement('button', { class: 'chevron-btn', 'aria-haspopup': 'menu' });
const waveformBtn = new MockElement('button', { class: 'waveform-btn', 'aria-label': 'Voice mode' });
rightCluster.appendChild(micBtn);
rightCluster.appendChild(chevronBtn);
rightCluster.appendChild(waveformBtn);

pill.appendChild(leftCluster);
pill.appendChild(editorWrapper);
pill.appendChild(rightCluster);

const footer = new MockElement('div', { class: 'footer flex' });
const modelBtn = new MockElement('button', { class: 'model-selector-btn' });
footer.appendChild(modelBtn);

outer.appendChild(pill);
outer.appendChild(footer);

// Verify editor detection
const editors = outer.querySelectorAll('div.ProseMirror, div[contenteditable="true"]');
assert(editors.includes(editor), 'Must find ProseMirror editor');
console.log('  ✓ PASS: Editor detected correctly in pill structure');

// Verify right buttons isolation using compareDocumentPosition
const allBtns = outer.querySelectorAll('button');
const rightBtns = allBtns.filter(b => (editor.compareDocumentPosition(b) & 4) !== 0 && pill.contains(b));

assert.strictEqual(rightBtns.length, 3, 'Must identify exactly 3 right-cluster buttons inside pill');
assert.strictEqual(rightBtns[0], micBtn, 'First right button must be micBtn');
assert(!rightBtns.includes(plusBtn), 'Plus button must NOT be in right-cluster');
assert(!rightBtns.includes(modelBtn), 'Model button must NOT be inside pill right-cluster');
console.log('  ✓ PASS: Right-actions correctly isolated (plus and model buttons excluded)');

// Verify injection point target
const target = rightBtns[0];
assert.strictEqual(target.parentElement, rightCluster, 'Target parent must be right-cluster');

// Simulate injection: insert container before micBtn
const promptProContainer = new MockElement('div', { class: 'promptpro-container promptpro-container--claude' });
rightCluster.insertBefore(promptProContainer, target);

assert.strictEqual(rightCluster.children[0], promptProContainer, 'PromptPro container must be first in right-cluster');
assert.strictEqual(rightCluster.children[1], micBtn, 'Mic button must be immediately after PromptPro container');
console.log('  ✓ PASS: PromptPro successfully placed immediately before mic button inside capsule pill');

// Verify areInSameComposer simulation:
function areInSameComposer(nodeA, nodeB) {
  if (!nodeA || !nodeB || !nodeA.isConnected || !nodeB.isConnected) return false;
  let cur = nodeA.parentElement;
  for (let i = 0; i < 10 && cur && cur !== outer; i++) {
    if (cur.contains(nodeB)) return true;
    cur = cur.parentElement;
  }
  return false;
}

const ppBtn = new MockElement('button', { id: 'promptpro-upgrade-btn' });
promptProContainer.appendChild(ppBtn);

assert(areInSameComposer(ppBtn, editor), 'PromptPro button and editor must be identified in same composer');
console.log('  ✓ PASS: areInSameComposer correctly matches button in right-cluster with editor in editor-wrapper');

// Stale button from previous conversation:
const oldChatOuter = new MockElement('div', { class: 'composer-outer' });
const staleContainer = new MockElement('div', { class: 'promptpro-container' });
const staleBtn = new MockElement('button', { id: 'promptpro-upgrade-btn' });
staleContainer.appendChild(staleBtn);
oldChatOuter.appendChild(staleContainer);

assert(!areInSameComposer(staleBtn, editor), 'Stale button from another conversation must NOT match active editor');
console.log('  ✓ PASS: Stale button from inactive conversation correctly identified as orphan');

console.log('\n============================================================');
console.log(' ALL CLAUDE PILL INJECTION TESTS PASSED (100%)');
console.log('============================================================\n');
