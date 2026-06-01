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
      if (!input) return '';
      return input.tagName === 'TEXTAREA' ? input.value : input.innerText;
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
          'div[contenteditable="true"][data-placeholder]',
          'textarea[data-id="root"]',
          'form textarea'
        ],
        toolbar: [
          '[data-testid="composer-trailing-actions"]',
          'form div[class*="flex"][class*="items-end"]',
          '#prompt-textarea ~ div',
          'form > div > div:last-child',
          'form div[class*="justify-between"]'
        ],
        sendButton: [
          'button[data-testid="send-button"]',
          'button[aria-label="Send prompt"]',
          'button[aria-label="Send"]',
          'form button[class*="bottom"]:last-of-type'
        ]
      };
    }

    /**
     * Fix 2: Heuristic injection point finding for ChatGPT.
     * Ordered strategy: trailing-actions → voice button → send button → form walk.
     */
    findInjectPoint() {
      const input = this.getInputField();
      if (!input) return null;
      const form = input.closest('form');
      const scope = form || document;

      // Strategy 1: Prepend to composer-trailing-actions (most stable)
      const trailing = scope.querySelector('[data-testid="composer-trailing-actions"]');
      if (trailing) {
        return { parent: trailing, before: trailing.firstChild };
      }

      // Strategy 2: Before voice/mic button
      const voice = scope.querySelector(
        'button[data-testid="composer-speech-button"],' +
        'button[data-testid="composer-mic-button"],' +
        'button[aria-label*="Voice" i],' +
        'button[aria-label*="Dictate" i]'
      ) || shadowQuery(document, 'button[data-testid="composer-speech-button"]');
      if (voice?.parentElement) {
        return { parent: voice.parentElement, before: voice };
      }

      // Strategy 3: Before send button
      const send = scope.querySelector('button[data-testid="send-button"]')
        || shadowQuery(document, 'button[data-testid="send-button"]');
      if (send?.parentElement) {
        return { parent: send.parentElement, before: send };
      }

      // Strategy 4: Composer footer
      const footer = scope.querySelector(
        '[data-testid="composer-footer"],footer[data-testid="composer-footer"]'
      );
      if (footer?.querySelector('button')) {
        const row = footer.querySelector('div.flex') || footer;
        const firstBtn = row.querySelector('button');
        if (firstBtn?.parentElement) {
          return { parent: firstBtn.parentElement, before: firstBtn };
        }
      }

      // Strategy 5: Walk up from input, find sibling with buttons
      let walk = input.parentElement;
      for (let i = 0; i < 8 && walk; i++) {
        const sib = walk.nextElementSibling;
        if (sib?.querySelector?.('button')) {
          const b = sib.querySelector('button');
          if (b?.parentElement) return { parent: b.parentElement, before: b };
        }
        walk = walk.parentElement;
      }

      return null;
    }
  }

  class ClaudeAdapter extends BaseSiteAdapter {
    get siteId() { return 'claude'; }
    get selectors() {
      return {
        input: [
          'div[contenteditable="true"].ProseMirror',
          'div[contenteditable="true"][data-placeholder]',
          'fieldset div[contenteditable="true"]',
          'div.is-editor-empty[contenteditable="true"]'
        ],
        toolbar: [
          'fieldset > div:last-child',
          'div[class*="flex"][class*="items-center"]:has(button[aria-label*="Send"])',
          'div[class*="flex"][class*="gap"]:has(button[type="submit"])',
          'div[class*="toolbar"]'
        ],
        sendButton: [
          'button[aria-label="Send Message"]',
          'button[aria-label="Send"]',
          'button[type="submit"]',
          'fieldset button:last-of-type'
        ]
      };
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
    const popW = Math.min(360, window.innerWidth - 16);
    let left = r.right - popW;
    left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));
    const gap = 12;
    const bottomOffset = window.innerHeight - r.top + gap;
    pop.style.position = 'fixed';
    pop.style.left = `${left}px`;
    pop.style.right = 'auto';
    pop.style.bottom = `${bottomOffset}px`;
    pop.style.top = 'auto';
    pop.style.width = `${popW}px`;
    pop.style.maxWidth = `${popW}px`;
    pop.style.zIndex = '2147483647';
  }

  function attachPopoverPortal(adapter) {
    if (!usePopoverPortal(adapter)) return;
    const pop = document.getElementById(IDS.POPOVER);
    if (!pop) return;
    document.body.appendChild(pop);
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
    const container = document.getElementById(IDS.BTN)?.closest('.promptpro-container');
    if (pop?.classList.contains('promptpro-popover--portal')) {
      pop.classList.remove('promptpro-popover--portal');
      pop.removeAttribute('style');
      if (container) container.appendChild(pop);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UI Generation
  // ═══════════════════════════════════════════════════════════

  function createUIElements(adapter) {
    // 1. Anchor Button
    const btn = document.createElement('button');
    btn.id = IDS.BTN;
    btn.type = 'button';
    btn.setAttribute(DATA_ATTR, DATA_VALUE);
    btn.setAttribute('aria-label', 'PromptPro: upgrade prompt');
    btn.title = 'PromptPro — upgrade prompt';
    btn.className = 'promptpro-btn';
    btn.innerHTML = `<span class="promptpro-btn__icon">✨</span><span class="promptpro-btn__spinner"></span>`;

    // 2. Popover
    const popover = document.createElement('div');
    popover.id = IDS.POPOVER;
    popover.className = 'promptpro-popover';

    const header = document.createElement('div');
    header.className = 'promptpro-popover__header';
    header.innerHTML = `
      <div class="promptpro-popover__title">Rewrite Preview</div>
      <div class="promptpro-score-container">
        <div class="promptpro-score-deltas" id="promptpro-score-deltas"></div>
        <div class="promptpro-score-progress" id="${IDS.RINGS}" role="progressbar" aria-label="Prompt quality score">
          <div class="promptpro-score-progress__fill"></div>
        </div>
      </div>
    `;

    const preview = document.createElement('div');
    preview.id = IDS.PREVIEW;
    preview.className = 'promptpro-preview';
    preview.textContent = 'Analyzing...';

    const toneSection = document.createElement('div');
    toneSection.className = 'promptpro-tone-section';
    const toneTitle = document.createElement('div');
    toneTitle.className = 'promptpro-section-title';
    toneTitle.textContent = 'Tone tweaks';

    const toneDropdown = document.createElement('div');
    toneDropdown.className = 'promptpro-dropdown';
    
    const initialTone = STATE.activeTone || 'none';
    const displayInitialTone = initialTone.charAt(0).toUpperCase() + initialTone.slice(1);
    
    toneDropdown.innerHTML = `
      <div class="promptpro-dropdown__trigger">
        <span class="promptpro-dropdown__value">${displayInitialTone}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      <div class="promptpro-dropdown__menu"></div>
    `;

    const menu = toneDropdown.querySelector('.promptpro-dropdown__menu');
    const valueDisplay = toneDropdown.querySelector('.promptpro-dropdown__value');
    const trigger = toneDropdown.querySelector('.promptpro-dropdown__trigger');

    const tones = ['none', 'professional', 'casual', 'academic', 'creative', 'technical', 'direct', 'humorous', 'formal'];
    tones.forEach(t => {
      const item = document.createElement('div');
      item.className = `promptpro-dropdown__item ${t === initialTone ? 'promptpro-dropdown__item--active' : ''}`;
      item.innerHTML = `<span>${t.charAt(0).toUpperCase() + t.slice(1)}</span><svg class="promptpro-dropdown__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.querySelectorAll('.promptpro-dropdown__item').forEach(p => p.classList.remove('promptpro-dropdown__item--active'));
        item.classList.add('promptpro-dropdown__item--active');
        valueDisplay.textContent = item.querySelector('span').textContent;
        toneDropdown.classList.remove('promptpro-dropdown--open');

        const nextTone = t === 'none' ? null : t;
        STATE.activeTone = nextTone;

        // If siteMemory is active, persist this setting per site
        if (STATE.settings && STATE.settings.siteMemory) {
          if (!STATE.settings.sites) STATE.settings.sites = {};
          if (!STATE.settings.sites[adapter.siteId]) STATE.settings.sites[adapter.siteId] = {};
          STATE.settings.sites[adapter.siteId].defaultTone = nextTone;
          chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: STATE.settings });
        }

        scheduleRefreshPreview(adapter);
      });
      menu.appendChild(item);
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toneDropdown.classList.toggle('promptpro-dropdown--open');
    });

    toneSection.appendChild(toneTitle);
    toneSection.appendChild(toneDropdown);

    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = IDS.SUGGESTIONS;
    suggestionsContainer.className = 'promptpro-suggestions';

    const actions = document.createElement('div');
    actions.className = 'promptpro-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'promptpro-action-btn promptpro-action-btn--cancel';
    cancelBtn.innerHTML = '✕';
    cancelBtn.title = 'Cancel';

    const applyBtn = document.createElement('button');
    applyBtn.id = IDS.APPLY;
    applyBtn.className = 'promptpro-action-btn promptpro-action-btn--apply';
    applyBtn.innerHTML = '✓';
    applyBtn.title = 'Apply';

    actions.appendChild(cancelBtn);
    actions.appendChild(applyBtn);

    // 3. Detailed diagnostics card (Click header score to toggle open/close)
    const diagnosticsCard = document.createElement('div');
    diagnosticsCard.id = 'promptpro-diagnostics-card';
    diagnosticsCard.className = 'promptpro-diagnostics-card';

    const toggleDiagnostics = (e) => {
      e.stopPropagation();
      diagnosticsCard.classList.toggle('promptpro-diagnostics-card--open');
      if (STATE.isOpen && usePopoverPortal(adapter)) {
        requestAnimationFrame(() => positionPopoverFixed());
      }
    };

    const progressRing = header.querySelector('#' + IDS.RINGS);
    const deltasText = header.querySelector('#promptpro-score-deltas');
    if (progressRing) {
      progressRing.style.cursor = 'pointer';
      progressRing.title = 'Click to show quality breakdown';
      progressRing.addEventListener('click', toggleDiagnostics);
    }
    if (deltasText) {
      deltasText.style.cursor = 'pointer';
      deltasText.title = 'Click to show quality breakdown';
      deltasText.addEventListener('click', toggleDiagnostics);
    }

    popover.appendChild(header);
    popover.appendChild(preview);
    popover.appendChild(diagnosticsCard);
    popover.appendChild(toneSection);
    popover.appendChild(suggestionsContainer);
    popover.appendChild(actions);

    const container = document.createElement('div');
    container.className = 'promptpro-container';
    container.setAttribute(DATA_ATTR, 'container');
    container.appendChild(btn);
    container.appendChild(popover);

    // Button click → toggle popover
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePopover(adapter);
    });

    // Cancel → close popover
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopover();
    });

    // Apply → inject text (with Gemini submission guard)
    applyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (STATE.currentRewrite) {
        const textToInject = STATE.currentRewrite;
        const variables = parsePromptVariables(textToInject);
        const delta = STATE.currentScore.after.total - STATE.currentScore.before.total;

        const recordHistoryAndToast = (finalText) => {
          chrome.runtime.sendMessage({
            type: 'ADD_HISTORY',
            payload: { text: finalText, score: STATE.currentScore.after.total }
          });
          showToast(`Prompt upgraded! (+${delta > 0 ? delta : 0})`, 'success');
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
    const text = adapter.getPromptText();
    if (!text || !text.trim()) {
      showToast('Type a prompt first before upgrading', 'error');
      return;
    }

    STATE.isOpen = true;
    STATE.isPreviewActive = true; // Fix 4: guard
    STATE.originalText = text;
    STATE.lastAdapter = adapter;

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
      let finalToneText = STATE.activeTone;
      let contextPayload = STATE.originalText;

      // Append active context blocks
      if (STATE.db && STATE.db.contextBlocks) {
        const activeBlocks = STATE.db.contextBlocks.filter(b => b.active);
        if (activeBlocks.length > 0) {
          const blocksText = activeBlocks.map(b => `[Context: ${b.title}]\n${b.content}`).join('\n\n');
          contextPayload = contextPayload.trim() + '\n\n' + blocksText;
        }
      }

      let finalStrategy = 'enhance';
      if (STATE.settings) {
        finalStrategy = (STATE.settings.siteMemory && STATE.settings.sites?.[adapter.siteId]?.defaultStrategy !== undefined)
          ? STATE.settings.sites[adapter.siteId].defaultStrategy
          : (STATE.settings.defaultStrategy || 'enhance');
      }

      const result = await requestRewrite(contextPayload, adapter.siteId, finalStrategy, finalToneText);

      // Stale check
      if (requestId !== previewRequestId) return;

      if (result.error) {
        previewElement.innerHTML = `<span style="color:#f85149">Error: ${result.message}</span>`;
        return;
      }

      STATE.currentRewrite = result.rewritten;
      STATE.currentScore = result.score;

      // Diff highlight
      const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      let safeOriginal = escapeHtml(STATE.originalText);
      let safeRewritten = escapeHtml(result.rewritten);

      if (safeRewritten.includes(safeOriginal) && safeOriginal.length > 0) {
        const parts = safeRewritten.split(safeOriginal);
        previewElement.innerHTML = parts.map(p =>
          p ? `<span class="promptpro-preview__addition">${p}</span>` : ''
        ).join(`<span class="promptpro-preview__original">${safeOriginal}</span>`);
      } else {
        previewElement.innerHTML = `<span class="promptpro-preview__addition">${safeRewritten}</span>`;
      }

      // Smart suggestions
      const suggestionsBox = document.getElementById(IDS.SUGGESTIONS);
      if (suggestionsBox) {
        suggestionsBox.innerHTML = '';
        if (result.suggestions && result.suggestions.length > 0) {
          result.suggestions.forEach(sug => {
            const chip = document.createElement('button');
            chip.className = 'promptpro-suggestion-chip';
            chip.textContent = sug.text;
            chip.title = `Apply ${sug.type} hint`;

            chip.addEventListener('click', (e) => {
              e.stopPropagation();
              registerAction('suggestion_click', sug.id);
              STATE.originalText = STATE.originalText.trim() + `\n\n[Requirement: ${sug.text}]`;
              chip.remove();
              scheduleRefreshPreview(adapter);
            });
            suggestionsBox.appendChild(chip);
          });
        }
      }

      // Render Detailed Diagnostics (AskWeave-style breakdown)
      const diagnosticsBox = document.getElementById('promptpro-diagnostics-card');
      if (diagnosticsBox) {
        diagnosticsBox.innerHTML = '';
        if (result.diagnostics) {
          const axes = ['Clarity', 'Specificity', 'Structure', 'Intent'];
          axes.forEach(axisName => {
            const list = result.diagnostics[axisName] || [];
            if (list.length > 0) {
              const axisDiv = document.createElement('div');
              axisDiv.className = 'promptpro-diagnostics-axis';
              
              const axisTitle = document.createElement('div');
              axisTitle.className = 'promptpro-diagnostics-axis-title';
              axisTitle.textContent = axisName;
              axisDiv.appendChild(axisTitle);
              
              const bulletsDiv = document.createElement('div');
              bulletsDiv.className = 'promptpro-diagnostics-bullets';
              
              list.forEach(bullet => {
                const bulletEl = document.createElement('div');
                bulletEl.className = `promptpro-diagnostic-bullet promptpro-diagnostic-bullet--${bullet.type}`;
                
                const iconSvg = bullet.type === 'success' 
                  ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                  : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
                
                bulletEl.innerHTML = `${iconSvg}<span>${bullet.message}</span>`;
                bulletsDiv.appendChild(bulletEl);
              });
              
              axisDiv.appendChild(bulletsDiv);
              diagnosticsBox.appendChild(axisDiv);
            }
          });
        }
      }

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
    const before = scoreObj.before;
    const after = scoreObj.after;
    const delta = after.total - before.total;

    const deltaText = `${delta >= 0 ? '+' : ''}${delta}`;
    const deltasEl = document.getElementById('promptpro-score-deltas');
    if (deltasEl) deltasEl.textContent = `${before.total} → ${after.total} (${deltaText})`;

    const maxScore = Math.max(80, before.total, after.total);
    const percent = Math.max(0, Math.min(100, (after.total / maxScore) * 100));
    const progress = document.getElementById(IDS.RINGS);
    const fill = progress?.querySelector('.promptpro-score-progress__fill');
    if (progress && fill) {
      fill.style.width = `${percent}%`;
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', String(maxScore));
      progress.setAttribute('aria-valuenow', String(after.total));
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

    // ── Custom Injection: use findInjectPoint if defined ──
    if (typeof adapter.findInjectPoint === 'function') {
      const point = adapter.findInjectPoint();
      if (point?.parent) {
        if (point.before) point.parent.insertBefore(container, point.before);
        else point.parent.appendChild(container);
        placed = true;
      }
    }

    // ── ChatGPT fallbacks ──
    if (!placed && adapter.siteId === 'chatgpt') {
      const trailing = document.querySelector('[data-testid="composer-trailing-actions"]');
      if (trailing) {
        trailing.insertBefore(container, trailing.firstChild);
        placed = true;
      } else {
        const voice = document.querySelector(
          'button[data-testid="composer-speech-button"],' +
          'button[data-testid="composer-mic-button"],' +
          'button[aria-label*="Voice" i],' +
          'button[aria-label*="Dictate" i]'
        );
        if (voice?.parentElement) {
          voice.parentElement.insertBefore(container, voice);
          placed = true;
        }
      }
    }

    // ── Generic: anchor to send button or toolbar ──
    if (!placed) {
      const sendButton = adapter.getSendButton();
      const toolbar = adapter.getToolbar();

      if (sendButton?.parentElement) {
        sendButton.parentElement.insertBefore(container, sendButton);
        placed = true;
      } else if (toolbar) {
        if (
          adapter.siteId === 'chatgpt' &&
          toolbar.getAttribute?.('data-testid') === 'composer-trailing-actions'
        ) {
          toolbar.insertBefore(container, toolbar.firstChild);
        } else {
          toolbar.appendChild(container);
        }
        placed = true;
      }
    }

    // If placed, apply site-specific class
    if (placed && adapter.siteId === 'chatgpt') {
      container.classList.add('promptpro-container--chatgpt');
    }
    if (placed && adapter.siteId === 'gemini') {
      container.classList.add('promptpro-container--gemini');
    }
  }

  function updateInlineToneUI(tone) {
    const displayTone = tone || 'none';
    const capitalized = displayTone.charAt(0).toUpperCase() + displayTone.slice(1);
    const valueDisplay = document.querySelector('.promptpro-dropdown__value');
    if (valueDisplay) {
      valueDisplay.textContent = capitalized;
    }
    const menu = document.querySelector('.promptpro-dropdown__menu');
    if (menu) {
      menu.querySelectorAll('.promptpro-dropdown__item').forEach(item => {
        const textVal = item.querySelector('span').textContent.toLowerCase();
        if (textVal === displayTone) {
          item.classList.add('promptpro-dropdown__item--active');
        } else {
          item.classList.remove('promptpro-dropdown__item--active');
        }
      });
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
            updateInlineToneUI(STATE.activeTone);

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

      // ChatGPT & Gemini: extra retry with exponential backoff
      if (adapter.siteId === 'chatgpt' || adapter.siteId === 'gemini') {
        [300, 800, 2000, 4000].forEach((ms) => {
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

      // Match engine for predictive autocomplete (History + Library)
      function findAutocompleteMatch(text) {
        if (!STATE.settings || STATE.settings.autocompleteEnabled === false) return null;
        if (!text || text.trim().length < 3) return null;

        const lowerText = text.toLowerCase().trim();

        // 1. Library matches
        if (STATE.db && STATE.db.library) {
          for (const item of STATE.db.library) {
            const itemText = (item.text || '').trim();
            if (itemText && itemText.toLowerCase().startsWith(lowerText) && itemText.length > text.length) {
              return itemText.substring(text.length);
            }
          }
        }

        // 2. History matches
        if (STATE.db && STATE.db.history) {
          for (const item of STATE.db.history) {
            const itemText = (item.text || '').trim();
            if (itemText && itemText.toLowerCase().startsWith(lowerText) && itemText.length > text.length) {
              return itemText.substring(text.length);
            }
          }
        }

        return null;
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

      // Floating Quick-Commands Slash Menu Builder
      function renderSlashMenu(left, top, query) {
        if (slashMenu) slashMenu.remove();

        slashMenu = document.createElement('div');
        slashMenu.id = 'promptpro-slash-menu';
        slashMenu.className = 'promptpro-slash-menu';
        document.body.appendChild(slashMenu);

        // Populate items
        const items = [];
        if (STATE.db) {
          if (STATE.db.library) {
            STATE.db.library.forEach(lib => {
              items.push({ type: 'library', icon: '📖', title: lib.title, text: lib.text });
            });
          }
          if (STATE.db.contextBlocks) {
            STATE.db.contextBlocks.forEach(ctx => {
              items.push({ type: 'context', icon: '🧱', title: ctx.title, text: ctx.content });
            });
          }
        }

        // Filter based on typing query (e.g. /react)
        const cleanQuery = query.toLowerCase().substring(1).trim();
        filteredSlashItems = items.filter(i => i.title.toLowerCase().includes(cleanQuery));

        if (filteredSlashItems.length === 0) {
          slashMenu.innerHTML = '<div class="promptpro-slash-menu__empty">No matches found</div>';
        } else {
          activeSlashIndex = Math.min(activeSlashIndex, filteredSlashItems.length - 1);
          filteredSlashItems.forEach((item, idx) => {
            const el = document.createElement('div');
            el.className = `promptpro-slash-menu__item ${idx === activeSlashIndex ? 'promptpro-slash-menu__item--active' : ''}`;
            el.innerHTML = `
              <span class="promptpro-slash-menu__item-icon">${item.icon}</span>
              <span class="promptpro-slash-menu__item-title">${item.title}</span>
            `;
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              commitSlashItem(item);
            });
            slashMenu.appendChild(el);
          });
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

        const variables = parsePromptVariables(item.text);
        if (variables.length > 0) {
          openVariablesModal(item.title || "Template", item.text, variables, (compiledText) => {
            const currentText = getEditorText(input);
            const cursor = getCursorOffset(input);
            const lastSlash = currentText.substring(0, cursor).lastIndexOf('/');
            if (lastSlash !== -1) {
              replaceTextRange(input, lastSlash, cursor, compiledText);
            } else {
              insertTextAtCursor(compiledText);
            }
          });
          return;
        }

        const currentText = getEditorText(input);
        const cursor = getCursorOffset(input);
        
        // Find slash trigger start index
        const lastSlash = currentText.lastIndexOf('/', cursor);
        if (lastSlash === -1) return;

        const beforeSlash = currentText.substring(0, lastSlash);
        const afterCursor = currentText.substring(cursor);
        const newText = beforeSlash + item.text + afterCursor;
        const newCursorPos = lastSlash + item.text.length;

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

        // 1. Intercept TAB to complete inline prediction
        if (e.key === 'Tab' && activePredictSuffix) {
          e.preventDefault();
          e.stopPropagation();
          const suffix = activePredictSuffix;
          clearGhostText();
          insertTextAtCursor(suffix);
          return;
        }

        // 2. Intercept Arrow keys / Enter / Escape inside Slash Commands Menu
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

        // Dismiss predictions on Escape or typing non-text keys
        if (e.key === 'Escape') {
          clearGhostText();
          closeSlashMenu();
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

      // ── Input change event: Recalculate Autocomplete & Slash triggers ──
      document.addEventListener('input', (e) => {
        const input = self.adapter.getInputField();
        if (!input || !isInputEvent(input, e.target)) return;

        // Clean inline ghost text before processing matching engine so it isn't read as typed
        clearGhostText();

        const currentText = getEditorText(input);
        const cursor = getCursorOffset(input);
        
        // 1. Recalculate Slash quick commands
        const prefix = currentText.substring(0, cursor);
        const lastSlashIndex = prefix.lastIndexOf('/');
        if (lastSlashIndex !== -1 && (lastSlashIndex === 0 || /\s/.test(prefix[lastSlashIndex - 1]))) {
          const slashQueryStr = prefix.substring(lastSlashIndex);
          if (!slashQueryStr.includes(' ')) {
            // Retrieve caret coordinates (works for both textarea and contenteditable)
            const caretPos = getCaretRect(input);
            if (caretPos) {
              const left = caretPos.left;
              const top = caretPos.top - 188; // Render above cursor
              renderSlashMenu(left, top, slashQueryStr);
              return;
            }
          }
        }
        
        // Hide slash command if we type space or delete slash
        closeSlashMenu();

        // 2. Recalculate Predictive Autocomplete Suffix
        const matchSuffix = findAutocompleteMatch(currentText);
        if (matchSuffix) {
          injectGhostText(matchSuffix);
        }
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
        if (e.key === 'Enter' && !e.shiftKey) {
          // Block Enter from submitting on any platform while popover is open
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
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

      this.bodyObserver = new MutationObserver(() => {
        // Fast path: button exists AND is connected to DOM
        const btn = document.getElementById(IDS.BTN);
        if (btn && btn.isConnected) return;

        // Button gone — schedule reinject
        this._scheduleReinject();
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
      } catch (err) {
        // Injection failed — observer will retry on next DOM mutation
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
    cancelBtn.className = 'promptpro-vars-footer-btn promptpro-vars-footer-btn--cancel';
    cancelBtn.textContent = 'Cancel';

    const applyBtn = document.createElement('button');
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
      e.stopPropagation();
      closeVarsModal();
    });

    applyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
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
    const adapter = resolveAdapter();
    if (!adapter) return;
    new ObserverManager(adapter).start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
