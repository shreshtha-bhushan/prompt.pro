/**
 * PromptPro — Content Script (Production-Grade Rewrite)
 *
 * Fixes applied:
 *  1. Persistent body observer — never disconnects; recovers from any DOM mutation
 *  2. Heuristic button anchoring — orphan cleanup, data-attribute dedup, traversal-based placement
 *  3. Safe prompt injection — execCommand-first, never innerHTML on contenteditable
 *  4. Gemini submission guard — isPreviewActive flag, Enter interception, no composed:true
 *  5. Event listener dedup — global listeners registered once at init, not per injection
 *  6. SPA navigation detection — pushState/replaceState/popstate hooks
 *  7. Element cache with isConnected validation
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // Constants
  // ═══════════════════════════════════════════════════════════

  const IDS = {
    BTN: 'promptpro-upgrade-btn',
    POPOVER: 'promptpro-popover',
    PREVIEW: 'promptpro-preview',
    APPLY: 'promptpro-apply-btn',
    RINGS: 'promptpro-score-rings',
    SUGGESTIONS: 'promptpro-suggestions-box'
  };

  const DATA_ATTR = 'data-promptpro';
  const DATA_VALUE = 'upgrade';
  const INJECT_DEBOUNCE_MS = 120;
  const PREVIEW_DEBOUNCE_MS = 80;
  const NAV_SETTLE_MS = 350;

  // ═══════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════

  const STATE = {
    isOpen: false,
    isPreviewActive: false,   // Fix 4: submission guard
    lastAdapter: null,
    originalText: '',
    currentRewrite: null,
    currentScore: null,
    activeTone: 'none',
    activeStrategy: 'enhance',
    activeRefinement: null,
    isDiffView: false,
    isRefining: false,
    db: null,
    listenersRegistered: false, // Fix 5: register once
    lastUrl: location.href      // Fix 6: SPA detection
  };

  // ═══════════════════════════════════════════════════════════
  // Element Cache (Fix 7)
  // ═══════════════════════════════════════════════════════════

  const _cache = { input: null, toolbar: null, sendButton: null };

  function cachedQuery(adapter, key) {
    if (_cache[key] && _cache[key].isConnected) return _cache[key];
    const getter = key === 'input' ? 'getInputField'
      : key === 'toolbar' ? 'getToolbar'
      : 'getSendButton';
    const el = adapter[getter]();
    _cache[key] = el;
    return el;
  }

  function invalidateCache() {
    _cache.input = null;
    _cache.toolbar = null;
    _cache.sendButton = null;
  }

  // ═══════════════════════════════════════════════════════════
  // Shadow DOM Traverser
  // ═══════════════════════════════════════════════════════════

  function shadowQuery(root, selector) {
    try {
      const direct = root.querySelector?.(selector);
      if (direct) return direct;
    } catch { /* invalid selector in this context */ }
    return _walk(root, selector);
  }

  function _walk(node, selector) {
    if (node.shadowRoot) {
      try {
        const found = node.shadowRoot.querySelector(selector);
        if (found) return found;
      } catch { /* */ }
      for (const child of node.shadowRoot.children) {
        const deep = _walk(child, selector);
        if (deep) return deep;
      }
    }
    for (const child of node.children || []) {
      const deep = _walk(child, selector);
      if (deep) return deep;
    }
    return null;
  }

  /**
   * Find the composer wrapper associated with an anchor element (like the PromptPro button or send button).
   * Walks up from the anchor to find the closest ancestor that contains an editable input.
   * This is guaranteed to locate the exact chat composer and avoids selecting sidebar search,
   * project metadata, custom instructions, or canvas editors.
   */
  function findClosestComposer(anchor) {
    if (!anchor || !anchor.isConnected) return null;
    let walk = anchor.parentElement;
    for (let i = 0; i < 15 && walk && walk !== document.body; i++) {
      // Exclude sidebar or navigation elements
      const isSidebar = walk.matches?.('aside, [data-testid*="sidebar"], nav')
        || walk.closest?.('aside, [data-testid*="sidebar"], nav');
      if (!isSidebar) {
        const editor = walk.querySelector('#prompt-textarea, [contenteditable="true"], [contenteditable="plaintext-only"], div[role="textbox"], textarea');
        if (editor) {
          return walk;
        }
      }
      walk = walk.parentElement;
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // Canonical Prompt Reader
  // ═══════════════════════════════════════════════════════════

  /**
   * Read the current text from a composer input element.
   *
   * This is the single source of truth for prompt extraction.
   * It handles:
   *   - <textarea> elements (use .value)
   *   - contenteditable divs (ProseMirror, Lexical, Quill, etc.)
   *   - Ghost text spans injected by PromptPro autocomplete (excluded)
   *   - Trailing newlines from ProseMirror paragraph structure
   *   - Nested paragraph elements
   *
   * IMPORTANT: Always read at action-time from the live DOM,
   * never from cached/stale state.
   *
   * @param {Element|null} input - The composer input element
   * @returns {string} Normalized prompt text (trimmed)
   */
  function getCurrentPrompt(input) {
    if (!input || !input.isConnected) return '';

    // ── Textarea: use .value (React-controlled or native) ────────────────
    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
      const val = (input.value || '').trim();
      if (val) return val;
      // If textarea is empty, check if there is an active contenteditable in the same composer/form
      const form = input.closest('form, [data-testid*="composer"]');
      if (form) {
        const ce = form.querySelector('#prompt-textarea, [contenteditable="true"], [contenteditable="plaintext-only"], div[role="textbox"]');
        if (ce && ce !== input) {
          const ceText = getCurrentPrompt(ce);
          if (ceText) return ceText;
        }
      }
      return '';
    }

    // ── ContentEditable (ProseMirror, Lexical, Quill, etc.) ─────────────
    // Strip PromptPro ghost elements without affecting the live DOM
    const GHOST_IDS = ['promptpro-ghost-text', 'promptpro-ghost-overlay'];
    const GHOST_ATTR = DATA_ATTR; // 'data-promptpro'

    const hasGhost = GHOST_IDS.some(id => input.querySelector('#' + id))
      || input.querySelector(`[${GHOST_ATTR}="ghost"]`);

    let text = '';
    if (!hasGhost) {
      // innerText respects CSS visibility and layout (handles ProseMirror <p> tags).
      text = (input.innerText || '').replace(/\n$/, '').trim();
      // If innerText is empty (can happen with certain flex/CSS states), fall back to textContent
      if (!text) {
        text = (input.textContent || '').replace(/\n$/, '').trim();
      }
    } else {
      const clone = input.cloneNode(true);
      GHOST_IDS.forEach(id => clone.querySelector('#' + id)?.remove());
      clone.querySelectorAll(`[${GHOST_ATTR}="ghost"]`).forEach(el => el.remove());
      text = (clone.textContent || '').replace(/\n$/, '').trim();
    }

    return text;
  }

  // ═══════════════════════════════════════════════════════════
  // Base Adapter
  // ═══════════════════════════════════════════════════════════

  class BaseSiteAdapter {
    get siteId() { throw new Error('override'); }
    get selectors() { throw new Error('override'); }

    getInputField() { return this._query(this.selectors.input); }
    getToolbar() { return this._query(this.selectors.toolbar); }
    getSendButton() { return this._query(this.selectors.sendButton); }

    getPromptText() {
      const input = this.getInputField();
      return getCurrentPrompt(input);
    }

    /**
     * Safe prompt text injection.
     * Fix 3: execCommand-first strategy that preserves framework state.
     * Fix 4: Gemini guard — never fire composed:true change events.
     */
    setPromptText(text) {
      const input = this.getInputField();
      if (!input) return;

      if (input.tagName === 'TEXTAREA') {
        this._setTextarea(input, text);
      } else {
        this._setContentEditable(input, text);
      }
    }

    _setTextarea(input, text) {
      const nativeSet = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeSet) nativeSet.call(input, text);
      else input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
      try { input.setSelectionRange(text.length, text.length); } catch { /* */ }
    }

    /**
     * Fix 3: ContentEditable injection — execCommand first, DataTransfer fallback, manual last.
     * NEVER use innerHTML = '' on ProseMirror editors.
     */
    _setContentEditable(input, text) {
      input.focus();

      // Strategy 1: execCommand (best — works with ProseMirror undo stack)
      try {
        document.execCommand('selectAll', false, null);
        const success = document.execCommand('insertText', false, text);
        if (success) {
          this._finalizeCursor(input);
          this._dispatchInputEvent(input, text);
          return;
        }
      } catch { /* execCommand not available */ }

      // Strategy 2: InputEvent with dataTransfer (modern replacement for execCommand)
      try {
        const selection = window.getSelection();
        if (selection && input.firstChild) {
          const range = document.createRange();
          range.selectNodeContents(input);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const beforeInputEvent = new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertReplacementText',
          dataTransfer: dt
        });
        const accepted = input.dispatchEvent(beforeInputEvent);
        if (accepted) {
          // If the editor handled beforeinput, it will update its own DOM
          this._dispatchInputEvent(input, text);
          return;
        }
      } catch { /* DataTransfer InputEvent not supported */ }

      // Strategy 3: Manual DOM manipulation (last resort — loses undo stack)
      // Use textContent instead of innerHTML to avoid ProseMirror desync
      const lines = text.split('\n');
      input.textContent = '';
      for (const line of lines) {
        const p = document.createElement('p');
        if (line.trim() === '') {
          p.appendChild(document.createElement('br'));
        } else {
          p.textContent = line;
        }
        input.appendChild(p);
      }
      this._finalizeCursor(input);
      this._dispatchInputEvent(input, text);
    }

    _finalizeCursor(input) {
      try {
        const selection = window.getSelection();
        if (selection && input.lastChild) {
          const range = document.createRange();
          range.selectNodeContents(input.lastChild);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch { /* */ }
    }

    /**
     * Fix 4: Dispatch input event WITHOUT composed:true.
     * composed:true was leaking through Gemini's shadow DOM and triggering auto-submit.
     */
    _dispatchInputEvent(input, text) {
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: text
        // NOTE: composed intentionally omitted — was causing Gemini auto-submit
      }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    _query(selectorChain) {
      for (const sel of selectorChain) {
        const el = shadowQuery(document, sel);
        if (el) return el;
      }
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Site Adapters
  // ═══════════════════════════════════════════════════════════

  class ChatGPTAdapter extends BaseSiteAdapter {
    get siteId() { return 'chatgpt'; }
    get selectors() {
      return {
        input: [
          '#prompt-textarea',
          'div#prompt-textarea',
          'form [contenteditable="true"]',
          '[data-testid="composer"] [contenteditable="true"]',
          'div[contenteditable="true"]',
          '[contenteditable="true"]',
          '[contenteditable="plaintext-only"]',
          'div[role="textbox"]',
          'div[contenteditable="true"][data-placeholder]',
          'textarea#prompt-textarea',
          'textarea[data-id="root"]',
          'form textarea',
          'textarea'
        ],
        toolbar: [
          '[data-testid="composer-trailing-actions"]',
          'form div[class*="flex"][class*="items-end"]',
          '#prompt-textarea ~ div',
          'form > div > div:last-child',
          'form div[class*="justify-between"]',
          'div[class*="trailing"]'
        ],
        sendButton: [
          'button[data-testid="send-button"]',
          'button[data-testid="fruitjuice-send-button"]',
          'button[aria-label="Send prompt"]',
          'button[aria-label="Send"]',
          'button[aria-label*="send" i]',
          'form button[class*="bottom"]:last-of-type'
        ]
      };
    }

    getInputField() {
      // 1. If activeElement is an editor, prioritize it (excluding sidebar)
      const active = document.activeElement;
      if (active && (active.isContentEditable || active.tagName === 'TEXTAREA')) {
        if (!active.closest('aside, [data-testid*="sidebar"], nav')) {
          return active;
        }
      }

      // 2. Query within composer context first using anchor-relative hierarchy
      // This is especially crucial for ChatGPT Projects where the composer has no <form>
      const btn = document.getElementById(IDS.BTN);
      const sendBtn = this.getSendButton();
      const composer = findClosestComposer(btn) || findClosestComposer(sendBtn);

      if (composer) {
        const ce = composer.querySelector('#prompt-textarea, [contenteditable="true"], [contenteditable="plaintext-only"], div[role="textbox"]');
        if (ce) return ce;
        const ta = composer.querySelector('textarea');
        if (ta) return ta;
      }

      // 3. Fallback: Query within <main> element, preferring bottom-most editor (to avoid project header / custom instructions)
      const main = document.querySelector('main, [role="main"]');
      if (main) {
        const editors = main.querySelectorAll('#prompt-textarea, [contenteditable="true"], [contenteditable="plaintext-only"], div[role="textbox"], textarea');
        if (editors.length > 0) {
          return editors[editors.length - 1];
        }
      }

      // 4. Global bottom-up editor fallback excluding sidebar
      const allEditors = document.querySelectorAll(
        '#prompt-textarea, [contenteditable="true"], [contenteditable="plaintext-only"], div[role="textbox"], textarea'
      );
      for (let i = allEditors.length - 1; i >= 0; i--) {
        const el = allEditors[i];
        if (!el.closest('aside, [data-testid*="sidebar"], nav')) {
          return el;
        }
      }

      return super.getInputField();
    }

    /**
     * ChatGPT injection point.
     *
     * Goal: inject PromptPro button INSIDE the trailing-actions container,
     * immediately BEFORE the send button — never overlapping Dictate/Voice.
     */
    findInjectPoint() {
      // Find send button directly in document/shadow root without falling back to document.querySelector('form')
      const send = document.querySelector('button[data-testid="send-button"]')
        || document.querySelector('button[data-testid="fruitjuice-send-button"]')
        || document.querySelector('button[aria-label="Send prompt"]')
        || document.querySelector('button[aria-label="Send"]')
        || document.querySelector('button[aria-label*="send" i]')
        || shadowQuery(document, 'button[data-testid="send-button"]');

      if (send?.parentElement) {
        return { parent: send.parentElement, before: send };
      }

      const trailing = document.querySelector('[data-testid="composer-trailing-actions"]');
      if (trailing) {
        return { parent: trailing, before: null };
      }

      const voice = document.querySelector(
        'button[data-testid="composer-speech-button"],' +
        'button[data-testid="composer-mic-button"],' +
        'button[aria-label*="Voice" i],' +
        'button[aria-label*="Dictate" i]'
      ) || shadowQuery(document, 'button[data-testid="composer-speech-button"]');
      if (voice?.parentElement) {
        return { parent: voice.parentElement, before: voice.nextSibling || null };
      }

      const footer = document.querySelector(
        '[data-testid="composer-footer"],footer[data-testid="composer-footer"]'
      );
      if (footer) {
        const row = footer.querySelector('div') || footer;
        const lastBtn = [...row.querySelectorAll('button')].pop();
        if (lastBtn?.parentElement) {
          return { parent: lastBtn.parentElement, before: lastBtn };
        }
      }

      return null;
    }

    /**
     * Safe prompt injection for ChatGPT.
     * Prevents auto-submitting the form when the prompt is applied.
     */
    setPromptText(text) {
      const input = this.getInputField();
      if (!input) return;

      // 1. Find enclosing form
      const form = input.closest('form') || document.querySelector('form');

      // 2. Temporarily attach capture-phase submit blockers to prevent form auto-submission
      const blockSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      };

      if (form) form.addEventListener('submit', blockSubmit, true);
      document.addEventListener('submit', blockSubmit, true);

      // 3. Temporarily disable send button to prevent click-through
      const sendBtn = this.getSendButton();
      let wasSendEnabled = false;
      if (sendBtn) {
        wasSendEnabled = !sendBtn.disabled;
        sendBtn.disabled = true;
        sendBtn.style.pointerEvents = 'none';
      }

      // 4. Update the prompt text in editor (execCommand first for ProseMirror)
      if (input.tagName === 'TEXTAREA') {
        this._setTextarea(input, text);
      } else {
        this._setContentEditable(input, text);
      }

      // 5. Restore form submission capability and send button after DOM events settle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (form) form.removeEventListener('submit', blockSubmit, true);
          document.removeEventListener('submit', blockSubmit, true);
          if (sendBtn && wasSendEnabled) {
            sendBtn.disabled = false;
            sendBtn.style.pointerEvents = '';
          }
        });
      });
    }
  }

  class ClaudeAdapter extends BaseSiteAdapter {
    get siteId() { return 'claude'; }
    get selectors() {
      return {
        input: [
          // ProseMirror contenteditable — Claude's primary editor
          'div[contenteditable="true"].ProseMirror',
          'div[contenteditable="true"][data-placeholder]',
          'div[contenteditable="true"][aria-label*="Write" i]',
          'div[contenteditable="true"][aria-label*="Claude" i]',
          'div[contenteditable="true"]',
          '[contenteditable="true"]',
          'div[role="textbox"]'
        ],
        toolbar: [
          'div[class*="flex"]:has(button[aria-label*="voice" i], button[aria-label*="mic" i])',
          'div[class*="flex"]:has(button[aria-label*="Send" i])',
          'div[class*="flex"]:has(button[aria-label*="Attach" i])',
          'fieldset > div:last-child',
          'div[class*="toolbar"]'
        ],
        sendButton: [
          'button[aria-label*="Send" i]',
          'button[data-testid="send-button"]',
          'button[aria-label="Send Message"]',
          'button[aria-label="Send message"]',
          'button[type="submit"]',
          // Claude voice/mic button when send button is absent in empty state:
          'button[aria-label*="mic" i]',
          'button[aria-label*="voice" i]'
        ]
      };
    }

    getInputField() {
      // 1. If activeElement is an editor, prioritize it (excluding sidebar)
      const active = document.activeElement;
      if (active && (active.isContentEditable || active.tagName === 'TEXTAREA')) {
        if (!active.closest('aside, [data-testid*="sidebar"], nav')) {
          return active;
        }
      }

      // 2. Query within composer context first using anchor-relative hierarchy
      const btn = document.getElementById(IDS.BTN);
      const composer = findClosestComposer(btn);
      if (composer) {
        const ce = composer.querySelector('div[contenteditable="true"].ProseMirror, div[contenteditable="true"], [contenteditable="true"], div[role="textbox"]');
        if (ce) return ce;
      }

      // 3. Fallback: Query within <main> element, preferring bottom-most editor (to avoid message history edit boxes)
      const main = document.querySelector('main, [role="main"]') || document.body;
      const editors = main.querySelectorAll(
        'div[contenteditable="true"].ProseMirror, div[contenteditable="true"][data-placeholder], div[contenteditable="true"], [contenteditable="true"], div[role="textbox"]'
      );
      for (let i = editors.length - 1; i >= 0; i--) {
        const el = editors[i];
        if (!el.closest('aside, [data-testid*="sidebar"], nav')) {
          return el;
        }
      }

      return super.getInputField();
    }

    /**
     * Claude injection point.
     * Handles modern single-pill composer layout (with mic/waveform/dropdown buttons)
     * as well as standard bottom toolbar and fieldset layouts.
     */
    findInjectPoint() {
      const input = this.getInputField();
      if (!input) return null;

      // Find enclosing composer container (can be fieldset, form, or div wrapper)
      let composer = input.closest('fieldset, form, [data-testid*="composer"], div[class*="composer"]');
      if (!composer) {
        let cur = input.parentElement;
        for (let i = 0; i < 8 && cur && cur !== document.body; i++) {
          const btns = cur.querySelectorAll('button');
          if (btns.length > 0) {
            composer = cur;
            if (btns.length >= 2 || cur.querySelector('button[aria-label*="voice" i], button[aria-label*="mic" i], button[aria-label*="Send" i], button[aria-label*="Attach" i]')) {
              break;
            }
          }
          cur = cur.parentElement;
        }
      }
      const scope = composer || document;

      // Strategy 1: Directly before the Send button (when prompt has text)
      const send = scope.querySelector('button[aria-label*="Send" i]')
        || scope.querySelector('button[data-testid*="send" i]')
        || scope.querySelector('button[type="submit"]');

      if (send?.parentElement) {
        return { parent: send.parentElement, before: send };
      }

      // Strategy 2: Directly before the Mic / Voice / Audio button
      // (Claude renders this on the right side of the input bar in empty state)
      const voice = scope.querySelector(
        'button[aria-label*="mic" i],' +
        'button[aria-label*="voice" i],' +
        'button[aria-label*="record" i],' +
        'button[aria-label*="dictat" i],' +
        'button[aria-label*="speech" i],' +
        'button[aria-label*="audio" i],' +
        'button[data-testid*="mic"],' +
        'button[data-testid*="voice"]'
      );

      if (voice?.parentElement) {
        return { parent: voice.parentElement, before: voice };
      }

      // Strategy 3: Find the right-side action button cluster inside composer
      if (composer) {
        const allBtns = [...composer.querySelectorAll('button')];
        // Filter out the left-side attach/plus button
        const actionBtns = allBtns.filter(b => !b.matches('button[aria-label*="attach" i], button[aria-label*="upload" i], button[aria-label*="add" i], button[aria-label*="content" i]'));
        if (actionBtns.length > 0) {
          // Inject before the first action button on the right side
          const target = actionBtns[0];
          if (target.parentElement) {
            return { parent: target.parentElement, before: target };
          }
        }
      }

      // Strategy 4: Walk up from input to find sibling or child row with buttons
      let walk = input.parentElement;
      for (let i = 0; i < 10 && walk && walk !== document.body; i++) {
        const sib = walk.nextElementSibling;
        if (sib) {
          const btns = [...sib.querySelectorAll('button')];
          if (btns.length > 0) {
            const firstActionBtn = btns.find(b => !b.matches('button[aria-label*="attach" i], button[aria-label*="add" i]')) || btns[0];
            if (firstActionBtn?.parentElement) {
              return { parent: firstActionBtn.parentElement, before: firstActionBtn };
            }
          }
        }
        walk = walk.parentElement;
      }

      return null;
    }

    /**
     * Claude prompt text injection with submission guard.
     */
    setPromptText(text) {
      const input = this.getInputField();
      if (!input) return;

      const form = input.closest('form, fieldset') || document.querySelector('form');
      const blockSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      };
      if (form) form.addEventListener('submit', blockSubmit, true);
      document.addEventListener('submit', blockSubmit, true);

      const sendBtn = this.getSendButton();
      let wasSendEnabled = false;
      if (sendBtn) {
        wasSendEnabled = !sendBtn.disabled;
        sendBtn.disabled = true;
        sendBtn.style.pointerEvents = 'none';
      }

      this._setContentEditable(input, text);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (form) form.removeEventListener('submit', blockSubmit, true);
          document.removeEventListener('submit', blockSubmit, true);
          if (sendBtn && wasSendEnabled) {
            sendBtn.disabled = false;
            sendBtn.style.pointerEvents = '';
          }
        });
      });
    }
  }

  class GeminiAdapter extends BaseSiteAdapter {
    get siteId() { return 'gemini'; }
    get selectors() {
      return {
        input: [
          'rich-textarea .ql-editor',
          'div.ql-editor[contenteditable="true"]',
          'div[contenteditable="true"][aria-label*="prompt" i]',
          'div[contenteditable="true"][aria-label*="Gemini" i]'
        ],
        toolbar: [
          '.input-area-container',
          '.input-area-container .trailing-actions',
          '.bottom-container div[class*="actions"]'
        ],
        sendButton: [
          'button.send-button',
          'button[aria-label="Send message"]',
          'button.submit',
          'button[mattooltip="Send"]'
        ]
      };
    }

    findInjectPoint() {
      const sendBtn = this.getSendButton();
      if (!sendBtn) return null;

      // Walk up from the send button to find the horizontal actions row.
      // Gemini typically wraps the send button in a narrow single-child div.
      // We need to climb to the flex row container so the PromptPro button
      // sits side-by-side with the send button (not stacked vertically).
      let anchor = sendBtn;
      let parent = sendBtn.parentElement;

      // Climb through single-child wrapper divs until we reach a row with siblings
      while (
        parent &&
        parent.tagName === 'DIV' &&
        parent.children.length === 1 &&
        parent.parentElement
      ) {
        anchor = parent;
        parent = parent.parentElement;
      }

      // Final parent should be the horizontal row (trailing-actions or similar).
      // Insert our container right before the send button's wrapper.
      if (parent) {
        return { parent: parent, before: anchor };
      }

      return null;
    }

    getInputField() {
      // Try standard selectors first (works when no shadow DOM)
      const fromChain = this._query(this.selectors.input);
      if (fromChain) return fromChain;

      // Fallback: traverse shadow DOM if Gemini re-enables it
      const richTextarea = document.querySelector('rich-textarea');
      if (richTextarea?.shadowRoot) {
        return richTextarea.shadowRoot.querySelector('.ql-editor')
          || richTextarea.shadowRoot.querySelector('[contenteditable="true"]');
      }
      return null;
    }

    /**
     * Fix 4: Gemini-specific text injection.
     * Temporarily disable send button during injection to prevent auto-submit.
     */
    setPromptText(text) {
      const input = this.getInputField();
      if (!input) return;

      // Temporarily disable send button to block auto-submit
      const sendBtn = this.getSendButton();
      let wasSendEnabled = false;
      if (sendBtn) {
        wasSendEnabled = !sendBtn.disabled;
        sendBtn.disabled = true;
        sendBtn.style.pointerEvents = 'none';
      }

      // Use the base execCommand strategy (never composed:true)
      this._setContentEditable(input, text);

      // Re-enable send button after events settle
      if (sendBtn && wasSendEnabled) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            sendBtn.disabled = false;
            sendBtn.style.pointerEvents = '';
          });
        });
      }
    }
  }

  class PerplexityAdapter extends BaseSiteAdapter {
    get siteId() { return 'perplexity'; }
    get selectors() {
      return {
        input: [
          '#ask-input',
          'div[contenteditable="true"][placeholder*="Ask" i]',
          'div[contenteditable="true"][data-placeholder*="Ask" i]',
          'div[contenteditable="true"]',
          '[contenteditable="true"]',
          'textarea[placeholder*="Ask" i]',
          'textarea[placeholder*="anything" i]',
          'textarea[class*="textarea" i]',
          'textarea'
        ],
        toolbar: [
          'div.flex:has(button[aria-label*="Submit" i])',
          'form div.flex:last-child',
          'div.flex:has(svg[class*="arrow"])',
          '[contenteditable="true"] ~ div',
          'textarea ~ div'
        ],
        sendButton: [
          'button[aria-label*="Submit" i]',
          'button[aria-label*="Send" i]',
          'button:has(svg[class*="arrow"])',
          'form button[type="submit"]',
          'form button:last-of-type'
        ]
      };
    }

    findInjectPoint() {
      const sendBtn = this.getSendButton();
      if (sendBtn?.parentElement) {
        return { parent: sendBtn.parentElement, before: sendBtn };
      }
      const toolbar = this.getToolbar();
      if (toolbar) {
        return { parent: toolbar, before: null };
      }
      return null;
    }

    setPromptText(text) {
      const input = this.getInputField();
      if (!input) return;

      const form = input.closest('form, fieldset') || document.querySelector('form');
      const blockSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      };
      if (form) form.addEventListener('submit', blockSubmit, true);
      document.addEventListener('submit', blockSubmit, true);

      const sendBtn = this.getSendButton();
      let wasSendEnabled = false;
      if (sendBtn) {
        wasSendEnabled = !sendBtn.disabled;
        sendBtn.disabled = true;
        sendBtn.style.pointerEvents = 'none';
      }

      if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
        this._setTextarea(input, text);
      } else {
        this._setContentEditable(input, text);
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (form) form.removeEventListener('submit', blockSubmit, true);
          document.removeEventListener('submit', blockSubmit, true);
          if (sendBtn && wasSendEnabled) {
            sendBtn.disabled = false;
            sendBtn.style.pointerEvents = '';
          }
        });
      });
    }
  }

  function resolveAdapter() {
    const host = location.hostname;
    if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) return new ChatGPTAdapter();
    if (host.includes('claude.ai')) return new ClaudeAdapter();
    if (host.includes('gemini.google.com')) return new GeminiAdapter();
    if (host.includes('perplexity.ai')) return new PerplexityAdapter();
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // Toast Notifications
  // ═══════════════════════════════════════════════════════════

  function showToast(message, type = 'info') {
    document.getElementById('promptpro-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'promptpro-toast';
    toast.className = `promptpro-toast promptpro-toast--${type}`;
    toast.innerHTML = `<span class="promptpro-toast__icon">${type === 'error' ? '⚠️' : '✅'}</span><span class="promptpro-toast__text">${message}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('promptpro-toast--visible'));
    setTimeout(() => {
      toast.classList.remove('promptpro-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════
  // Background API
  // ═══════════════════════════════════════════════════════════

  function requestRewrite(text, siteId, strategy, tone) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'UPGRADE_PROMPT', payload: { text, siteId, strategy, tone } },
        (response) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(response);
        }
      );
    });
  }

  function registerAction(actionType, value) {
    chrome.runtime.sendMessage({ type: 'REGISTER_ACTION', payload: { actionType, value } });
  }

  // ═══════════════════════════════════════════════════════════
  // V3: Canonical Style Resolution Contract
  // ═══════════════════════════════════════════════════════════

  /**
   * resolveEffectiveStyle — single source of truth for { tone, strategy }.
   *
   * Priority chain (highest → lowest):
   *   1. STATE.activeTone / STATE.activeStrategy (user explicitly selected in this session)
   *   2. Site-memory override (settings.sites[siteId].defaultTone/Strategy)
   *   3. Global settings (settings.defaultTone / settings.defaultStrategy)
   *   4. 'none' / 'enhance'
   *
   * Always call this instead of reading STATE.activeTone directly in hot paths.
   */
  function resolveEffectiveStyle(adapter) {
    const siteId = adapter ? adapter.siteId : null;
    const s = STATE.settings || {};

    // Tone resolution
    let tone = STATE.activeTone;
    if (tone === undefined || tone === null) {
      if (siteId && s.siteMemory && s.sites && s.sites[siteId] && s.sites[siteId].defaultTone !== undefined) {
        tone = s.sites[siteId].defaultTone;
      } else {
        tone = s.defaultTone || null;
      }
    }

    // Strategy resolution
    let strategy = STATE.activeStrategy;
    if (!strategy) {
      if (siteId && s.siteMemory && s.sites && s.sites[siteId] && s.sites[siteId].defaultStrategy) {
        strategy = s.sites[siteId].defaultStrategy;
      } else {
        strategy = s.defaultStrategy || 'enhance';
      }
    }

    return { tone: tone || null, strategy: strategy || 'enhance' };
  }

  // ═══════════════════════════════════════════════════════════
  // Extension Styles & Local Synthesis Engine
  // ═══════════════════════════════════════════════════════════

  function ensureExtensionStyles() {
    if (document.getElementById('promptpro-injected-stylesheet') || document.getElementById('promptpro-injected-style')) return;
    try {
      const link = document.createElement('link');
      link.id = 'promptpro-injected-stylesheet';
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = chrome.runtime.getURL('styles/injected.css');
      (document.head || document.documentElement).appendChild(link);
    } catch (_e) {}

    try {
      fetch(chrome.runtime.getURL('styles/injected.css'))
        .then(res => res.text())
        .then(css => {
          if (!document.getElementById('promptpro-injected-style') && css) {
            const style = document.createElement('style');
            style.id = 'promptpro-injected-style';
            style.textContent = css;
            (document.head || document.documentElement).appendChild(style);
          }
        })
        .catch(() => {});
    } catch (_e) {}
  }

  function synthesizeLocalUpgrade(text, strategy, tone, lowTokenEnabled, noFluff) {
    const lower = text.toLowerCase();
    let role = "Senior Domain Expert & Technical Architect";
    let format = "Provide a structured response with clear sections, actionable guidance, and edge cases.";
    let constraints = "Ensure all instructions are rigorous, clear, and follow modern best practices.";

    if (/\b(essay|article|write|story|blog|post|paragraph|summary|speech|letter|review)\b/.test(lower)) {
      role = "Distinguished Subject-Matter Scholar & Editorial Director";
      format = "Structure into: 1) Thesis statement & contextual framing, 2) Core analytical arguments, 3) Critical perspectives & nuances, 4) Compelling conclusion.";
      constraints = "Maintain intellectual rigor, academic vocabulary, coherent transitions, and eliminate fluff.";
    } else if (/\b(analyze|analysis|compare|difference|evaluate|pros and cons|benchmark|audit)\b/.test(lower)) {
      role = "Strategic Quantitative Analyst & Decision Architect";
      format = "Present a comparative multi-dimensional analysis with evaluation criteria, tradeoffs, and concrete recommendations.";
      constraints = "Ground all claims in analytical rigor and highlight hidden assumptions.";
    } else if (/\b(brainstorm|idea|creative|campaign|slogan|concept|pitch|script)\b/.test(lower)) {
      role = "Principal Creative Director & Innovation Strategist";
      format = "Deliver an organized breakdown of distinct, high-impact concepts categorized by execution complexity and strategic upside.";
      constraints = "Prioritize non-obvious, differentiated ideas over common tropes.";
    }

    if (strategy === "concise") {
      const parts = [text];
      parts.push(
        'Be concise and direct:\n' +
        '• Lead with the answer or key point.\n' +
        '• Use bullet points for multiple items.\n' +
        '• Omit preamble, filler, and unnecessary qualifications.' +
        (lowTokenEnabled ? '\n• Keep total response under 150 words.' : '\n• Keep total response under 200 words unless complexity demands more.')
      );
      if (tone && tone !== 'none') {
        parts.push(`Maintain a strictly ${tone} tone throughout.`);
      }
      return parts.join('\n\n');
    }

    if (strategy === "cot" || strategy === "elaborate") {
      const parts = [];
      parts.push(`**Role:**\n${role}`);
      parts.push(text);
      parts.push(
        'Please think through this systematically:\n' +
        '1. Begin by identifying the core question or problem.\n' +
        '2. Analyze it from multiple angles or perspectives.\n' +
        '3. Provide detailed reasoning with supporting evidence or examples.\n' +
        '4. Address potential counterarguments or edge cases.\n' +
        '5. Conclude with a clear, actionable summary.'
      );
      if (format) parts.push(`**Output Format:**\n${format}`);
      if (constraints) parts.push(`**Quality Constraints:**\n${constraints}`);
      if (tone && tone !== 'none') parts.push(`**Tone Requirement:**\nEnforce a strictly ${tone} tone throughout.`);
      return parts.join('\n\n');
    }

    const sections = [];
    sections.push(`**Role:**\n${role}`);
    sections.push(`**Task:**\nProvide an exhaustive, high-fidelity response to the following prompt:\n"${text}"`);
    sections.push(`**Output Format:**\n${format}`);
    sections.push(`**Quality Constraints:**\n${constraints}`);

    if (tone && tone !== 'none') {
      sections.push(`**Tone Requirement:**\nEnforce a strictly ${tone} tone throughout.`);
    }
    if (noFluff) {
      sections.push(`**No-Fluff Directive:**\nZero filler, maximum precision.`);
    }
    if (lowTokenEnabled) {
      sections.push(`**Token Efficiency:**\nKeep the output dense, concise, and under 200 words.`);
    }

    return sections.join("\n\n");
  }

  function scorePromptClient(text) {
    if (!text) return { total: 0, clarity: 0, specificity: 0, structure: 0, intent: 0 };
    const words = text.trim().split(/\s+/).length;
    const hasRole = /\b(act as|you are|role|expert|architect|developer)\b/i.test(text);
    const hasFormat = /\b(format|structure|markdown|bullet|table|json|step)\b/i.test(text);
    const hasConstraints = /\b(constraint|limit|rule|ensure|never|avoid|must)\b/i.test(text);

    let score = 42;
    if (words > 15) score += 15;
    if (words > 40) score += 15;
    if (hasRole) score += 10;
    if (hasFormat) score += 10;
    if (hasConstraints) score += 10;
    score = Math.min(98, Math.max(30, score));

    return {
      total: score,
      clarity: Math.min(100, score + 4),
      specificity: Math.min(100, score - 2),
      structure: hasFormat ? 92 : 54,
      intent: Math.min(100, score + 2)
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Word Counting, Change Detection & Refinement Intelligence
  // ═══════════════════════════════════════════════════════════

  function countWords(str) {
    if (!str || typeof str !== 'string') return 0;
    const tokens = str.trim().split(/\s+/).filter(Boolean);
    return tokens.length;
  }

  function updateWordCountDisplay(origText, newText) {
    const el = document.getElementById('promptpro-word-count');
    if (!el) return;
    const origCount = countWords(origText);
    const newCount = countWords(newText);
    const diff = newCount - origCount;
    const diffStr = diff > 0 ? ` (+${diff})` : diff < 0 ? ` (${diff})` : '';
    el.textContent = `${origCount} → ${newCount} words`;
    el.title = `Original: ${origCount} words, Revised: ${newCount} words${diffStr}`;
  }

  function deriveChangeSummary(originalText, rewrittenText, strategy, tone, options = {}) {
    if (!originalText || !rewrittenText) return [];
    const orig = (originalText || '').trim();
    const rew = (rewrittenText || '').trim();
    if (orig === rew) {
      return ['Prompt was already clear', 'Minor clarity adjustments applied'];
    }
    const changes = [];
    const origWords = countWords(orig);
    const rewWords = countWords(rew);

    // 1. Role injection
    const hasRoleBefore = /\b(act as|you are|role|expert|architect|developer)\b/i.test(orig);
    const hasRoleAfter = /\b(\*\*Role:\*\*|act as|you are|expert|architect|specialist)\b/i.test(rew);
    if (!hasRoleBefore && hasRoleAfter) {
      changes.push('Assigned expert role persona');
    }

    // 2. Output structure / format
    const hasFormatBefore = /\b(format|structure|bullet|table|json|markdown)\b/i.test(orig);
    const hasFormatAfter = /\b(\*\*Output Format:\*\*|\*\*Format:\*\*|bullet|structured into|markdown)\b/i.test(rew);
    if (!hasFormatBefore && hasFormatAfter) {
      changes.push('Specified output structure & format');
    }

    // 3. Constraints
    const hasConstraintsBefore = /\b(constraint|limit|rule|ensure|never|avoid|must)\b/i.test(orig);
    const hasConstraintsAfter = /\b(\*\*Quality Constraints:\*\*|constraint|strict|limit|ensure|never)\b/i.test(rew);
    if (!hasConstraintsBefore && hasConstraintsAfter) {
      changes.push('Added operational constraints');
    }

    // 4. Step-by-step reasoning / CoT
    if ((strategy === 'elaborate' || strategy === 'cot') && (/systematic|reasoning|step-by-step|\b1\.\s+Begin/i.test(rew) || rew.includes('Reasoning Steps'))) {
      changes.push('Added multi-angle reasoning scaffold');
    }

    // 5. Conciseness / Fluff reduction
    if (strategy === 'concise' || (options.noFluff && rewWords < origWords * 1.1)) {
      if (rewWords < origWords) {
        changes.push('Eliminated conversational filler & preamble');
      } else {
        changes.push('Enforced direct bulleted focus');
      }
    }

    // 6. Token efficiency
    if (options.lowTokenEnabled || rew.includes('Token Efficiency') || rew.includes('under 150 words')) {
      changes.push('Applied token-efficiency directives');
    }

    // 7. Tone requirement
    if (tone && tone !== 'none' && rew.toLowerCase().includes(tone.toLowerCase())) {
      const toneLabel = tone.charAt(0).toUpperCase() + tone.slice(1);
      changes.push(`Enforced ${toneLabel} tone`);
    }

    // 8. Task clarification fallback
    if (changes.length === 0) {
      if (rewWords !== origWords) {
        changes.push('Clarified core task instructions');
      } else {
        changes.push('Refined phrasing for precision');
      }
    }

    return changes.slice(0, 3);
  }

  function getContextualRefinements(promptText) {
    const lower = (promptText || '').toLowerCase();
    
    const isCoding = /\b(code|function|bug|react|javascript|python|typescript|css|html|api|database|sql|component|algorithm|git|regex|class|debug|endpoint)\b/i.test(lower);
    const isAcademic = /\b(essay|paper|thesis|research|academic|citation|literature|methodology|scholarly|hypothesis|dissertation)\b/i.test(lower);
    const isBusiness = /\b(email|client|proposal|business|strategy|marketing|pitch|investor|sales|roadmap|kpi|executive|meeting)\b/i.test(lower);
    const isCreative = /\b(story|poem|novel|character|scene|dialogue|script|plot|creative|fiction|metaphor)\b/i.test(lower);
    const isAnalysis = /\b(why|how|analyze|analysis|compare|difference|explain|pros and cons|benchmark|audit)\b/i.test(lower);

    const candidates = [];

    if (isCoding) {
      candidates.push({ id: 'edge-cases', label: 'Add edge cases', directive: 'Account for boundary conditions, null/empty states, and unexpected inputs with graceful error handling.' });
      candidates.push({ id: 'tests', label: 'Request unit tests', directive: 'Provide comprehensive unit tests covering happy paths, edge cases, and failure modes.' });
      candidates.push({ id: 'concise', label: 'Be short & concise', strategy: 'concise' });
      candidates.push({ id: 'expert', label: 'Assign Expert Role', tone: 'professional' });
    } else if (isAcademic) {
      candidates.push({ id: 'examples', label: 'Add concrete examples', directive: 'Include concrete, real-world examples and scholarly citations to substantiate all core claims.' });
      candidates.push({ id: 'step-by-step', label: 'Explain step by step', strategy: 'elaborate' });
      candidates.push({ id: 'structure', label: 'Specify academic structure', directive: 'Organize into: Abstract/Overview, Theoretical Background, Critical Evaluation, and Synthesis.' });
      candidates.push({ id: 'concise', label: 'Be short & concise', strategy: 'concise' });
    } else if (isBusiness) {
      candidates.push({ id: 'audience', label: 'Specify target audience', directive: 'Tailor all messaging and recommendations for executive stakeholders and decision-makers.' });
      candidates.push({ id: 'objectives', label: 'Add measurable KPIs', directive: 'Define explicit, measurable KPIs, success criteria, and delivery milestones.' });
      candidates.push({ id: 'action-plan', label: 'Request action plan', directive: 'Provide a prioritized, phased action plan with timelines, ownership, and resource requirements.' });
      candidates.push({ id: 'concise', label: 'Be short & concise', strategy: 'concise' });
    } else if (isCreative) {
      candidates.push({ id: 'narrative', label: 'Structure narrative arc', directive: 'Construct a clear dramatic arc: establishing context, inciting conflict, tension escalation, and resolution.' });
      candidates.push({ id: 'voice', label: 'Enrich tone & imagery', tone: 'creative' });
      candidates.push({ id: 'imagery', label: 'Add sensory details', directive: 'Ground abstract descriptions with evocative sensory imagery and showing rather than telling.' });
      candidates.push({ id: 'concise', label: 'Be short & concise', strategy: 'concise' });
    } else if (isAnalysis) {
      candidates.push({ id: 'step-by-step', label: 'Explain step by step', strategy: 'elaborate' });
      candidates.push({ id: 'format', label: 'Specify comparison table', directive: 'Present findings in a structured comparison matrix followed by bulleted tradeoffs and final recommendation.' });
      candidates.push({ id: 'concise', label: 'Be short & concise', strategy: 'concise' });
      candidates.push({ id: 'expert', label: 'Assign Expert Role', tone: 'professional' });
    } else {
      candidates.push({ id: 'concise', label: 'Be short & concise', strategy: 'concise' });
      candidates.push({ id: 'step-by-step', label: 'Explain step by step', strategy: 'elaborate' });
      candidates.push({ id: 'expert', label: 'Assign Expert Role', tone: 'professional' });
      candidates.push({ id: 'format', label: 'Specify output format', directive: 'Structure into numbered sections with bulleted takeaways and clean markdown headings.' });
    }

    return candidates.slice(0, 4);
  }

  function renderPreviewContent() {
    const previewElement = document.getElementById(IDS.PREVIEW);
    const diffToggleText = document.getElementById('promptpro-diff-toggle-text');
    if (!previewElement) return;

    if (STATE.isDiffView) {
      if (diffToggleText) diffToggleText.textContent = 'Back to editor';
      previewElement.setAttribute('contenteditable', 'false');

      const escapeHtml = (unsafe) => (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeOriginal = escapeHtml(STATE.originalText);
      const safeRewritten = escapeHtml(STATE.currentRewrite || '');

      if (safeOriginal.length > 0 && safeRewritten.includes(safeOriginal)) {
        const parts = safeRewritten.split(safeOriginal);
        previewElement.innerHTML = parts.map(p =>
          p ? `<span class="promptpro-preview__addition">${p}</span>` : ''
        ).join(`<span class="promptpro-preview__original">${safeOriginal}</span>`);
      } else {
        previewElement.innerHTML = `<span class="promptpro-preview__addition">${safeRewritten}</span>`;
      }
    } else {
      if (diffToggleText) diffToggleText.textContent = 'View changes';
      previewElement.setAttribute('contenteditable', 'true');
      previewElement.textContent = STATE.currentRewrite || '';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Popover Positioning (ChatGPT portal)
  // ═══════════════════════════════════════════════════════════

  let previewDebounceTimer = null;
  let previewRequestId = 0;
  let popoverPositionCleanup = null;

  function usePopoverPortal(adapter) {
    // Portal to body on all platforms to avoid overflow:hidden clipping
    return !!adapter;
  }

  function getPopoverAnchorRect() {
    const btn = document.getElementById(IDS.BTN);
    // ChatGPT-specific: prefer the trailing-actions container for stable anchor
    const trailing = document.querySelector('[data-testid="composer-trailing-actions"]');
    if (trailing) {
      const tr = trailing.getBoundingClientRect();
      if (tr.width > 4 && tr.height > 4) return tr;
    }
    if (btn) return btn.getBoundingClientRect();
    return null;
  }

  function positionPopoverFixed() {
    const pop = document.getElementById(IDS.POPOVER);
    if (!pop) return;
    const r = getPopoverAnchorRect();
    if (!r) return;
    const popW = Math.min(380, window.innerWidth - 16);
    let left = r.right - popW;
    left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));
    const gap = 12;
    let bottomOffset = window.innerHeight - r.top + gap;

    // Viewport guard: popover must remain fully visible within screen bounds
    const popHeight = pop.offsetHeight || 360;
    if (bottomOffset + popHeight > window.innerHeight - 16) {
      bottomOffset = Math.max(12, window.innerHeight - popHeight - 16);
    }
    if (bottomOffset < 12) {
      bottomOffset = 12;
    }

    pop.style.position = 'fixed';
    pop.style.left = `${left}px`;
    pop.style.right = 'auto';
    pop.style.bottom = `${bottomOffset}px`;
    pop.style.top = 'auto';
    pop.style.width = `${popW}px`;
    pop.style.maxWidth = `${popW}px`;
    pop.style.zIndex = '2147483647';
  }

  function applyPopoverStyles(pop) {
    if (!pop) return;
    pop.style.boxSizing = 'border-box';
    pop.style.display = 'flex';
    pop.style.flexDirection = 'column';
    pop.style.background = 'rgba(20, 20, 26, 0.85)';
    pop.style.backdropFilter = 'blur(28px) saturate(190%)';
    pop.style.webkitBackdropFilter = 'blur(28px) saturate(190%)';
    pop.style.border = '1px solid rgba(255, 255, 255, 0.14)';
    pop.style.borderRadius = '16px';
    pop.style.padding = '16px';
    pop.style.boxShadow = '0 24px 50px -10px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.15)';
    pop.style.color = '#e2e8f0';
    pop.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    pop.style.fontSize = '13px';
    pop.style.lineHeight = '1.5';
    pop.style.maxHeight = 'min(85vh, 560px)';
    pop.style.overflow = 'visible';
  }

  function attachPopoverPortal(adapter) {
    if (!usePopoverPortal(adapter)) return;
    const pop = document.getElementById(IDS.POPOVER);
    if (!pop) return;
    if (!pop.isConnected || pop.parentElement !== document.body) {
      document.body.appendChild(pop);
    }
    applyPopoverStyles(pop);
    pop.style.display = 'flex';
    pop.classList.add('promptpro-popover--portal');
    positionPopoverFixed();
    const onMove = () => positionPopoverFixed();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    popoverPositionCleanup = () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }

  function detachPopoverPortal() {
    if (popoverPositionCleanup) {
      popoverPositionCleanup();
      popoverPositionCleanup = null;
    }
    const pop = document.getElementById(IDS.POPOVER);
    if (pop) {
      pop.classList.remove('promptpro-popover--portal');
      pop.classList.remove('promptpro-popover--visible');
      pop.style.display = 'none';
      // Crucial: never re-append popover back into container / <form>
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UI Generation
  // ═══════════════════════════════════════════════════════════

  function createUIElements(adapter) {
    // 1. Anchor Button (Greyish Circular Outline Button with Monotone Sparkle SVG)
    const btn = document.createElement('button');
    btn.id = IDS.BTN;
    btn.type = 'button';
    btn.setAttribute(DATA_ATTR, DATA_VALUE);
    btn.setAttribute('aria-label', 'PromptPro: upgrade prompt');
    btn.title = 'PromptPro — upgrade prompt';
    btn.className = 'promptpro-btn';

    // Strict inline styles to guarantee the greyish circular outline button is NEVER stripped by host resets
    btn.style.width = '32px';
    btn.style.height = '32px';
    btn.style.minWidth = '32px';
    btn.style.minHeight = '32px';
    btn.style.maxWidth = '32px';
    btn.style.maxHeight = '32px';
    btn.style.borderRadius = '50%';
    btn.style.background = 'rgba(255, 255, 255, 0.08)';
    btn.style.border = '1px solid rgba(255, 255, 255, 0.22)';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.boxSizing = 'border-box';
    btn.style.padding = '0';
    btn.style.margin = '0 4px';
    btn.style.cursor = 'pointer';
    btn.style.backdropFilter = 'blur(12px)';
    btn.style.webkitBackdropFilter = 'blur(12px)';
    btn.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.25)';
    btn.style.color = '#e5e7eb';
    btn.style.transition = 'all 180ms ease';
    btn.style.outline = 'none';

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.16)';
      btn.style.borderColor = 'rgba(255, 255, 255, 0.38)';
      btn.style.color = '#ffffff';
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.35)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.08)';
      btn.style.borderColor = 'rgba(255, 255, 255, 0.22)';
      btn.style.color = '#e5e7eb';
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.25)';
    });

    btn.innerHTML = `<span class="promptpro-btn__icon" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;color:inherit;pointer-events:none;"><svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 4C16 13 21 16 28 16C21 16 16 19 16 28C16 19 11 16 4 16C11 16 16 13 16 4Z" fill="currentColor" /></svg></span><span class="promptpro-btn__spinner"></span>`;

    // 2. Popover
    const popover = document.createElement('div');
    popover.id = IDS.POPOVER;
    popover.className = 'promptpro-popover';
    applyPopoverStyles(popover);

    // ── A. Compact Header ──
    const header = document.createElement('div');
    header.className = 'promptpro-popover__header';
    header.innerHTML = `
      <div class="promptpro-popover__title">
        <svg width="15" height="15" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right:7px;vertical-align:middle;display:inline-block;flex-shrink:0;"><path d="M16 4C16 13 21 16 28 16C21 16 16 19 16 28C16 19 11 16 4 16C11 16 16 13 16 4Z" fill="currentColor"/></svg>
        <span>Rewrite Preview</span>
      </div>
      <div class="promptpro-header-right">
        <span id="promptpro-auto-detect-badge" style="display:none;align-items:center;gap:4px;font-size:10px;font-weight:600;letter-spacing:0.03em;padding:2px 7px;border-radius:20px;background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3);cursor:default;white-space:nowrap;"></span>
        <span class="promptpro-word-count" id="promptpro-word-count"></span>
        <div class="promptpro-score-container" id="promptpro-score-container">
          <div class="promptpro-score-deltas" id="promptpro-score-deltas"></div>
          <div class="promptpro-score-progress" id="${IDS.RINGS}" role="progressbar" aria-label="Prompt quality score">
            <div class="promptpro-score-progress__fill"></div>
          </div>
        </div>
      </div>
    `;

    // ── B. Improved Prompt Editor (Primary Focus) ──
    const preview = document.createElement('div');
    preview.id = IDS.PREVIEW;
    preview.className = 'promptpro-preview';
    preview.setAttribute('contenteditable', 'true');
    preview.setAttribute('role', 'textbox');
    preview.setAttribute('aria-multiline', 'true');
    preview.setAttribute('aria-label', 'Optimized prompt preview');
    preview.setAttribute('spellcheck', 'false');
    preview.textContent = 'Analyzing...';

    preview.addEventListener('input', () => {
      if (!STATE.isDiffView) {
        STATE.currentRewrite = preview.innerText;
        updateWordCountDisplay(STATE.originalText, STATE.currentRewrite);
      }
    });

    // ── C. Subtle Change Summary & Diff Toggle ──
    const changeSummary = document.createElement('div');
    changeSummary.className = 'promptpro-change-summary';
    changeSummary.id = 'promptpro-change-summary';
    changeSummary.innerHTML = `
      <div class="promptpro-change-summary__bar">
        <div class="promptpro-change-summary__left">
          <span class="promptpro-change-summary__title">What changed</span>
          <span class="promptpro-change-summary__badge" id="promptpro-change-summary-badge">Analyzed</span>
        </div>
        <button type="button" class="promptpro-diff-toggle-btn" id="promptpro-diff-toggle" title="Toggle detailed comparison">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
          </svg>
          <span id="promptpro-diff-toggle-text">View changes</span>
        </button>
      </div>
      <div class="promptpro-change-summary__text" id="promptpro-change-summary-text">
        Analyzing prompt improvements...
      </div>
    `;

    const diffToggleBtn = changeSummary.querySelector('#promptpro-diff-toggle');
    if (diffToggleBtn) {
      diffToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const previewElement = document.getElementById(IDS.PREVIEW);
        if (!STATE.isDiffView && previewElement) {
          STATE.currentRewrite = previewElement.innerText;
        }
        STATE.isDiffView = !STATE.isDiffView;
        renderPreviewContent();
      });
    }

    // ── D. Contextual Refinement Actions ──
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'promptpro-suggestions';
    suggestionsContainer.id = IDS.SUGGESTIONS;

    const handleStrategyToggle = (targetStrategy) => {
      const newStrategy = (STATE.activeStrategy === targetStrategy) ? 'enhance' : targetStrategy;
      STATE.activeStrategy = newStrategy;
      updateStrategyChipsUI(newStrategy);

      if (STATE.settings) {
        if (STATE.settings.siteMemory) {
          if (!STATE.settings.sites) STATE.settings.sites = {};
          if (!STATE.settings.sites[adapter.siteId]) STATE.settings.sites[adapter.siteId] = {};
          STATE.settings.sites[adapter.siteId].defaultStrategy = newStrategy;
        }
        STATE.settings.defaultStrategy = newStrategy;
        chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: STATE.settings });
      }

      scheduleRefreshPreview(adapter);
    };
    STATE.handleStrategyToggle = handleStrategyToggle;

    // ── E. Collapsible Style & Preferences ──
    const tonesList = [
      { id: 'none', label: 'Default' },
      { id: 'professional', label: 'Professional' },
      { id: 'casual', label: 'Casual' },
      { id: 'direct', label: 'Direct' },
      { id: 'technical', label: 'Technical' },
      { id: 'creative', label: 'Creative' },
      { id: 'academic', label: 'Academic' },
      { id: 'formal', label: 'Formal' },
      { id: 'humorous', label: 'Humorous' }
    ];

    // V3 FIX: Do NOT use a local closure variable for currentTone.
    // Always read STATE.activeTone at action-time to prevent the Academic-vs-Professional mismatch bug.
    // getActiveToneId() is a live getter that reflects the true canonical tone at any moment.
    const getActiveToneId = () => {
      const t = STATE.activeTone;
      return (!t || t === 'none') ? 'professional' : t;
    };

    const toneDropdown = document.createElement('div');
    toneDropdown.className = 'promptpro-dropdown';
    toneDropdown.id = 'promptpro-tone-dropdown';
    toneDropdown.style.position = 'relative';
    toneDropdown.style.width = '100%';

    const dropdownTrigger = document.createElement('div');
    dropdownTrigger.className = 'promptpro-dropdown__trigger';
    dropdownTrigger.setAttribute('role', 'button');
    dropdownTrigger.setAttribute('tabindex', '0');
    dropdownTrigger.style.display = 'flex';
    dropdownTrigger.style.alignItems = 'center';
    dropdownTrigger.style.justifyContent = 'space-between';
    dropdownTrigger.style.padding = '10px 14px';
    dropdownTrigger.style.background = '#1c1c1e';
    dropdownTrigger.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    dropdownTrigger.style.borderRadius = '10px';
    dropdownTrigger.style.cursor = 'pointer';
    dropdownTrigger.style.userSelect = 'none';
    dropdownTrigger.style.boxSizing = 'border-box';
    dropdownTrigger.style.transition = 'all 0.2s cubic-bezier(0.25, 0, 0.2, 1)';

    const activeToneObj = tonesList.find(t => t.id === getActiveToneId()) || tonesList[1];
    const dropdownValue = document.createElement('span');
    dropdownValue.className = 'promptpro-dropdown__value';
    dropdownValue.style.color = '#ffffff';
    dropdownValue.style.fontSize = '13px';
    dropdownValue.style.fontWeight = '500';
    dropdownValue.textContent = activeToneObj.label;

    const dropdownChevron = document.createElement('span');
    dropdownChevron.className = 'promptpro-dropdown__chevron';
    dropdownChevron.style.display = 'flex';
    dropdownChevron.style.alignItems = 'center';
    dropdownChevron.style.color = 'rgba(255, 255, 255, 0.5)';
    dropdownChevron.innerHTML = `<svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1L5 5L9 1"/></svg>`;

    dropdownTrigger.appendChild(dropdownValue);
    dropdownTrigger.appendChild(dropdownChevron);

    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'promptpro-dropdown__menu';
    dropdownMenu.style.position = 'absolute';
    dropdownMenu.style.top = 'calc(100% + 6px)';
    dropdownMenu.style.left = '0';
    dropdownMenu.style.right = '0';
    dropdownMenu.style.background = '#1c1c1e';
    dropdownMenu.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    dropdownMenu.style.borderRadius = '12px';
    dropdownMenu.style.maxHeight = '180px';
    dropdownMenu.style.overflowY = 'auto';
    dropdownMenu.style.display = 'none';
    dropdownMenu.style.zIndex = '2147483647';
    dropdownMenu.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.7)';
    dropdownMenu.style.padding = '6px';
    dropdownMenu.style.boxSizing = 'border-box';

    tonesList.forEach(t => {
      const item = document.createElement('div');
      // V3 FIX: Read getActiveToneId() at render time, not a stale closure
      item.className = 'promptpro-dropdown__item' + (t.id === getActiveToneId() ? ' promptpro-dropdown__item--active' : '');
      item.setAttribute('data-value', t.id);
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'space-between';
      item.style.padding = '8px 10px';
      item.style.borderRadius = '8px';
      item.style.cursor = 'pointer';
      item.style.fontSize = '12.5px';
      item.style.fontWeight = '500';
      item.style.color = t.id === getActiveToneId() ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
      item.style.transition = 'all 0.15s ease';

      item.innerHTML = `
        <span>${t.label}</span>
        <svg class="promptpro-dropdown__check" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:${t.id === getActiveToneId() ? 'block' : 'none'};color:#ffffff;"><polyline points="10 3 4.5 8.5 2 6"></polyline></svg>
      `;

      item.addEventListener('mouseenter', () => {
        item.style.background = 'rgba(255, 255, 255, 0.08)';
        item.style.color = '#ffffff';
      });
      item.addEventListener('mouseleave', () => {
        // V3 FIX: Read live STATE, not stale closure
        const isActive = t.id === getActiveToneId();
        item.style.background = isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent';
        item.style.color = isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
      });

      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // V3 FIX: Update STATE.activeTone (source of truth) — no stale closure write
        const nextTone = t.id === 'none' ? null : t.id;
        STATE.activeTone = nextTone;
        // Mark as explicit user selection so auto-detection won't override it
        STATE.toneIsExplicit = true;
        dropdownValue.textContent = t.label;
        const badge = document.getElementById('promptpro-current-tone-badge');
        if (badge) badge.textContent = t.label;
        toneDropdown.classList.remove('promptpro-dropdown--open');
        dropdownMenu.style.display = 'none';

        // Hide auto-detect badge when user explicitly picks a tone
        const autoDetectBadge = document.getElementById('promptpro-auto-detect-badge');
        if (autoDetectBadge) autoDetectBadge.style.display = 'none';

        dropdownMenu.querySelectorAll('.promptpro-dropdown__item').forEach(it => {
          const isMatch = it.getAttribute('data-value') === t.id;
          if (isMatch) {
            it.classList.add('promptpro-dropdown__item--active');
            it.style.color = '#ffffff';
            const check = it.querySelector('.promptpro-dropdown__check');
            if (check) check.style.display = 'block';
          } else {
            it.classList.remove('promptpro-dropdown__item--active');
            it.style.color = 'rgba(255, 255, 255, 0.7)';
            const check = it.querySelector('.promptpro-dropdown__check');
            if (check) check.style.display = 'none';
          }
        });

        if (STATE.settings && STATE.settings.siteMemory) {
          if (!STATE.settings.sites) STATE.settings.sites = {};
          if (!STATE.settings.sites[adapter.siteId]) STATE.settings.sites[adapter.siteId] = {};
          STATE.settings.sites[adapter.siteId].defaultTone = nextTone;
          chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: STATE.settings });
        }

        scheduleRefreshPreview(adapter);
      });

      dropdownMenu.appendChild(item);
    });

    dropdownTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = toneDropdown.classList.toggle('promptpro-dropdown--open');
      dropdownMenu.style.display = isOpen ? 'block' : 'none';
    });

    popover.addEventListener('click', (e) => {
      if (!toneDropdown.contains(e.target)) {
        toneDropdown.classList.remove('promptpro-dropdown--open');
        dropdownMenu.style.display = 'none';
      }
    });

    toneDropdown.appendChild(dropdownTrigger);
    toneDropdown.appendChild(dropdownMenu);

    const stylePrefs = document.createElement('div');
    stylePrefs.className = 'promptpro-style-prefs';
    stylePrefs.id = 'promptpro-style-prefs';

    const stylePrefsHeader = document.createElement('div');
    stylePrefsHeader.className = 'promptpro-style-prefs__header';
    stylePrefsHeader.setAttribute('role', 'button');
    stylePrefsHeader.setAttribute('tabindex', '0');
    stylePrefsHeader.innerHTML = `
      <div class="promptpro-style-prefs__title-group">
        <span class="promptpro-style-prefs__chevron">
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1.5L4 4.5L7 1.5"/></svg>
        </span>
        <span class="promptpro-section-title" style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#94a3b8;">Style & preferences</span>
      </div>
      <span class="promptpro-style-prefs__badge" id="promptpro-current-tone-badge">${activeToneObj.label}</span>
    `;

    const stylePrefsBody = document.createElement('div');
    stylePrefsBody.className = 'promptpro-style-prefs__body';
    stylePrefsBody.style.display = 'none';

    stylePrefsHeader.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = stylePrefs.classList.toggle('promptpro-style-prefs--open');
      stylePrefsBody.style.display = isOpen ? 'block' : 'none';
    });

    stylePrefsBody.appendChild(toneDropdown);
    stylePrefs.appendChild(stylePrefsHeader);
    stylePrefs.appendChild(stylePrefsBody);

    // ── F. Bottom Action Bar ──
    const actions = document.createElement('div');
    actions.className = 'promptpro-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'promptpro-action-btn promptpro-action-btn--cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.title = 'Cancel and keep original prompt';

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.id = IDS.APPLY;
    applyBtn.className = 'promptpro-action-btn promptpro-action-btn--apply';
    applyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Apply upgrade</span>';
    applyBtn.title = 'Apply Upgraded Prompt';

    actions.appendChild(cancelBtn);
    actions.appendChild(applyBtn);

    popover.appendChild(header);
    popover.appendChild(preview);
    popover.appendChild(changeSummary);
    popover.appendChild(suggestionsContainer);
    popover.appendChild(stylePrefs);
    popover.appendChild(actions);

    const container = document.createElement('div');
    container.className = 'promptpro-container';
    container.setAttribute(DATA_ATTR, 'container');
    container.appendChild(btn);

    // Keep popover attached directly to document.body (hidden), NOT inside container/<form>
    popover.style.display = 'none';
    if (document.body) {
      document.body.appendChild(popover);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (!popover.isConnected && document.body) document.body.appendChild(popover);
      });
    }

    // Button click → toggle popover
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePopover(adapter);
    });

    // Cancel → close popover without touching prompt or sending
    const handleCancel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.type === 'click') closePopover();
    };
    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(evt => {
      cancelBtn.addEventListener(evt, handleCancel);
    });

    // Apply → prevent host form submit on pointerdown/mousedown
    ['pointerdown', 'mousedown', 'mouseup'].forEach(evt => {
      applyBtn.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      });
    });

    // Apply → update prompt text in editor without auto-sending
    applyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const previewEl = document.getElementById(IDS.PREVIEW);
      if (previewEl && !STATE.isDiffView) {
        STATE.currentRewrite = previewEl.innerText;
      }
      if (STATE.currentRewrite) {
        const textToInject = STATE.currentRewrite;
        const variables = parsePromptVariables(textToInject);
        const delta = STATE.currentScore ? (STATE.currentScore.after.total - STATE.currentScore.before.total) : 0;
        const { tone: appliedTone, strategy: appliedStrategy } = resolveEffectiveStyle(adapter);

        const recordHistoryAndToast = (finalText) => {
          chrome.runtime.sendMessage({
            type: 'ADD_HISTORY',
            payload: { 
              text: finalText, 
              originalText: STATE.originalText,
              score: STATE.currentScore?.after?.total || 85,
              scoreBefore: STATE.currentScore?.before?.total || 50,
              site: adapter.siteId,
              strategy: appliedStrategy
            }
          });
          showToast(`Prompt upgraded! (+${delta > 0 ? delta : 0})`, 'success');

          // Phase 3: Wire preference memory learning loop
          if (appliedTone) {
            registerAction('tone_accept', appliedTone);
          }
          registerAction('strategy_accept', appliedStrategy);
        };

        if (variables.length > 0) {
          openVariablesModal("Upgraded Preview", textToInject, variables, (compiledText) => {
            adapter.setPromptText(compiledText);
            recordHistoryAndToast(compiledText);
            closePopover();
          });
        } else {
          adapter.setPromptText(textToInject);
          recordHistoryAndToast(textToInject);
          closePopover();
        }
      }
    });

    container.classList.add(`promptpro-container--${adapter.siteId}`);

    return container;
  }

  // ═══════════════════════════════════════════════════════════
  // Popover Flow State
  // ═══════════════════════════════════════════════════════════

  function togglePopover(adapter) {
    if (STATE.isOpen) {
      closePopover();
    } else {
      openPopover(adapter);
    }
  }

  function openPopover(adapter) {
    // Clear any inline autocomplete ghost text before reading the prompt.
    // Ghost text is a <span> injected inside the contenteditable by the autocomplete
    // engine. If it's present when we read the prompt, it may interfere with
    // innerText/textContent readings.
    const ghostEl = document.getElementById('promptpro-ghost-text');
    const ghostOverlay = document.getElementById('promptpro-ghost-overlay');
    if (ghostEl) ghostEl.remove();
    if (ghostOverlay) ghostOverlay.remove();

    // Re-read the input at action time directly from the live DOM.
    // Do NOT use any cached state — the DOM is the source of truth here.
    let input = adapter.getInputField();
    let text = getCurrentPrompt(input);

    // Second-chance detection: walk up from the button or send button to find the enclosing composer
    if (!text) {
      const btn = document.getElementById(IDS.BTN);
      const composer = findClosestComposer(btn) || findClosestComposer(adapter.getSendButton?.());
      if (composer) {
        const candidates = composer.querySelectorAll('#prompt-textarea, [contenteditable="true"], [contenteditable="plaintext-only"], div[role="textbox"], textarea');
        for (const candidate of candidates) {
          const candidateText = getCurrentPrompt(candidate);
          if (candidateText) {
            input = candidate;
            text = candidateText;
            break;
          }
        }
      }
    }

    // Third-chance detection: scan all editors in reverse order (bottom-up),
    // skipping sidebar elements, to locate any active editor holding text
    if (!text) {
      const allEditors = document.querySelectorAll('#prompt-textarea, [contenteditable="true"], [contenteditable="plaintext-only"], div[role="textbox"], textarea');
      for (let i = allEditors.length - 1; i >= 0; i--) {
        const candidate = allEditors[i];
        if (candidate.closest('aside, [data-testid*="sidebar"], nav')) continue;
        const candidateText = getCurrentPrompt(candidate);
        if (candidateText) {
          input = candidate;
          text = candidateText;
          break;
        }
      }
    }

    if (!text) {
      showToast('Type a prompt first before upgrading', 'error');
      return;
    }

    STATE.isOpen = true;
    STATE.isPreviewActive = true; // Fix 4: guard
    STATE.originalText = text;
    STATE.lastAdapter = adapter;
    STATE.toneIsExplicit = false; // V3: reset explicit flag on each open

    if (STATE.settings) {
      const currentTone = (STATE.settings.siteMemory && STATE.settings.sites?.[adapter.siteId]?.defaultTone !== undefined)
        ? STATE.settings.sites[adapter.siteId].defaultTone
        : STATE.settings.defaultTone;
      STATE.activeTone = currentTone || null;
      // If user has a persisted tone, mark as explicit so auto-detect won't override
      STATE.toneIsExplicit = !!STATE.activeTone;
      updateInlineToneUI(STATE.activeTone);

      const currentStrategy = (STATE.settings.siteMemory && STATE.settings.sites?.[adapter.siteId]?.defaultStrategy !== undefined)
        ? STATE.settings.sites[adapter.siteId].defaultStrategy
        : (STATE.settings.defaultStrategy || 'enhance');
      STATE.activeStrategy = currentStrategy;
      updateStrategyChipsUI(STATE.activeStrategy);
    }

    // Phase 2: Fire automatic style detection (non-blocking)
    // Only auto-apply if user has no explicit tone preference
    chrome.runtime.sendMessage({ type: 'DETECT_STYLE', payload: { text } }, (detection) => {
      if (chrome.runtime.lastError || !detection || !STATE.isOpen) return;
      if (detection.confidence >= 0.65 && detection.detectedStyle) {
        const autoDetectBadge = document.getElementById('promptpro-auto-detect-badge');
        if (!STATE.toneIsExplicit) {
          // Auto-apply: no explicit user preference set
          STATE.activeTone = detection.detectedStyle;
          updateInlineToneUI(STATE.activeTone);
          if (autoDetectBadge) {
            autoDetectBadge.textContent = `Auto: ${detection.detectedStyle}`;
            autoDetectBadge.style.display = 'inline-flex';
            autoDetectBadge.title = `Detected style: ${detection.detectedStyle} (${Math.round(detection.confidence * 100)}% confidence). Signals: ${(detection.signals || []).join(', ')}`;
          }
          scheduleRefreshPreview(adapter);
        } else {
          // Informational only — user has an explicit tone, show badge but don't override
          if (autoDetectBadge) {
            autoDetectBadge.textContent = `Detected: ${detection.detectedStyle}`;
            autoDetectBadge.style.display = 'inline-flex';
            autoDetectBadge.style.opacity = '0.6';
            autoDetectBadge.title = `Style detected as "${detection.detectedStyle}" but your explicit tone "${STATE.activeTone || 'default'}" is being used.`;
          }
        }
      }
    });

    const popover = document.getElementById(IDS.POPOVER);
    const btn = document.getElementById(IDS.BTN);
    if (popover) popover.classList.add('promptpro-popover--visible');
    if (btn) btn.classList.add('promptpro-btn--active-lock');

    attachPopoverPortal(adapter);
    requestAnimationFrame(() => positionPopoverFixed());

    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = null;
    previewRequestId++;
    refreshPreview(adapter);
  }

  function closePopover() {
    STATE.isOpen = false;
    STATE.isPreviewActive = false; // Fix 4: release guard
    detachPopoverPortal();
    const popover = document.getElementById(IDS.POPOVER);
    const btn = document.getElementById(IDS.BTN);
    if (popover) popover.classList.remove('promptpro-popover--visible');
    if (btn) btn.classList.remove('promptpro-btn--active-lock');
  }

  function scheduleRefreshPreview(adapter) {
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(() => {
      previewDebounceTimer = null;
      previewRequestId++;
      refreshPreview(adapter);
    }, PREVIEW_DEBOUNCE_MS);
  }

  async function refreshPreview(adapter) {
    const requestId = previewRequestId;

    const previewElement = document.getElementById(IDS.PREVIEW);
    const applyBtn = document.getElementById(IDS.APPLY);

    if (!previewElement || !applyBtn) return;

    previewElement.innerHTML = '<div class="promptpro-preview--loading">Analyzing and enhancing...</div>';
    applyBtn.disabled = true;

    try {
      // V3: Use resolveEffectiveStyle() as canonical source — fixes Academic-vs-Professional mismatch
      const { tone: finalToneText, strategy: finalStrategy } = resolveEffectiveStyle(adapter);
      let contextPayload = STATE.originalText;

      // Append active context blocks
      if (STATE.db && STATE.db.contextBlocks) {
        const activeBlocks = STATE.db.contextBlocks.filter(b => b.active);
        if (activeBlocks.length > 0) {
          const blocksText = activeBlocks.map(b => `[Context: ${b.title}]\n${b.content}`).join('\n\n');
          contextPayload = contextPayload.trim() + '\n\n' + blocksText;
        }
      }

      const result = await requestRewrite(contextPayload, adapter.siteId, finalStrategy, finalToneText);

      // Stale check
      if (requestId !== previewRequestId) return;

      if (result.error || !result.rewritten) {
        console.warn('[PromptPro] Optimization request returned error, applying resilient local synthesis fallback:', result.error || result.message);
        const localRewritten = synthesizeLocalUpgrade(contextPayload, finalStrategy, finalToneText, !!STATE.settings?.lowTokenEnabled, STATE.settings?.noFluff !== false);
        const bScore = scorePromptClient(STATE.originalText);
        const aScore = scorePromptClient(localRewritten);
        result = {
          rewritten: localRewritten,
          original: STATE.originalText,
          score: { before: bScore, after: aScore }
        };
      }
      applyBtn.disabled = false;

      STATE.currentRewrite = result.rewritten;
      STATE.currentScore = result.score;
      applyBtn.disabled = false;

      // Update header word count comparison
      updateWordCountDisplay(STATE.originalText, STATE.currentRewrite);

      // Derive truthful change summary (uses the same resolved tone/strategy)
      const { tone: resolvedTone, strategy: resolvedStrategy } = resolveEffectiveStyle(adapter);
      const changes = deriveChangeSummary(STATE.originalText, STATE.currentRewrite, resolvedStrategy, resolvedTone, {
        noFluff: STATE.settings?.noFluff !== false,
        lowTokenEnabled: !!STATE.settings?.lowTokenEnabled
      });
      const summaryTextEl = document.getElementById('promptpro-change-summary-text');
      if (summaryTextEl) {
        if (changes && changes.length > 0) {
          summaryTextEl.textContent = changes.join(' · ');
        } else {
          summaryTextEl.textContent = 'Refined phrasing for precision and clarity.';
        }
      }

      // Render main editable preview or diff view
      renderPreviewContent();

      // Render contextual refinement actions
      renderContextualRefinements(adapter);

      // Update score progress ring & deltas
      updateScoreViz(result.score);
      applyBtn.disabled = false;

      if (STATE.isOpen && usePopoverPortal(STATE.lastAdapter)) {
        requestAnimationFrame(() => positionPopoverFixed());
      }
    } catch (err) {
      if (requestId === previewRequestId && previewElement) {
        previewElement.textContent = 'Failed to generate preview.';
      }
    }
  }

  function updateScoreViz(scoreObj) {
    // ── Respect showScoreBadge setting ─────────────────────────────
    const scoreBadgeEnabled = !STATE.settings || STATE.settings.showScoreBadge !== false;
    const scoreContainer = document.querySelector('.promptpro-score-container');
    if (scoreContainer) {
      scoreContainer.style.display = scoreBadgeEnabled ? '' : 'none';
    }
    if (!scoreBadgeEnabled || !scoreObj || !scoreObj.before || !scoreObj.after) return;

    const before = scoreObj.before;
    const after = scoreObj.after;
    const delta = after.total - before.total;

    const deltaText = `${delta >= 0 ? '+' : ''}${delta}`;
    const deltasEl = document.getElementById('promptpro-score-deltas');
    if (deltasEl) {
      deltasEl.textContent = deltaText;
      deltasEl.title = `Quality score: ${before.total} → ${after.total} (${deltaText})`;
      if (delta > 0) {
        deltasEl.style.color = '#4ade80';
        deltasEl.style.background = 'rgba(74, 222, 128, 0.12)';
        deltasEl.style.borderColor = 'rgba(74, 222, 128, 0.25)';
      } else if (delta < 0) {
        deltasEl.style.color = '#f87171';
        deltasEl.style.background = 'rgba(248, 113, 113, 0.12)';
        deltasEl.style.borderColor = 'rgba(248, 113, 113, 0.25)';
      } else {
        deltasEl.style.color = '#94a3b8';
        deltasEl.style.background = 'rgba(255, 255, 255, 0.06)';
        deltasEl.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      }
    }

    const maxScore = Math.max(80, before.total, after.total);
    const percent = Math.max(0, Math.min(100, (after.total / maxScore) * 100));
    const progress = document.getElementById(IDS.RINGS);
    const fill = progress?.querySelector('.promptpro-score-progress__fill');
    if (progress && fill) {
      fill.style.width = `${percent}%`;
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', String(maxScore));
      progress.setAttribute('aria-valuenow', String(after.total));
      progress.title = `Quality score: ${after.total}/${maxScore}`;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Fix 2: Button Injection with Orphan Cleanup
  // ═══════════════════════════════════════════════════════════

  function isInjected() {
    const btn = document.getElementById(IDS.BTN);
    return btn && btn.isConnected;
  }

  /**
   * Remove orphaned PromptPro elements (duplicates, detached containers).
   */
  function cleanupOrphans() {
    const all = document.querySelectorAll(`[${DATA_ATTR}="${DATA_VALUE}"]`);
    if (all.length <= 1) return;
    // Keep the first connected one, remove the rest
    let kept = false;
    all.forEach(el => {
      const container = el.closest('.promptpro-container') || el;
      if (!kept && container.isConnected) {
        kept = true;
      } else {
        container.remove();
      }
    });
  }

  function injectUI(adapter) {
    // Clean orphans before checking
    cleanupOrphans();
    if (isInjected()) return;

    const container = createUIElements(adapter);
    let placed = false;

    // ── Primary path: use findInjectPoint() if defined (ChatGPT, Claude, Gemini) ──
    // Each adapter has deep platform knowledge; this is preferred over generic fallback.
    if (typeof adapter.findInjectPoint === 'function') {
      const point = adapter.findInjectPoint();
      if (point?.parent) {
        if (point.before) point.parent.insertBefore(container, point.before);
        else point.parent.appendChild(container);
        placed = true;
      }
    }

    // ── Generic fallback (Perplexity or unknown adapters) ──
    // Only reached if findInjectPoint() returned null or is not defined.
    if (!placed) {
      const sendButton = adapter.getSendButton();
      const toolbar = adapter.getToolbar();

      if (sendButton?.parentElement) {
        // Insert before send button — keeps PromptPro left of send, right of other controls
        sendButton.parentElement.insertBefore(container, sendButton);
        placed = true;
      } else if (toolbar) {
        toolbar.appendChild(container);
        placed = true;
      }
    }

    // Apply site-specific CSS class for styling
    if (placed) {
      if (adapter.siteId === 'chatgpt') container.classList.add('promptpro-container--chatgpt');
      if (adapter.siteId === 'claude')  container.classList.add('promptpro-container--claude');
      if (adapter.siteId === 'gemini')  container.classList.add('promptpro-container--gemini');
    }
  }

  function updateInlineToneUI(tone) {
    const displayTone = tone || 'professional';
    const tonesMap = {
      none: 'Default',
      professional: 'Professional',
      casual: 'Casual',
      direct: 'Direct',
      technical: 'Technical',
      creative: 'Creative',
      academic: 'Academic',
      formal: 'Formal',
      humorous: 'Humorous'
    };
    const capitalized = tonesMap[displayTone] || (displayTone.charAt(0).toUpperCase() + displayTone.slice(1));
    const valueDisplay = document.querySelector('.promptpro-dropdown__value');
    if (valueDisplay) {
      valueDisplay.textContent = capitalized;
    }
    const menu = document.querySelector('.promptpro-dropdown__menu');
    if (menu) {
      menu.querySelectorAll('.promptpro-dropdown__item').forEach(item => {
        const itemVal = item.getAttribute('data-value') || item.querySelector('span')?.textContent.toLowerCase();
        const isMatch = (itemVal === displayTone) || (displayTone === 'none' && itemVal === 'none');
        if (isMatch) {
          item.classList.add('promptpro-dropdown__item--active');
          item.style.color = '#ffffff';
          const check = item.querySelector('.promptpro-dropdown__check');
          if (check) check.style.display = 'block';
        } else {
          item.classList.remove('promptpro-dropdown__item--active');
          item.style.color = 'rgba(255, 255, 255, 0.7)';
          const check = item.querySelector('.promptpro-dropdown__check');
          if (check) check.style.display = 'none';
        }
      });
    }

    const container = document.getElementById(IDS.SUGGESTIONS);
    if (container) {
      const expertChip = container.querySelector('[data-chip="expert"]');
      if (expertChip) {
        if (displayTone === 'professional') {
          expertChip.classList.add('promptpro-suggestion-chip--active');
        } else {
          expertChip.classList.remove('promptpro-suggestion-chip--active');
        }
      }
    }
  }

  function updateStrategyChipsUI(strategy) {
    const activeStrat = strategy || 'enhance';
    const container = document.getElementById(IDS.SUGGESTIONS);
    if (!container) return;
    const conciseChip = container.querySelector('[data-chip="concise"]');
    const elaborateChip = container.querySelector('[data-chip="elaborate"]');
    if (conciseChip) {
      if (activeStrat === 'concise') {
        conciseChip.classList.add('promptpro-suggestion-chip--active');
      } else {
        conciseChip.classList.remove('promptpro-suggestion-chip--active');
      }
    }
    if (elaborateChip) {
      if (activeStrat === 'elaborate' || activeStrat === 'cot') {
        elaborateChip.classList.add('promptpro-suggestion-chip--active');
      } else {
        elaborateChip.classList.remove('promptpro-suggestion-chip--active');
      }
    }
  }

  function renderContextualRefinements(adapter) {
    const container = document.getElementById(IDS.SUGGESTIONS);
    if (!container) return;
    container.innerHTML = '';

    const candidates = getContextualRefinements(STATE.originalText);

    candidates.forEach(action => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'promptpro-suggestion-chip';
      const chipDataId = action.id === 'step-by-step' ? 'elaborate' : action.id;
      chip.setAttribute('data-chip', chipDataId);

      // Active state styling if matching active strategy or tone
      if (action.strategy && STATE.activeStrategy === action.strategy) {
        chip.classList.add('promptpro-suggestion-chip--active');
      } else if (action.id === 'expert' && STATE.activeTone === 'professional') {
        chip.classList.add('promptpro-suggestion-chip--active');
      }

      chip.innerHTML = `
        <svg class="promptpro-suggestion-chip__sparkle" width="10" height="10" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 4C16 13 21 16 28 16C21 16 16 19 16 28C16 19 11 16 4 16C11 16 16 13 16 4Z" fill="currentColor"/>
        </svg>
        <span>${action.label}</span>
      `;

      chip.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (STATE.isRefining) return; // Prevent duplicate requests while refining

        if (action.strategy) {
          if (typeof STATE.handleStrategyToggle === 'function') {
            STATE.handleStrategyToggle(action.strategy);
          }
          return;
        }

        if (action.tone) {
          const nextTone = (STATE.activeTone === action.tone) ? null : action.tone;
          STATE.activeTone = nextTone;
          updateInlineToneUI(nextTone);
          if (STATE.settings && STATE.settings.siteMemory) {
            if (!STATE.settings.sites) STATE.settings.sites = {};
            if (!STATE.settings.sites[adapter.siteId]) STATE.settings.sites[adapter.siteId] = {};
            STATE.settings.sites[adapter.siteId].defaultTone = nextTone;
            chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: STATE.settings });
          }
          scheduleRefreshPreview(adapter);
          return;
        }

        await executeRefinementDirective(adapter, action, chip);
      });

      container.appendChild(chip);
    });
  }

  async function executeRefinementDirective(adapter, action, chip) {
    if (STATE.isRefining) return;
    STATE.isRefining = true;

    const previewEl = document.getElementById(IDS.PREVIEW);
    const applyBtn = document.getElementById(IDS.APPLY);
    const summaryTextEl = document.getElementById('promptpro-change-summary-text');

    if (previewEl && !STATE.isDiffView) {
      STATE.currentRewrite = previewEl.innerText;
    }
    const currentText = (STATE.currentRewrite || STATE.originalText || '').trim();
    if (!currentText) {
      STATE.isRefining = false;
      return;
    }

    if (chip) chip.classList.add('promptpro-suggestion-chip--loading');
    if (applyBtn) applyBtn.disabled = true;
    if (previewEl) {
      previewEl.setAttribute('contenteditable', 'false');
    }
    if (summaryTextEl) {
      summaryTextEl.textContent = `Applying refinement: ${action.label}...`;
    }

    try {
      const refinementPrompt = `${currentText}\n\n[Refinement Directive: ${action.directive}]`;
      const finalToneText = STATE.activeTone;
      const finalStrategy = STATE.activeStrategy || 'enhance';

      let result = await requestRewrite(refinementPrompt, adapter.siteId, finalStrategy, finalToneText);

      if (result.error || !result.rewritten) {
        console.warn('[PromptPro] Refinement request returned error, applying local fallback:', result.error || result.message);
        let fallbackRewritten = currentText;
        if (action.directive) {
          if (fallbackRewritten.includes('**Quality Constraints:**')) {
            fallbackRewritten = fallbackRewritten.replace('**Quality Constraints:**', `**Quality Constraints:**\n• ${action.directive}`);
          } else {
            fallbackRewritten = `${fallbackRewritten}\n\n**Additional Requirement (${action.label}):**\n• ${action.directive}`;
          }
        }
        const bScore = scorePromptClient(STATE.originalText);
        const aScore = scorePromptClient(fallbackRewritten);
        result = {
          rewritten: fallbackRewritten,
          original: STATE.originalText,
          score: { before: bScore, after: aScore }
        };
      }

      STATE.currentRewrite = result.rewritten;
      if (result.score) STATE.currentScore = result.score;

      updateWordCountDisplay(STATE.originalText, STATE.currentRewrite);
      renderPreviewContent();
      if (result.score) updateScoreViz(result.score);

      if (summaryTextEl) {
        summaryTextEl.textContent = `Applied: ${action.label} · Refined output`;
      }
    } catch (err) {
      console.error('[PromptPro] Refinement failed:', err);
      if (summaryTextEl) {
        summaryTextEl.textContent = `Refinement failed. Original preview preserved.`;
      }
      showToast('Refinement failed. Preserving preview.', 'error');
    } finally {
      STATE.isRefining = false;
      if (chip) chip.classList.remove('promptpro-suggestion-chip--loading');
      if (applyBtn) applyBtn.disabled = false;
      if (previewEl && !STATE.isDiffView) {
        previewEl.setAttribute('contenteditable', 'true');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Fix 1: Observer Engine — Persistent, Never-Disconnect
  // ═══════════════════════════════════════════════════════════

  class ObserverManager {
    constructor(adapter) {
      this.adapter = adapter;
      this.debounceTimer = null;
      this.bodyObserver = null;
      this._rafId = null;
      this._onFocusIn = this._onFocusIn.bind(this);
    }

    start() {
      const adapter = this.adapter;

      // Load database
      chrome.runtime.sendMessage({ type: 'GET_DATABASE' }, (res) => {
        if (!chrome.runtime.lastError && res) STATE.db = res;
      });

      // Load settings
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
        if (!chrome.runtime.lastError && res) {
          STATE.settings = res;
          // Apply site memory if enabled, otherwise use defaultTone
          const siteTone = (res.siteMemory && res.sites?.[adapter.siteId]?.defaultTone !== undefined)
            ? res.sites[adapter.siteId].defaultTone
            : res.defaultTone;
          STATE.activeTone = siteTone || null;
          updateInlineToneUI(STATE.activeTone);

          const siteStrategy = (res.siteMemory && res.sites?.[adapter.siteId]?.defaultStrategy !== undefined)
            ? res.sites[adapter.siteId].defaultStrategy
            : (res.defaultStrategy || 'enhance');
          STATE.activeStrategy = siteStrategy || 'enhance';
          updateStrategyChipsUI(STATE.activeStrategy);
        }
      });

      // Listen to template injection requests from the extension popup
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'INJECT_TEMPLATE') {
          const { title, text } = message.payload || {};
          if (text) {
            const variables = parsePromptVariables(text);
            if (variables.length > 0) {
              openVariablesModal(title || "Template", text, variables, (compiledText) => {
                adapter.setPromptText(compiledText);
              });
            } else {
              adapter.setPromptText(text);
            }
            sendResponse({ success: true });
          }
          return true;
        }
      });

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        
        if (changes.promptDb) {
          const next = changes.promptDb.newValue;
          const prev = changes.promptDb.oldValue;
          if (next) {
            STATE.db = next;
            
            // If the inline preview is currently open, verify if active context blocks changed
            if (STATE.isOpen) {
              const getActiveBlocksHash = (db) => {
                if (!db || !db.contextBlocks) return '';
                return db.contextBlocks
                  .filter(b => b.active)
                  .map(b => `${b.id}:${b.title}:${b.content}`)
                  .join('\0');
              };

              if (getActiveBlocksHash(prev) !== getActiveBlocksHash(next)) {
                scheduleRefreshPreview(adapter);
              }
            }
          }
        }
        
        if (changes.settings) {
          const next = changes.settings.newValue;
          const prev = changes.settings.oldValue;
          if (next) {
            // Determine if any visual/semantic rewriting parameters changed
            const getSiteTone = (s) => (s?.siteMemory && s?.sites?.[adapter.siteId]?.defaultTone !== undefined)
              ? s.sites[adapter.siteId].defaultTone
              : s?.defaultTone;

            const getSiteStrategy = (s) => (s?.siteMemory && s?.sites?.[adapter.siteId]?.defaultStrategy !== undefined)
              ? s.sites[adapter.siteId].defaultStrategy
              : s?.defaultStrategy;

            const prevTone = getSiteTone(prev) || null;
            const nextTone = getSiteTone(next) || null;

            const prevStrategy = getSiteStrategy(prev) || 'enhance';
            const nextStrategy = getSiteStrategy(next) || 'enhance';

            const prevNoFluff = prev ? prev.noFluff !== false : true;
            const nextNoFluff = next.noFluff !== false;

            const prevLowToken = !!prev?.lowTokenEnabled;
            const nextLowToken = !!next.lowTokenEnabled;

            const parameterChanged = (prevTone !== nextTone) || 
                                     (prevStrategy !== nextStrategy) || 
                                     (prevNoFluff !== nextNoFluff) || 
                                     (prevLowToken !== nextLowToken);

            STATE.settings = next;
            STATE.activeTone = nextTone;
            STATE.activeStrategy = nextStrategy;
            updateInlineToneUI(STATE.activeTone);
            updateStrategyChipsUI(STATE.activeStrategy);
            if (STATE.currentScore) {
              updateScoreViz(STATE.currentScore);
            }

            // If the inline preview is currently open and any parameter changed, refresh the preview immediately!
            if (STATE.isOpen && parameterChanged) {
              scheduleRefreshPreview(adapter);
            }
          }
        }
      });

      // Fix 5: Register global listeners ONCE
      this._registerGlobalListeners();

      // Initial injection
      this._attemptInject();

      // ChatGPT, Claude & Gemini: extra retry with exponential backoff
      if (adapter.siteId === 'chatgpt' || adapter.siteId === 'claude' || adapter.siteId === 'gemini') {
        [150, 400, 900, 1800, 3500].forEach((ms) => {
          setTimeout(() => {
            if (!isInjected()) this._attemptInject();
          }, ms);
        });
      }

      // Fix 1: Start persistent body observer — NEVER disconnected
      this._startBodyObserver();

      // Fix 6: SPA navigation detection
      this._watchNavigation();

      // Focus backup
      document.addEventListener('focusin', this._onFocusIn);

      // Start instant autocomplete and quick-commands engine
      this._startAutocompleteEngine();
    }

    _startAutocompleteEngine() {
      const self = this;
      let activePredictSuffix = '';
      let slashMenu = null;
      let activeSlashIndex = 0;
      let isSlashOpen = false;
      let filteredSlashItems = [];

      // ── Focus detection (Shadow DOM safe) ──
      // document.activeElement can be the shadow host or a child of contenteditable.
      // Use containment check so this works for Gemini (shadow DOM), Claude (ProseMirror),
      // ChatGPT, and Perplexity (contenteditable divs).
      function isInputFocused(input) {
        if (!input) return false;
        const active = document.activeElement;
        if (!active) return false;
        // Direct match
        if (active === input) return true;
        // Child of contenteditable is focused (e.g. text node selected inside)
        if (input.contains(active)) return true;
        // Shadow DOM: activeElement is the host, input is inside its shadow
        if (active.shadowRoot && active.shadowRoot.contains(input)) return true;
        // Gemini: rich-textarea host → check if input is descendant of active's shadow
        try {
          const deepActive = active.shadowRoot?.activeElement;
          if (deepActive && (deepActive === input || input.contains(deepActive))) return true;
        } catch { /* cross-origin or no shadow */ }
        return false;
      }

      // ── Event target matching (handles bubbling from child nodes) ──
      function isInputEvent(input, target) {
        if (!input || !target) return false;
        return target === input || input.contains(target);
      }

      // Helper to clear existing inline prediction
      function clearGhostText() {
        // Inline contenteditable ghost
        const el = document.getElementById('promptpro-ghost-text');
        if (el) el.remove();
        // Textarea overlay ghost
        const overlay = document.getElementById('promptpro-ghost-overlay');
        if (overlay) overlay.remove();
        activePredictSuffix = '';
      }

      // Helper to query input content safely
      function getEditorText(input) {
        if (!input) return '';
        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') return input.value;
        // For contenteditable, strip ghost text from reading
        const ghost = input.querySelector('#promptpro-ghost-text');
        if (ghost) {
          const clone = input.cloneNode(true);
          const ghostClone = clone.querySelector('#promptpro-ghost-text');
          if (ghostClone) ghostClone.remove();
          return clone.innerText;
        }
        return input.innerText;
      }

      // Helper to fetch character position in editor
      function getCursorOffset(input) {
        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
          return input.selectionStart || 0;
        }
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return 0;
        try {
          const range = sel.getRangeAt(0);
          const preRange = range.cloneRange();
          preRange.selectNodeContents(input);
          preRange.setEnd(range.startContainer, range.startOffset);
          return preRange.toString().length;
        } catch {
          return 0;
        }
      }

      // ── Safe text insertion at cursor ──
      // Uses execCommand for contenteditable (preserves ProseMirror/Quill undo stack)
      // Uses native value setter for textarea
      function insertTextAtCursor(text) {
        const input = self.adapter.getInputField();
        if (!input) return;

        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
          const start = input.selectionStart || 0;
          const end = input.selectionEnd || 0;
          const val = input.value;
          // Use native setter to trigger React/framework controlled component updates
          const nativeSet = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
            || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          const newVal = val.substring(0, start) + text + val.substring(end);
          if (nativeSet) nativeSet.call(input, newVal);
          else input.value = newVal;
          input.selectionStart = input.selectionEnd = start + text.length;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }

        // ContentEditable: use execCommand for framework compat (ProseMirror, Quill, Slate)
        input.focus();
        try {
          const success = document.execCommand('insertText', false, text);
          if (success) return;
        } catch { /* execCommand not available */ }

        // Fallback: manual range insertion
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
        input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      }

      // ── Predictive Autocomplete Engine ──────────────────────────────
      //
      // ARCHITECTURE NOTE:
      // Autocomplete predicts a CONTINUATION of what the user is currently
      // typing. It does NOT show saved prompt titles or history items as
      // inline suggestions. Those remain accessible exclusively via the
      // '\' command menu.
      //
      // Two-stage approach:
      //  1. Debounced LLM call to /api/autocomplete (fast, non-credit-consuming)
      //  2. Local pattern-based continuation fallback when LLM is unavailable
      //
      // The prediction is NEVER automatically inserted into the composer.
      // User must press Tab or → to accept it.

      let _acLastText = '';
      let _acRequestId = 0;
      let _acDebounceTimer = null;
      let _acAbortController = null;

      /**
       * Local pattern-based continuation predictor.
       * Produces plausible suffixes based on common prompt patterns.
       * Returns null if no confident prediction is available.
       */
      function _localAutocompletePredict(text) {
        const trimmed = text.trim();
        const lower = trimmed.toLowerCase();

        // Only predict for short-to-medium incomplete phrases
        if (trimmed.length < 4 || trimmed.length > 200) return null;

        // Don't predict if text ends with sentence-terminating punctuation
        if (/[.?!\n]$/.test(trimmed)) return null;

        // Pattern-based suffix continuations (ordered by specificity)
        const patterns = [
          // Comparative / list prompts
          [/\bwrite (a|an) (short )?essay (about|on)\s*$/i, ' its history, key concepts, and real-world applications'],
          [/\bwrite (a|an) (blog|article) (post )?about\s*$/i, ' the benefits and practical tips for getting started'],
          [/\bwrite (a|an) (summary|overview) of\s*$/i, ' the main points, key arguments, and conclusions'],
          [/\bexplain( how| why| what| the)?\s*$/i, ' it works, including the key principles and practical examples'],
          [/\bcompare( and contrast)?\s*$/i, ' the similarities, differences, pros, and cons of each option'],
          [/\bcreate (a|an) (plan|roadmap|outline) (for|to)\s*$/i, ' achieving the goal step by step with clear milestones'],
          [/\blist (the )?(top |best |main |key )?\s*$/i, ' reasons, examples, and actionable insights'],
          [/\bsummarise|\bsummarize\s*$/i, ' the key points, conclusions, and main takeaways'],
          [/\banalyze|\banalyse\s*$/i, ' the strengths, weaknesses, opportunities, and threats'],
          [/\bdebug( the| this| my)?\s*$/i, ' code and explain what causes the issue and how to fix it'],
          [/\brefactor( the| this| my)?\s*$/i, ' code to improve readability, performance, and maintainability'],
          [/\bgenerate (a|an) (list of |set of )?\s*$/i, ' 10 unique and creative ideas with brief explanations'],
          [/\bhelp me (write|create|draft|build)\s*$/i, ' a clear and compelling piece that achieves the goal'],
          [/\btranslate (the |this |following )?\s*$/i, ' text to the target language while preserving meaning and tone'],
          [/\bacting as (a|an)\s*$/i, ' expert in this domain, provide detailed and accurate guidance'],
          [/\byou are (a|an) (senior |expert |professional )?\s*$/i, ' specialist — provide thorough, accurate, and practical advice'],
          // Covering / including patterns
          [/ covering\s*$/i, ' the key aspects, relevant context, and practical implications'],
          [/ including\s*$/i, ' the most important details, examples, and considerations'],
          [/ (about|regarding|on) the\s*$/i, ' topic in depth with supporting evidence and examples'],
        ];

        for (const [pattern, suffix] of patterns) {
          if (pattern.test(lower)) return suffix;
        }

        return null;
      }

      /**
       * Request an LLM-based continuation prediction.
       * Uses a lightweight /api/autocomplete endpoint that does NOT consume
       * optimization credits. Aborts stale in-flight requests.
       * Falls back to local predictor on error or timeout.
       */
      function _requestLLMAutocomplete(text, requestId, callback) {
        // Abort any in-flight request from a previous call
        if (_acAbortController) {
          try { _acAbortController.abort(); } catch { /* */ }
        }
        _acAbortController = new AbortController();

        const session = STATE.settings?._authToken || null;
        const apiBase = 'https://prompt-pro-liart.vercel.app';

        // Send via the background service worker to keep auth clean
        chrome.runtime.sendMessage(
          { type: 'AUTOCOMPLETE_PREDICT', payload: { text } },
          (res) => {
            if (chrome.runtime.lastError || !res) return;
            if (_acRequestId !== requestId) return; // stale
            if (res.completion && typeof res.completion === 'string' && res.completion.trim()) {
              callback(res.completion.trim());
            }
          }
        );
      }

      /**
       * Main autocomplete trigger.
       * Called on every input event. Debounced to avoid per-keystroke requests.
       * If settings.autocompleteEnabled is false, does nothing and clears ghost text.
       */
      function triggerAutocomplete(text) {
        // Check setting FIRST — if disabled, always clear and stop
        if (!STATE.settings || STATE.settings.autocompleteEnabled === false) {
          clearGhostText();
          return;
        }

        // Minimum length and no trailing newline (don't predict mid-submit)
        if (!text || text.trim().length < 5 || /\n$/.test(text)) {
          clearGhostText();
          return;
        }

        // If text hasn't changed materially, don't re-request
        if (text === _acLastText) return;
        _acLastText = text;

        const requestId = ++_acRequestId;

        // Clear any pending debounce
        clearTimeout(_acDebounceTimer);

        // 1. Try local pattern prediction immediately (no network cost)
        const localPrediction = _localAutocompletePredict(text);
        if (localPrediction) {
          // Show local prediction right away
          injectGhostText(localPrediction);
        }

        // 2. Schedule LLM prediction request (600ms debounce)
        _acDebounceTimer = setTimeout(() => {
          if (_acRequestId !== requestId) return; // superseded
          _requestLLMAutocomplete(text, requestId, (completion) => {
            if (_acRequestId !== requestId) return; // stale
            // Only update if we got something better than local
            if (completion && completion !== localPrediction) {
              clearGhostText();
              injectGhostText(completion);
            }
          });
        }, 600);
      }

      // ── Ghost text injection ──
      // ContentEditable: inserts an inline non-editable span at the cursor
      // Textarea: positions an absolute overlay span that mirrors the caret position
      function injectGhostText(text) {
        clearGhostText();
        if (!text) return;

        const input = self.adapter.getInputField();
        if (!input) return;

        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
          // Textarea ghost: overlay positioned after the caret
          const coords = getCaretCoordinates(input);
          if (!coords) return;

          const ghost = document.createElement('span');
          ghost.id = 'promptpro-ghost-overlay';
          ghost.className = 'promptpro-ghost-text promptpro-ghost-text--overlay';
          ghost.textContent = text;

          // Position relative to the textarea
          const rect = input.getBoundingClientRect();
          ghost.style.position = 'fixed';
          ghost.style.left = `${coords.left}px`;
          ghost.style.top = `${coords.top}px`;
          ghost.style.fontSize = getComputedStyle(input).fontSize;
          ghost.style.fontFamily = getComputedStyle(input).fontFamily;
          ghost.style.lineHeight = getComputedStyle(input).lineHeight;
          ghost.style.zIndex = '10000';
          ghost.style.pointerEvents = 'none';

          document.body.appendChild(ghost);
          activePredictSuffix = text;
          return;
        }

        // ContentEditable ghost: inline span at cursor
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        try {
          const range = sel.getRangeAt(0);
          const ghost = document.createElement('span');
          ghost.id = 'promptpro-ghost-text';
          ghost.className = 'promptpro-ghost-text';
          ghost.setAttribute('contenteditable', 'false');
          ghost.setAttribute(DATA_ATTR, 'ghost'); // Allow getCurrentPrompt to strip this
          ghost.textContent = text;

          range.insertNode(ghost);
          // Move cursor back before the ghost so it doesn't interfere with typing
          range.setStartBefore(ghost);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch { /* range insertion failed */ }
        activePredictSuffix = text;
      }

      // ── Textarea caret coordinate calculator ──
      // Creates a hidden mirror div to measure where the caret is visually
      function getCaretCoordinates(textarea) {
        try {
          const mirror = document.createElement('div');
          const style = getComputedStyle(textarea);
          const props = [
            'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
            'letterSpacing', 'wordSpacing', 'textIndent', 'textTransform',
            'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
            'boxSizing', 'whiteSpace', 'wordWrap', 'overflowWrap'
          ];

          mirror.style.position = 'absolute';
          mirror.style.top = '-9999px';
          mirror.style.left = '-9999px';
          mirror.style.visibility = 'hidden';
          mirror.style.overflow = 'hidden';
          mirror.style.width = `${textarea.clientWidth}px`;
          for (const prop of props) {
            mirror.style[prop] = style[prop];
          }

          const text = textarea.value.substring(0, textarea.selectionStart || 0);
          mirror.textContent = text;

          // Add a marker span to find the caret position
          const marker = document.createElement('span');
          marker.textContent = '|';
          mirror.appendChild(marker);

          document.body.appendChild(mirror);
          const markerRect = marker.getBoundingClientRect();
          const textareaRect = textarea.getBoundingClientRect();
          document.body.removeChild(mirror);

          return {
            left: textareaRect.left + (markerRect.left - mirror.getBoundingClientRect().left) - textarea.scrollLeft,
            top: textareaRect.top + (markerRect.top - mirror.getBoundingClientRect().top) - textarea.scrollTop
          };
        } catch {
          return null;
        }
      }

      // ── Caret rect helper (works for both textarea and contenteditable) ──
      function getCaretRect(input) {
        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
          const coords = getCaretCoordinates(input);
          if (coords) return { left: coords.left, top: coords.top, height: parseFloat(getComputedStyle(input).lineHeight) || 20 };
          // Fallback: use input rect
          const r = input.getBoundingClientRect();
          return { left: r.left + 10, top: r.top, height: r.height };
        }

        // ContentEditable: use selection range
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          try {
            const range = sel.getRangeAt(0).cloneRange();
            range.collapse(true);
            const rect = range.getBoundingClientRect();
            if (rect.width > 0 || rect.height > 0) {
              return { left: rect.left, top: rect.top, height: rect.height };
            }
          } catch { /* */ }
        }

        // Fallback: use input rect
        const r = input.getBoundingClientRect();
        return { left: r.left + 10, top: r.top, height: r.height };
      }

      // Floating Quick-Commands Backslash Menu Builder
      // NOTE: PromptPro uses '\' (backslash) to avoid conflicting with the
      // native '/' command menus built into ChatGPT and Claude.
      function renderSlashMenu(left, top, query) {
        if (slashMenu) slashMenu.remove();

        slashMenu = document.createElement('div');
        slashMenu.id = 'promptpro-slash-menu';
        slashMenu.className = 'promptpro-slash-menu';
        document.body.appendChild(slashMenu);

        // ── Separate library items from context blocks ──
        // These are intentionally kept as distinct categories.
        // Saved Prompts: reusable prompt templates (insert full text)
        // Context Blocks: background information merged into upgrades
        const libraryItems = [];
        const contextItems = [];

        if (STATE.db) {
          if (STATE.db.library) {
            STATE.db.library.forEach(lib => {
              libraryItems.push({ type: 'library', title: lib.title, text: lib.text });
            });
          }
          if (STATE.db.contextBlocks) {
            STATE.db.contextBlocks.forEach(ctx => {
              contextItems.push({ type: 'context', title: ctx.title, text: ctx.content });
            });
          }
        }

        // Filter based on backslash query (e.g. \react)
        // query starts with '\', so we strip it to get the search string
        const cleanQuery = query.substring(1).toLowerCase().trim();
        const filteredLibrary = libraryItems.filter(i => i.title.toLowerCase().includes(cleanQuery));
        const filteredContext = contextItems.filter(i => i.title.toLowerCase().includes(cleanQuery));
        filteredSlashItems = [...filteredLibrary, ...filteredContext];

        if (filteredSlashItems.length === 0) {
          // Show empty state with hint about what \ can access
          const emptyEl = document.createElement('div');
          emptyEl.className = 'promptpro-slash-menu__empty';
          emptyEl.textContent = cleanQuery ? `No results for "${cleanQuery}"` : 'No saved items yet';
          slashMenu.appendChild(emptyEl);
        } else {
          activeSlashIndex = Math.min(activeSlashIndex, filteredSlashItems.length - 1);

          // Render Saved Prompts section
          if (filteredLibrary.length > 0) {
            const headerEl = document.createElement('div');
            headerEl.className = 'promptpro-slash-menu__category';
            // Document icon (monochrome)
            headerEl.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Saved Prompts`;
            slashMenu.appendChild(headerEl);

            filteredLibrary.forEach((item, localIdx) => {
              const globalIdx = localIdx;
              const el = document.createElement('div');
              el.className = `promptpro-slash-menu__item ${globalIdx === activeSlashIndex ? 'promptpro-slash-menu__item--active' : ''}`;
              el.dataset.slashIdx = String(globalIdx);
              const escapedTitle = item.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
              const previewText = (item.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 60);
              el.innerHTML = `
                <div class="promptpro-slash-menu__item-main">
                  <span class="promptpro-slash-menu__item-title">${escapedTitle}</span>
                  <span class="promptpro-slash-menu__item-preview">${previewText}${item.text && item.text.length > 60 ? '…' : ''}</span>
                </div>
              `;
              el.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                commitSlashItem(item);
              });
              slashMenu.appendChild(el);
            });
          }

          // Render Context Blocks section
          if (filteredContext.length > 0) {
            const headerEl = document.createElement('div');
            headerEl.className = 'promptpro-slash-menu__category';
            // Layers icon (monochrome)
            headerEl.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> Context Blocks`;
            slashMenu.appendChild(headerEl);

            filteredContext.forEach((item, localIdx) => {
              const globalIdx = filteredLibrary.length + localIdx;
              const el = document.createElement('div');
              el.className = `promptpro-slash-menu__item promptpro-slash-menu__item--context ${globalIdx === activeSlashIndex ? 'promptpro-slash-menu__item--active' : ''}`;
              el.dataset.slashIdx = String(globalIdx);
              const escapedTitle = item.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
              const previewText = (item.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 60);
              el.innerHTML = `
                <div class="promptpro-slash-menu__item-main">
                  <span class="promptpro-slash-menu__item-title">${escapedTitle}</span>
                  <span class="promptpro-slash-menu__item-preview">${previewText}${item.text && item.text.length > 60 ? '…' : ''}</span>
                </div>
              `;
              el.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                commitSlashItem(item);
              });
              slashMenu.appendChild(el);
            });
          }
        }

        slashMenu.style.left = `${left}px`;
        slashMenu.style.top = `${top}px`;
        requestAnimationFrame(() => slashMenu.classList.add('promptpro-slash-menu--visible'));
        isSlashOpen = true;
      }

      function closeSlashMenu() {
        if (slashMenu) {
          slashMenu.remove();
          slashMenu = null;
        }
        isSlashOpen = false;
        activeSlashIndex = 0;
      }

      function commitSlashItem(item) {
        closeSlashMenu();
        
        const input = self.adapter.getInputField();
        if (!input) return;

        const itemText = item.text || '';
        const variables = parsePromptVariables(itemText);
        if (variables.length > 0) {
          openVariablesModal(item.title || 'Template', itemText, variables, (compiledText) => {
            const currentText = getEditorText(input);
            const cursor = getCursorOffset(input);
            // Find the backslash that triggered the menu
            const lastBackslash = currentText.substring(0, cursor).lastIndexOf('\\');
            if (lastBackslash !== -1) {
              replaceTextRange(input, lastBackslash, cursor, compiledText);
            } else {
              insertTextAtCursor(compiledText);
            }
          });
          return;
        }

        const currentText = getEditorText(input);
        const cursor = getCursorOffset(input);
        
        // Find the backslash trigger start index
        const lastBackslash = currentText.lastIndexOf('\\', cursor);
        // If no backslash found, append at cursor (handles edge cases)
        if (lastBackslash === -1) {
          insertTextAtCursor(itemText);
          return;
        }

        const beforeBackslash = currentText.substring(0, lastBackslash);
        const afterCursor = currentText.substring(cursor);
        const newText = beforeBackslash + itemText + afterCursor;
        const newCursorPos = lastBackslash + itemText.length;

        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
          const nativeSet = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
            || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          if (nativeSet) nativeSet.call(input, newText);
          else input.value = newText;
          input.selectionStart = input.selectionEnd = newCursorPos;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          // ContentEditable: replace entire content via execCommand (framework safe)
          input.focus();
          try {
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, newText);
          } catch {
            // Fallback: direct DOM
            input.textContent = newText;
            input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: newText }));
          }
          // Place cursor at correct position
          try {
            const sel = window.getSelection();
            if (sel) {
              const textNode = input.firstChild;
              if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                const pos = Math.min(newCursorPos, textNode.length);
                const range = document.createRange();
                range.setStart(textNode, pos);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          } catch { /* cursor placement failed */ }
        }
      }

      // ── Unified Keystroke Handler ──
      document.addEventListener('keydown', (e) => {
        const input = self.adapter.getInputField();
        if (!input || !isInputFocused(input)) return;

        // 1. Slash menu takes priority — intercept navigation keys
        if (isSlashOpen && filteredSlashItems.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeSlashIndex = (activeSlashIndex + 1) % filteredSlashItems.length;
            updateSlashMenuSelection();
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeSlashIndex = (activeSlashIndex - 1 + filteredSlashItems.length) % filteredSlashItems.length;
            updateSlashMenuSelection();
            return;
          }
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            commitSlashItem(filteredSlashItems[activeSlashIndex]);
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            closeSlashMenu();
            return;
          }
        }

        // 2. Tab accepts inline ghost text prediction
        //    Only intercept Tab when a visible suggestion exists AND cursor is at end.
        if (e.key === 'Tab' && activePredictSuffix && !e.shiftKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          const suffix = activePredictSuffix;
          clearGhostText();
          _acLastText = ''; // reset so next input re-evaluates
          insertTextAtCursor(suffix);
          return;
        }

        // 3. Right Arrow at end of text accepts inline ghost text prediction
        //    Only when cursor is at the very end of the input (not mid-text navigation).
        if (e.key === 'ArrowRight' && activePredictSuffix && !e.shiftKey && !e.ctrlKey && !e.altKey) {
          const textLen = getEditorText(input).length;
          const cursorPos = getCursorOffset(input);
          if (cursorPos >= textLen) {
            e.preventDefault();
            e.stopPropagation();
            const suffix = activePredictSuffix;
            clearGhostText();
            _acLastText = '';
            insertTextAtCursor(suffix);
            return;
          }
          // Cursor is mid-text — clear ghost and let arrow key move normally
          clearGhostText();
          return;
        }

        // 4. Escape dismisses ghost text and/or slash menu
        if (e.key === 'Escape') {
          if (activePredictSuffix) {
            e.preventDefault();
            clearGhostText();
          }
          closeSlashMenu();
        }

        // 5. Any other non-modifier key press: clear ghost text so typing stays clean
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          const skipKeys = ['Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape',
                           'Shift','Control','Alt','Meta','CapsLock','PageUp','PageDown',
                           'Home','End','Insert','F1','F2','F3','F4','F5','F6','F7','F8',
                           'F9','F10','F11','F12'];
          if (!skipKeys.includes(e.key) && activePredictSuffix) {
            clearGhostText();
          }
        }
      }, { capture: true });

      function updateSlashMenuSelection() {
        if (!slashMenu) return;
        const items = slashMenu.querySelectorAll('.promptpro-slash-menu__item');
        items.forEach((el, idx) => {
          if (idx === activeSlashIndex) {
            el.classList.add('promptpro-slash-menu__item--active');
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          } else {
            el.classList.remove('promptpro-slash-menu__item--active');
          }
        });
      }

      // ── Input change event: Recalculate Autocomplete & Backslash menu triggers ──
      document.addEventListener('input', (e) => {
        const input = self.adapter.getInputField();
        if (!input || !isInputEvent(input, e.target)) return;

        // Clean inline ghost text before processing so it isn't read as typed text
        clearGhostText();

        const currentText = getEditorText(input);
        const cursor = getCursorOffset(input);
        
        // 1. Detect '\' (backslash) trigger for the PromptPro command menu.
        //    Trigger only when:
        //     a) The last backslash in the text-before-cursor is at the beginning OR
        //        preceded by whitespace (not inside a URL or math expression)
        //     b) No space has been typed since the backslash (menu still filtering)
        //     c) This does NOT interfere with '/' (ChatGPT/Claude native menus)
        const prefix = currentText.substring(0, cursor);
        const lastBackslashIndex = prefix.lastIndexOf('\\');
        if (lastBackslashIndex !== -1 &&
            (lastBackslashIndex === 0 || /[\s]/.test(prefix[lastBackslashIndex - 1]))) {
          const backslashQueryStr = prefix.substring(lastBackslashIndex);
          if (!backslashQueryStr.includes(' ')) {
            // Retrieve caret coordinates (works for both textarea and contenteditable)
            const caretPos = getCaretRect(input);
            if (caretPos) {
              const left = caretPos.left;
              const top = caretPos.top - 188; // Render above cursor
              renderSlashMenu(left, top, backslashQueryStr);
              return;
            }
          }
        }
        
        // Hide backslash command menu if we type a space or delete the backslash
        closeSlashMenu();

        // 2. Predictive Autocomplete — debounced, LLM-backed with local fallback
        //    NOTE: This must NEVER use saved prompt titles or history items.
        //    It predicts continuations of what the user is currently writing.
        triggerAutocomplete(currentText);
      }, { capture: true });

      // Dismiss menu on click away
      document.addEventListener('click', (e) => {
        if (isSlashOpen && slashMenu && !slashMenu.contains(e.target)) {
          closeSlashMenu();
        }
      }, { capture: true });
    }

    /**
     * Fix 5: Global event listeners registered exactly once.
     * Handles: outside click to close popover, outside click to close tone dropdown,
     * and Enter key interception for Gemini submission guard.
     */
    _registerGlobalListeners() {
      if (STATE.listenersRegistered) return;
      STATE.listenersRegistered = true;

      // Outside click → close popover
      document.addEventListener('click', (e) => {
        if (!STATE.isOpen) return;
        const pop = document.getElementById(IDS.POPOVER);
        const container = document.getElementById(IDS.BTN)?.closest('.promptpro-container');
        const inPop = pop && pop.contains(e.target);
        const inContainer = container && container.contains(e.target);
        if (!inPop && !inContainer) {
          closePopover();
        }
      }, { capture: true });

      // Outside click → close tone dropdown
      document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.promptpro-dropdown--open');
        if (dropdown && !dropdown.contains(e.target)) {
          dropdown.classList.remove('promptpro-dropdown--open');
        }
      }, { capture: true });

      // Fix 4: Enter key interception while preview is active
      document.addEventListener('keydown', (e) => {
        if (!STATE.isPreviewActive) return;
        
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closePopover();
          return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
          // Block Enter from submitting on any platform while popover is open
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          const applyBtn = document.getElementById(IDS.APPLY);
          if (applyBtn && !applyBtn.disabled) {
            applyBtn.click();
          }
        }
      }, { capture: true });
    }

    _onFocusIn(e) {
      if (isInjected()) return;
      const t = e.target;
      if (t && (t.contentEditable === 'true' || t.tagName === 'TEXTAREA')) {
        setTimeout(() => this._attemptInject(), 80);
      }
    }

    /**
     * Fix 1: Persistent body observer.
     * NEVER disconnects. Checks if button is still connected on every mutation batch.
     * Debounced + RAF coalesced for performance.
     */
    _startBodyObserver() {
      if (this.bodyObserver) return; // already running

      let isScheduled = false;

      this.bodyObserver = new MutationObserver(() => {
        if (isScheduled) return;
        isScheduled = true;
        
        // Wait for DOM to settle
        setTimeout(() => {
          isScheduled = false;
          // Fast path: button exists AND is connected to DOM
          const btn = document.getElementById(IDS.BTN);
          if (btn && btn.isConnected) return;

          // Button gone — schedule reinject
          this._scheduleReinject();
        }, 300);
      });

      this.bodyObserver.observe(document.body, {
        childList: true,
        subtree: true
        // No attributes/characterData — only structural changes
      });
    }

    /**
     * Fix 6: SPA navigation detection.
     * Hooks pushState, replaceState, popstate to detect client-side navigation.
     */
    _watchNavigation() {
      const self = this;

      const onNavigate = () => {
        const newUrl = location.href;
        if (newUrl === STATE.lastUrl) return;
        STATE.lastUrl = newUrl;

        // Close popover if open
        if (STATE.isOpen) closePopover();

        // Invalidate element cache
        invalidateCache();

        // Remove old button and reinject after DOM settles
        setTimeout(() => {
          const oldContainer = document.querySelector('.promptpro-container');
          if (oldContainer) oldContainer.remove();
          self._attemptInject();
        }, NAV_SETTLE_MS);
      };

      // Hook pushState
      const origPush = history.pushState;
      history.pushState = function (...args) {
        origPush.apply(this, args);
        onNavigate();
      };

      // Hook replaceState
      const origReplace = history.replaceState;
      history.replaceState = function (...args) {
        origReplace.apply(this, args);
        onNavigate();
      };

      // Back/forward
      window.addEventListener('popstate', onNavigate);
    }

    _scheduleReinject() {
      if (isInjected()) return;
      clearTimeout(this.debounceTimer);
      if (this._rafId) cancelAnimationFrame(this._rafId);

      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this._rafId = requestAnimationFrame(() => {
          this._rafId = null;
          this._attemptInject();
        });
      }, INJECT_DEBOUNCE_MS);
    }

    _attemptInject() {
      if (isInjected()) return;
      try {
        injectUI(this.adapter);
        this.injectRetryCount = 0; // reset on success
      } catch (err) {
        // Injection failed — observer will retry on next DOM mutation
        this.injectRetryCount = (this.injectRetryCount || 0) + 1;
        if (this.injectRetryCount === 20) {
          chrome.runtime.sendMessage({ 
            type: 'TRACK_EVENT', 
            payload: { 
              eventName: 'input_detection_failed', 
              properties: { site: this.adapter.siteId, url: location.href } 
            } 
          });
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Template Variables Core Engine
  // ═══════════════════════════════════════════════════════════

  function parsePromptVariables(text) {
    if (!text || typeof text !== 'string') return [];
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      const raw = match[1];
      const parts = raw.split(':');
      const name = parts[0].trim();
      const defaultValue = parts.slice(1).join(':').trim();
      if (!variables.some(v => v.name === name)) {
        variables.push({
          placeholder: match[0],
          name: name,
          defaultValue: defaultValue
        });
      }
    }
    return variables;
  }

  function replaceTextRange(input, start, end, newText) {
    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
      const val = input.value;
      const nativeSet = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
        || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      const newVal = val.substring(0, start) + newText + val.substring(end);
      if (nativeSet) nativeSet.call(input, newVal);
      else input.value = newVal;
      input.selectionStart = input.selectionEnd = start + newText.length;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      input.focus();
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = document.createRange();
          let textNode = null;
          let charCount = 0;
          
          function findNodeAtOffset(node) {
            if (node.nodeType === Node.TEXT_NODE) {
              if (charCount <= start && start <= charCount + node.length) {
                range.setStart(node, start - charCount);
              }
              if (charCount <= end && end <= charCount + node.length) {
                range.setEnd(node, end - charCount);
                textNode = node;
                return true;
              }
              charCount += node.length;
            } else {
              for (const child of node.childNodes) {
                if (findNodeAtOffset(child)) return true;
              }
            }
            return false;
          }
          
          findNodeAtOffset(input);
          
          if (textNode) {
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('insertText', false, newText);
            return;
          }
        }
      } catch (e) {
        console.warn("[PromptPro] Range selection replace failed:", e);
      }
      const fullVal = input.innerText || input.textContent || '';
      const substituted = fullVal.substring(0, start) + newText + fullVal.substring(end);
      input.textContent = substituted;
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: substituted }));
    }
  }

  let activeVariablesModal = null;

  function openVariablesModal(title, templateText, variables, onComplete) {
    if (activeVariablesModal) activeVariablesModal.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'promptpro-vars-backdrop';
    
    const modal = document.createElement('div');
    modal.className = 'promptpro-vars-modal';

    const header = document.createElement('div');
    header.className = 'promptpro-vars-header';
    
    const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    header.innerHTML = `
      <div class="promptpro-vars-title">Customize Variables</div>
      <div class="promptpro-vars-subtitle">Template: <span class="promptpro-vars-subtitle-name">${escapeHtml(title)}</span></div>
    `;

    const body = document.createElement('div');
    body.className = 'promptpro-vars-body';

    const fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'promptpro-vars-fields';

    const inputsMap = new Map();

    variables.forEach(v => {
      const row = document.createElement('div');
      row.className = 'promptpro-var-row';

      const label = document.createElement('label');
      label.className = 'promptpro-var-label';
      label.textContent = v.name;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'promptpro-var-input';
      input.placeholder = v.defaultValue || `Enter ${v.name}...`;
      input.value = v.defaultValue || '';

      row.appendChild(label);
      row.appendChild(input);
      fieldsContainer.appendChild(row);

      inputsMap.set(v.placeholder, input);
    });

    const previewContainer = document.createElement('div');
    previewContainer.className = 'promptpro-vars-preview-container';
    previewContainer.innerHTML = `
      <div class="promptpro-vars-preview-title">Live Preview</div>
      <div class="promptpro-vars-preview-box" id="promptpro-vars-preview-box"></div>
    `;

    body.appendChild(fieldsContainer);
    body.appendChild(previewContainer);

    const footer = document.createElement('div');
    footer.className = 'promptpro-vars-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'promptpro-vars-footer-btn promptpro-vars-footer-btn--cancel';
    cancelBtn.textContent = 'Cancel';

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'promptpro-vars-footer-btn promptpro-vars-footer-btn--apply';
    applyBtn.textContent = 'Apply';

    footer.appendChild(cancelBtn);
    footer.appendChild(applyBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    activeVariablesModal = backdrop;

    const previewBox = modal.querySelector('#promptpro-vars-preview-box');
    
    function compilePrompt() {
      let compiled = templateText;
      variables.forEach(v => {
        const input = inputsMap.get(v.placeholder);
        const value = input.value.trim() || v.defaultValue || `[${v.name}]`;
        compiled = compiled.split(v.placeholder).join(value);
      });
      previewBox.textContent = compiled;
      return compiled;
    }

    compilePrompt();

    inputsMap.forEach(input => {
      input.addEventListener('input', compilePrompt);
    });

    requestAnimationFrame(() => {
      backdrop.classList.add('promptpro-vars-backdrop--visible');
      const firstInput = modal.querySelector('.promptpro-var-input');
      if (firstInput) firstInput.focus();
    });

    function closeVarsModal() {
      backdrop.classList.remove('promptpro-vars-backdrop--visible');
      backdrop.addEventListener('transitionend', () => {
        backdrop.remove();
        if (activeVariablesModal === backdrop) {
          activeVariablesModal = null;
        }
      });
    }

    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeVarsModal();
    });

    applyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const compiled = compilePrompt();
      closeVarsModal();
      onComplete(compiled);
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeVarsModal();
      }
    });

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeVarsModal();
      } else if (e.key === 'Enter' && e.target.classList.contains('promptpro-var-input')) {
        e.preventDefault();
        e.stopPropagation();
        const compiled = compilePrompt();
        closeVarsModal();
        onComplete(compiled);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Init
  // ═══════════════════════════════════════════════════════════

  function init() {
    ensureExtensionStyles();
    const adapter = resolveAdapter();
    if (!adapter) return;
    new ObserverManager(adapter).start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
