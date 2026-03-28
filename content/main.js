/**
 * PromptPro — Content Script (Phase 2: Apple UI & Popover Flow)
 * 
 * - Apple-style glassmorphic popover injection
 * - "Preview then Apply" interaction state flow
 * - Automatic background diffing/scoring
 * - Tone toggle live refreshing 
 * - Safe target injection on Apply
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════

  const STATE = {
    isOpen: false,
    originalText: '',
    currentRewrite: null,
    currentScore: null,
    activeTone: 'none',
    db: null // Pre-fetched <10ms access Library & History
  };

  // ═══════════════════════════════════════════════════════════
  // Shadow DOM Traverser
  // ═══════════════════════════════════════════════════════════

  function shadowQuery(root, selector) {
    try {
      const direct = root.querySelector?.(selector);
      if (direct) return direct;
    } catch { /* */ }
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
      input.setSelectionRange(text.length, text.length);
    }

    _setContentEditable(input, text) {
      input.focus();
      try {
        document.execCommand('selectAll', false, null);
        const success = document.execCommand('insertText', false, text);
        if (success) {
          const selection = window.getSelection();
          if (selection) selection.collapseToEnd();
          input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: text }));
          return;
        }
      } catch {}

      // Fallback
      input.innerHTML = '';
      const lines = text.split('\n');
      for (const line of lines) {
        const p = document.createElement('p');
        p.innerHTML = line.trim() === '' ? '<br>' : line;
        input.appendChild(p);
      }
      const selection = window.getSelection();
      if (selection && input.lastChild) {
        const range = document.createRange();
        range.selectNodeContents(input.lastChild);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }));
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
        input: ['#prompt-textarea', 'div[contenteditable="true"][data-placeholder]', 'textarea[data-id="root"]', 'form textarea'],
        toolbar: ['#prompt-textarea ~ div', 'form div[class*="flex"][class*="items-end"]', 'form > div > div:last-child', 'form div[class*="justify-between"]'],
        sendButton: ['button[data-testid="send-button"]', 'button[aria-label="Send prompt"]', 'button[aria-label="Send"]', 'form button[class*="bottom"]:last-of-type']
      };
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
        input: ['rich-textarea .ql-editor', 'div[contenteditable="true"][aria-label*="prompt"]'],
        toolbar: ['.input-area-container .trailing-actions', '.bottom-container div[class*="actions"]'],
        sendButton: ['button.send-button', 'button[aria-label="Send message"]', 'button[mattooltip="Send"]']
      };
    }
    getInputField() {
      const fromChain = this._query(this.selectors.input);
      if (fromChain) return fromChain;
      const richTextarea = document.querySelector('rich-textarea');
      if (richTextarea?.shadowRoot) {
        return richTextarea.shadowRoot.querySelector('.ql-editor') || richTextarea.shadowRoot.querySelector('[contenteditable="true"]');
      }
      return null;
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
  // UI Generation & Handling
  // ═══════════════════════════════════════════════════════════

  const IDS = {
    BTN: 'promptpro-upgrade-btn',
    POPOVER: 'promptpro-popover',
    PREVIEW: 'promptpro-preview',
    APPLY: 'promptpro-apply-btn',
    RINGS: 'promptpro-score-rings',
    SUGGESTIONS: 'promptpro-suggestions-box'
  };

  const INJECT_DEBOUNCE_MS = 120;
  const PREVIEW_DEBOUNCE_MS = 80;
  let previewDebounceTimer = null;
  let previewRequestId = 0;

  function createUIElements(adapter) {
    // 1. Anchor Button
    const btn = document.createElement('button');
    btn.id = IDS.BTN;
    btn.type = 'button';
    btn.setAttribute('data-promptpro', 'upgrade');
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

    document.addEventListener('click', (e) => {
      if (!toneDropdown.contains(e.target)) {
        toneDropdown.classList.remove('promptpro-dropdown--open');
      }
    }, { capture: true });

    toneSection.appendChild(toneTitle);
    toneSection.appendChild(toneDropdown);

    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = IDS.SUGGESTIONS;
    suggestionsContainer.className = 'promptpro-suggestions';
    // Will be populated by refreshPreview

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
    container.appendChild(btn);
    container.appendChild(popover);

    // Events
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePopover(adapter);
    });

    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopover();
    });

    applyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (STATE.currentRewrite) {
        adapter.setPromptText(STATE.currentRewrite);
        const delta = STATE.currentScore.after.total - STATE.currentScore.before.total;
        
        // Add to history async
        chrome.runtime.sendMessage({ 
          type: 'ADD_HISTORY', 
          payload: { text: STATE.currentRewrite, score: STATE.currentScore.after.total }
        });

        showToast(`Prompt upgraded! (+${delta > 0 ? delta : 0})`, 'success');
        closePopover();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (STATE.isOpen && !container.contains(e.target)) {
        closePopover();
      }
    }, { capture: true });

    return container;
  }

  // ── Popover Flow State ────────────────────────────────

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
    STATE.originalText = text;
    
    const popover = document.getElementById(IDS.POPOVER);
    const btn = document.getElementById(IDS.BTN);
    popover.classList.add('promptpro-popover--visible');
    btn.classList.add('promptpro-btn--active-lock');
    
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = null;
    previewRequestId++;
    refreshPreview(adapter);
  }

  function closePopover() {
    STATE.isOpen = false;
    const popover = document.getElementById(IDS.POPOVER);
    const btn = document.getElementById(IDS.BTN);
    if(popover) popover.classList.remove('promptpro-popover--visible');
    if(btn) btn.classList.remove('promptpro-btn--active-lock');
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
    const popover = document.getElementById(IDS.POPOVER);
    
    previewElement.innerHTML = '<div class="promptpro-preview--loading">Analyzing and enhancing...</div>';
    applyBtn.disabled = true;

    try {
      // Apply Tone and Context Blocks pre-processing inline
      let finalToneText = STATE.activeTone;
      let contextPayload = STATE.originalText;

      // Append active context blocks silently to the prompt being upgraded
      if (STATE.db && STATE.db.contextBlocks) {
        const activeBlocks = STATE.db.contextBlocks.filter(b => b.active);
        if (activeBlocks.length > 0) {
          const blocksText = activeBlocks.map(b => `[Context: ${b.title}]\n${b.content}`).join('\n\n');
          contextPayload = contextPayload.trim() + '\n\n' + blocksText;
        }
      }

      // Default to 'enhance' strategy for now inline.
      const result = await requestRewrite(contextPayload, adapter.siteId, 'enhance', finalToneText);
      
      if (requestId !== previewRequestId) return;

      if (result.error) {
        previewElement.innerHTML = `<span style="color:#f85149">Error: ${result.message}</span>`;
        return;
      }

      STATE.currentRewrite = result.rewritten;
      STATE.currentScore = result.score;

      // Smart Highlight Diff
      // To highlight additions without a huge diff library, we attempt to split or wrap the original text payload.
      // Since our rewriter often encapsulates the original text, we can do a simple string replacement.
      // We encode HTML entities to be safe.
      const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      
      let safeOriginal = escapeHtml(STATE.originalText);
      let safeRewritten = escapeHtml(result.rewritten);

      if (safeRewritten.includes(safeOriginal) && safeOriginal.length > 0) {
        // Highlighting trick: wrap everything, then unwrap the exact original string
        const parts = safeRewritten.split(safeOriginal);
        previewElement.innerHTML = parts.map(p => 
          p ? `<span class="promptpro-preview__addition">${p}</span>` : ''
        ).join(`<span class="promptpro-preview__original">${safeOriginal}</span>`);
      } else {
        // Fallback: just show all as addition if deeply modified
        previewElement.innerHTML = `<span class="promptpro-preview__addition">${safeRewritten}</span>`;
      }

      // Populate AI Smart Suggestions
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
              // RUA Loop: Register acceptance
              registerAction('suggestion_click', sug.id);
              
              // Append to original prompt context cleanly without modifying user's visible input box yet
              STATE.originalText = STATE.originalText.trim() + `\n\n[Requirement: ${sug.text}]`;
              
              // Remove the chip
              chip.remove();
              scheduleRefreshPreview(adapter);
            });
            suggestionsBox.appendChild(chip);
          });
        }
      }

      updateScoreViz(result.score);
      applyBtn.disabled = false;
      
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
    document.getElementById('promptpro-score-deltas').textContent = `${before.total} → ${after.total} (${deltaText})`;

    // Score engine currently trends around 0-80 (4 axes x 20); clamp defensively for future changes.
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
  // Observer & Injection Manager
  // ═══════════════════════════════════════════════════════════

  function isInjected() {
    return !!document.getElementById(IDS.BTN);
  }

  function injectUI(adapter) {
    if (isInjected()) return;

    const sendButton = adapter.getSendButton();
    const toolbar = adapter.getToolbar();

    const container = createUIElements(adapter);

    if (sendButton?.parentElement) {
      sendButton.parentElement.insertBefore(container, sendButton);
    } else if (toolbar) {
      toolbar.appendChild(container);
    }
  }

  class ObserverManager {
    constructor(adapter) {
      this.adapter = adapter;
      this.debounceTimer = null;
      this.bodyObserver = null;
      this.detachObserver = null;
      this._onFocusIn = this._onFocusIn.bind(this);
    }

    start() {
      chrome.runtime.sendMessage({ type: 'GET_DATABASE' }, (res) => {
        if (!chrome.runtime.lastError && res) STATE.db = res;
      });

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes.promptDb) return;
        const next = changes.promptDb.newValue;
        if (next) STATE.db = next;
      });

      document.addEventListener('focusin', this._onFocusIn);

      this._attemptInject();
      this._startBodyObserver();
    }

    _onFocusIn(e) {
      if (isInjected()) return;
      const t = e.target;
      if (t && (t.contentEditable === 'true' || t.tagName === 'TEXTAREA')) {
        setTimeout(() => this._attemptInject(), 80);
      }
    }

    _startBodyObserver() {
      if (this.bodyObserver) {
        this.bodyObserver.disconnect();
        this.bodyObserver = null;
      }

      this.bodyObserver = new MutationObserver(() => {
        if (isInjected()) {
          this._onInjectedStable();
          return;
        }
        this._scheduleReinject();
      });

      this.bodyObserver.observe(document.body, { childList: true, subtree: true });
    }

    _onInjectedStable() {
      if (this.bodyObserver) {
        this.bodyObserver.disconnect();
        this.bodyObserver = null;
      }
      const container = document.getElementById(IDS.BTN)?.closest('.promptpro-container');
      if (!container?.parentNode) return;
      this._attachDetachWatcher(container);
    }

    _attachDetachWatcher(container) {
      if (this.detachObserver) {
        this.detachObserver.disconnect();
        this.detachObserver = null;
      }
      const parent = container.parentNode;
      if (!parent) return;

      this.detachObserver = new MutationObserver(() => {
        if (!document.body.contains(container) || !isInjected()) {
          if (this.detachObserver) {
            this.detachObserver.disconnect();
            this.detachObserver = null;
          }
          this._startBodyObserver();
          this._scheduleReinject();
        }
      });

      this.detachObserver.observe(parent, { childList: true, subtree: true });
    }

    _scheduleReinject() {
      if (isInjected()) {
        this._onInjectedStable();
        return;
      }
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        requestAnimationFrame(() => this._attemptInject());
      }, INJECT_DEBOUNCE_MS);
    }

    _attemptInject() {
      if (isInjected()) {
        this._onInjectedStable();
        return;
      }
      injectUI(this.adapter);
      if (isInjected()) this._onInjectedStable();
    }
  }

  function init() {
    const adapter = resolveAdapter();
    if (!adapter) return;
    new ObserverManager(adapter).start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
