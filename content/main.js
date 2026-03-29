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
          'div[contenteditable="true"][aria-label*="prompt"]'
        ],
        toolbar: [
          '.input-area-container .trailing-actions',
          '.bottom-container div[class*="actions"]'
        ],
        sendButton: [
          'button.send-button',
          'button[aria-label="Send message"]',
          'button[mattooltip="Send"]'
        ]
      };
    }

    getInputField() {
      const fromChain = this._query(this.selectors.input);
      if (fromChain) return fromChain;
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

  function resolveAdapter() {
    const host = location.hostname;
    if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) return new ChatGPTAdapter();
    if (host.includes('claude.ai')) return new ClaudeAdapter();
    if (host.includes('gemini.google.com')) return new GeminiAdapter();
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
    return adapter && adapter.siteId === 'chatgpt';
  }

  function getChatgptPopoverAnchorRect() {
    const btn = document.getElementById(IDS.BTN);
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
    const r = getChatgptPopoverAnchorRect();
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
    btn.innerHTML = `<span class="promptpro-btn__icon" style="font-size: 15px; filter: grayscale(100%) brightness(200%);">✨</span><span class="promptpro-btn__spinner"></span>`;

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
    toneDropdown.innerHTML = `
      <div class="promptpro-dropdown__trigger">
        <span class="promptpro-dropdown__value">None</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      <div class="promptpro-dropdown__menu"></div>
    `;

    const menu = toneDropdown.querySelector('.promptpro-dropdown__menu');
    const valueDisplay = toneDropdown.querySelector('.promptpro-dropdown__value');
    const trigger = toneDropdown.querySelector('.promptpro-dropdown__trigger');

    const tones = ['none', 'professional', 'casual', 'academic', 'creative', 'technical', 'direct'];
    tones.forEach(t => {
      const item = document.createElement('div');
      item.className = `promptpro-dropdown__item ${t === 'none' ? 'promptpro-dropdown__item--active' : ''}`;
      item.innerHTML = `<span>${t.charAt(0).toUpperCase() + t.slice(1)}</span><svg class="promptpro-dropdown__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.querySelectorAll('.promptpro-dropdown__item').forEach(p => p.classList.remove('promptpro-dropdown__item--active'));
        item.classList.add('promptpro-dropdown__item--active');
        valueDisplay.textContent = item.querySelector('span').textContent;
        toneDropdown.classList.remove('promptpro-dropdown--open');

        STATE.activeTone = t === 'none' ? null : t;
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

    popover.appendChild(header);
    popover.appendChild(preview);
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
        adapter.setPromptText(STATE.currentRewrite);
        const delta = STATE.currentScore.after.total - STATE.currentScore.before.total;

        chrome.runtime.sendMessage({
          type: 'ADD_HISTORY',
          payload: { text: STATE.currentRewrite, score: STATE.currentScore.after.total }
        });

        showToast(`Prompt upgraded! (+${delta > 0 ? delta : 0})`, 'success');
        closePopover();
      }
    });

    if (adapter.siteId === 'chatgpt') {
      container.classList.add('promptpro-container--chatgpt');
    }

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

      const result = await requestRewrite(contextPayload, adapter.siteId, 'enhance', finalToneText);

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

    // ── ChatGPT: use findInjectPoint ──
    if (adapter.siteId === 'chatgpt' && typeof adapter.findInjectPoint === 'function') {
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

    // If placed, apply ChatGPT class
    if (placed && adapter.siteId === 'chatgpt') {
      container.classList.add('promptpro-container--chatgpt');
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
      // Load database
      chrome.runtime.sendMessage({ type: 'GET_DATABASE' }, (res) => {
        if (!chrome.runtime.lastError && res) STATE.db = res;
      });

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes.promptDb) return;
        const next = changes.promptDb.newValue;
        if (next) STATE.db = next;
      });

      // Fix 5: Register global listeners ONCE
      this._registerGlobalListeners();

      // Initial injection
      this._attemptInject();

      // ChatGPT: extra retry with exponential backoff
      if (this.adapter.siteId === 'chatgpt') {
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
