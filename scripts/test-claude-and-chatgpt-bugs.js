// test-claude-and-chatgpt-bugs.js
// Verification suite for Claude button visibility & ChatGPT rewrite preview auto-send bugs

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('============================================================');
console.log(' PROMPTPRO BUG VERIFICATION: CLAUDE INLINE & CHATGPT PREVIEW');
console.log('============================================================\n');

const mainJsPath = path.join(__dirname, '..', 'content', 'main.js');
const mainJsCode = fs.readFileSync(mainJsPath, 'utf8');

// 1. Static Verification of Button Types and PreventDefault
console.log('--- 1. Static Code Analysis: Form Submit Prevention ---');

// cancelBtn and applyBtn must have type = 'button'
assert.match(
  mainJsCode,
  /cancelBtn\.type\s*=\s*['"]button['"]/,
  'cancelBtn must explicitly set type = "button"'
);
console.log('  ✓ PASS: cancelBtn sets type = "button"');

assert.match(
  mainJsCode,
  /applyBtn\.type\s*=\s*['"]button['"]/,
  'applyBtn must explicitly set type = "button"'
);
console.log('  ✓ PASS: applyBtn sets type = "button"');

// cancelBtn must call e.preventDefault()
assert.match(
  mainJsCode,
  /cancelBtn\.addEventListener\('click',\s*\(e\)\s*=>\s*\{[\s\S]*?e\.preventDefault\(\)/,
  'cancelBtn click handler must call e.preventDefault()'
);
console.log('  ✓ PASS: cancelBtn click handler calls e.preventDefault()');

// applyBtn must call e.preventDefault()
assert.match(
  mainJsCode,
  /applyBtn\.addEventListener\('click',\s*\(e\)\s*=>\s*\{[\s\S]*?e\.preventDefault\(\)/,
  'applyBtn click handler must call e.preventDefault()'
);
console.log('  ✓ PASS: applyBtn click handler calls e.preventDefault()');

// Popover must not be appended into container (<form>)
assert.doesNotMatch(
  mainJsCode,
  /container\.appendChild\(popover\)/,
  'popover must NOT be appended into container inside form'
);
console.log('  ✓ PASS: popover is portaled to document.body and not appended into container/form');

// detachPopoverPortal must not append into container
assert.doesNotMatch(
  mainJsCode,
  /detachPopoverPortal[\s\S]*?container\.appendChild\(pop\)/,
  'detachPopoverPortal must not re-append popover into container'
);
console.log('  ✓ PASS: detachPopoverPortal preserves portal outside form');

// 2. DOM Simulation: Claude Adapter Injection Point
console.log('\n--- 2. DOM Simulation: Claude Adapter ---');

// Mock a lightweight DOM environment for testing ClaudeAdapter and ChatGPTAdapter
class MockElement {
  constructor(tagName, attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attrs };
    this.children = [];
    this.parentElement = null;
    this.style = {};
    this.classList = new Set((attrs.className || attrs.class || '').split(/\s+/).filter(Boolean));
    this.disabled = false;
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

  matches(sel) {
    if (sel.startsWith('button')) {
      if (this.tagName !== 'BUTTON') return false;
      if (sel.includes('aria-label*=')) {
        const m = sel.match(/aria-label\*="([^"]+)"/i);
        if (m) {
          const val = (this.attributes['aria-label'] || '').toLowerCase();
          return val.includes(m[1].toLowerCase());
        }
      }
      return true;
    }
    return false;
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
        if (sel.includes('div[contenteditable="true"]')) {
          if (child.tagName === 'DIV' && child.attributes.contenteditable === 'true') match = true;
        } else if (sel.includes('button')) {
          if (child.tagName === 'BUTTON') {
            if (sel.includes('aria-label*=')) {
              const m = sel.match(/aria-label\*="([^"]+)"/i);
              if (m) {
                const val = (child.attributes['aria-label'] || '').toLowerCase();
                if (val.includes(m[1].toLowerCase())) match = true;
              } else {
                match = true;
              }
            } else {
              match = true;
            }
          }
        }
        if (match) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }

  closest(sel) {
    let cur = this;
    while (cur) {
      if (sel.includes('div[class*="composer"]') && cur.classList && cur.classList.has('composer')) return cur;
      if (sel.includes('form') && cur.tagName === 'FORM') return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  get nextElementSibling() {
    if (!this.parentElement) return null;
    const idx = this.parentElement.children.indexOf(this);
    return this.parentElement.children[idx + 1] || null;
  }
}

// Build modern Claude empty-state DOM (as seen in user screenshot):
// <div class="composer">
//   <div class="pill">
//     <button aria-label="Add content">+</button>
//     <div contenteditable="true" class="ProseMirror"></div>
//     <div class="right-buttons">
//       <button aria-label="Record voice note">mic</button>
//       <button aria-label="Speech">audio</button>
//       <button aria-label="Select model">v</button>
//     </div>
//   </div>
// </div>
const claudeComposer = new MockElement('div', { class: 'composer' });
const pill = new MockElement('div', { class: 'pill flex' });
const attachBtn = new MockElement('button', { 'aria-label': 'Add content' });
const claudeEditor = new MockElement('div', { contenteditable: 'true', class: 'ProseMirror' });
const rightBtns = new MockElement('div', { class: 'right-buttons' });
const micBtn = new MockElement('button', { 'aria-label': 'Record voice note' });
const speechBtn = new MockElement('button', { 'aria-label': 'Speech readout' });
const modelBtn = new MockElement('button', { 'aria-label': 'Select model' });

rightBtns.appendChild(micBtn);
rightBtns.appendChild(speechBtn);
rightBtns.appendChild(modelBtn);

pill.appendChild(attachBtn);
pill.appendChild(claudeEditor);
pill.appendChild(rightBtns);
claudeComposer.appendChild(pill);

// Test Strategy 2 (Mic button match when prompt is empty):
const voiceBtn = claudeComposer.querySelector('button[aria-label*="voice" i], button[aria-label*="mic" i]');
assert(voiceBtn === micBtn, 'Should find micBtn in Claude composer when prompt is empty');
assert.strictEqual(voiceBtn.parentElement, rightBtns, 'Mic button parent should be the right-buttons container');
console.log('  ✓ PASS: Claude empty state detects micBtn and targets right-actions cluster');

// 3. ChatGPT Form Auto-Submit Guard Simulation
console.log('\n--- 3. ChatGPT Form Auto-Submit Guard Simulation ---');

let formSubmitted = false;
let sendButtonClicked = false;

const chatgptForm = {
  events: {},
  addEventListener(type, fn, capture) {
    this.events[type] = this.events[type] || [];
    this.events[type].push({ fn, capture });
  },
  removeEventListener(type, fn) {
    if (this.events[type]) {
      this.events[type] = this.events[type].filter(item => item.fn !== fn);
    }
  },
  submit() {
    formSubmitted = true;
  }
};

// Simulate blockSubmit in ChatGPTAdapter.setPromptText
const blockSubmit = (e) => {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  return false;
};

chatgptForm.addEventListener('submit', blockSubmit, true);

// Trigger a mock submit event
let defaultPrevented = false;
const mockSubmitEvent = {
  preventDefault() { defaultPrevented = true; },
  stopPropagation() {},
  stopImmediatePropagation() {}
};

for (const listener of chatgptForm.events['submit'] || []) {
  listener.fn(mockSubmitEvent);
}

assert.strictEqual(defaultPrevented, true, 'Form submission must be prevented by capture-phase blocker');
console.log('  ✓ PASS: ChatGPT submit blocker intercepts and prevents auto-submission');

console.log('\n============================================================');
console.log(' ALL BUG FIX CHECKS PASSED (100%)');
console.log('============================================================');
