/**
 * PromptPro — Content Script (Phase 1)
 * 
 * Real-time prompt optimization with:
 * - Safe injection via execCommand + React event compat
 * - Debounce guard for rapid clicks
 * - Undo support (browser native undo stack)
 * - Toast notifications for edge cases
 * - Multi-dimensional score breakdown display
 * - Tone preset support in dropdown
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════

  let isUpgrading = false;        // Debounce guard for rapid clicks
  let lastUpgradeTime = 0;        // Timestamp of last upgrade
  const UPGRADE_COOLDOWN = 500;   // Minimum ms between upgrades

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

    /**
     * SAFE INJECTION — Write text into the input field.
     * 
     * Strategy:
     * 1. For contenteditable: Use execCommand('selectAll') + execCommand('insertText')
     *    - This registers in the browser undo stack (Ctrl+Z works)
     *    - Triggers React/ProseMirror change detection natively
     * 2. Fallback for textarea: Native value setter + synthetic events
     * 3. Cursor placed at end after injection
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

    /**
     * Textarea injection using native setter + React-compatible events.
     * @private
     */
    _setTextarea(input, text) {
      const nativeSet = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype, 'value'
      )?.set;

      if (nativeSet) {
        nativeSet.call(input, text);
      } else {
        input.value = text;
      }

      // Dispatch events React listens for
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Place cursor at end
      input.focus();
      input.setSelectionRange(text.length, text.length);
    }

    /**
     * ContentEditable injection using execCommand for undo support.
     * Falls back to direct DOM manipulation if execCommand fails.
     * @private
     */
    _setContentEditable(input, text) {
      input.focus();

      // Try execCommand path (supports undo stack)
      try {
        // Select all existing content
        document.execCommand('selectAll', false, null);

        // Insert new text (this replaces the selection)
        const success = document.execCommand('insertText', false, text);

        if (success) {
          // Place cursor at end
          const selection = window.getSelection();
          if (selection) {
            selection.collapseToEnd();
          }

          // Fire input event for frameworks that need it
          input.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            composed: true,
            inputType: 'insertText',
            data: text
          }));
          return;
        }
      } catch {
        // execCommand failed, use fallback
      }

      // FALLBACK: Direct DOM manipulation (no undo support)
      input.innerHTML = '';
      const lines = text.split('\n');
      for (const line of lines) {
        const p = document.createElement('p');
        if (line.trim() === '') {
          p.innerHTML = '<br>';
        } else {
          p.textContent = line;
        }
        input.appendChild(p);
      }

      // Place cursor at end
      const selection = window.getSelection();
      if (selection && input.lastChild) {
        const range = document.createRange();
        range.selectNodeContents(input.lastChild);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      // Fire events
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'insertText'
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
          '#prompt-textarea ~ div',
          'form div[class*="flex"][class*="items-end"]',
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
          'div[contenteditable="true"][aria-label*="prompt"]',
          '.text-input-field_textarea',
          'div[contenteditable="true"][role="textbox"]'
        ],
        toolbar: [
          '.input-area-container .trailing-actions',
          'div[class*="action-wrapper"]',
          '.input-area div:last-child',
          '.bottom-container div[class*="actions"]'
        ],
        sendButton: [
          'button.send-button',
          'button[aria-label="Send message"]',
          'button[mattooltip="Send"]',
          '.input-area button:last-of-type'
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
  }

  function resolveAdapter() {
    const host = location.hostname;
    if (host.includes('chatgpt.com') || host.includes('chat.openai.com'))
      return new ChatGPTAdapter();
    if (host.includes('claude.ai'))
      return new ClaudeAdapter();
    if (host.includes('gemini.google.com'))
      return new GeminiAdapter();
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // Toast Notifications
  // ═══════════════════════════════════════════════════════════

  function showToast(message, type = 'info') {
    // Remove existing toast
    document.getElementById('promptpro-toast')?.remove();

    const toast = document.createElement('div');
    toast.id = 'promptpro-toast';
    toast.className = `promptpro-toast promptpro-toast--${type}`;

    const icon = document.createElement('span');
    icon.className = 'promptpro-toast__icon';
    icon.textContent = type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';

    const text = document.createElement('span');
    text.className = 'promptpro-toast__text';
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('promptpro-toast--visible');
    });

    // Auto-hide after 3s
    setTimeout(() => {
      toast.classList.remove('promptpro-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════
  // Button Injector
  // ═══════════════════════════════════════════════════════════

  const BUTTON_ID = 'promptpro-upgrade-btn';
  const DROPDOWN_ID = 'promptpro-dropdown';

  function isInjected() {
    return !!document.getElementById(BUTTON_ID);
  }

  function setButtonLoading(loading) {
    const btn = document.getElementById(BUTTON_ID);
    if (!btn) return;
    if (loading) {
      btn.classList.add('promptpro-btn--loading');
      btn.setAttribute('disabled', 'true');
    } else {
      btn.classList.remove('promptpro-btn--loading');
      btn.removeAttribute('disabled');
    }
  }

  function createButton(onClick) {
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.className = 'promptpro-btn';
    btn.type = 'button';
    btn.setAttribute('data-promptpro', 'true');
    btn.title = 'Upgrade prompt with PromptPro';

    const icon = document.createElement('span');
    icon.className = 'promptpro-btn__icon';
    icon.textContent = '✨';

    const label = document.createElement('span');
    label.className = 'promptpro-btn__label';
    label.textContent = 'Upgrade';

    const spinner = document.createElement('span');
    spinner.className = 'promptpro-btn__spinner';

    btn.appendChild(icon);
    btn.appendChild(label);
    btn.appendChild(spinner);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  function createDropdown(onSelect) {
    const dropdown = document.createElement('div');
    dropdown.id = DROPDOWN_ID;
    dropdown.className = 'promptpro-dropdown';

    // Strategy section
    const stratHeader = document.createElement('div');
    stratHeader.className = 'promptpro-dropdown__header';
    stratHeader.textContent = 'Strategy';
    dropdown.appendChild(stratHeader);

    const strategies = [
      { id: 'enhance', label: '🚀 Enhance', desc: 'Add role, context & structure' },
      { id: 'elaborate', label: '📝 Elaborate', desc: 'Chain-of-thought reasoning' },
      { id: 'concise', label: '⚡ Concise', desc: 'Tighten & focus response' }
    ];

    for (const strat of strategies) {
      const item = document.createElement('button');
      item.className = 'promptpro-dropdown__item';
      item.type = 'button';
      item.setAttribute('data-strategy', strat.id);

      const itemLabel = document.createElement('span');
      itemLabel.className = 'promptpro-dropdown__item-label';
      itemLabel.textContent = strat.label;

      const itemDesc = document.createElement('span');
      itemDesc.className = 'promptpro-dropdown__item-desc';
      itemDesc.textContent = strat.desc;

      item.appendChild(itemLabel);
      item.appendChild(itemDesc);

      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.remove('promptpro-dropdown--visible');
        onSelect(strat.id, getSelectedTone());
      });

      dropdown.appendChild(item);
    }

    // Tone section
    const toneHeader = document.createElement('div');
    toneHeader.className = 'promptpro-dropdown__header';
    toneHeader.textContent = 'Tone (optional)';
    dropdown.appendChild(toneHeader);

    const toneRow = document.createElement('div');
    toneRow.className = 'promptpro-dropdown__tone-row';
    toneRow.id = 'promptpro-tone-row';

    const tones = [
      { id: 'none', label: 'None' },
      { id: 'professional', label: 'Pro' },
      { id: 'casual', label: 'Casual' },
      { id: 'academic', label: 'Academic' },
      { id: 'creative', label: 'Creative' },
      { id: 'technical', label: 'Tech' },
      { id: 'direct', label: 'Direct' }
    ];

    for (const tone of tones) {
      const pill = document.createElement('button');
      pill.className = `promptpro-tone-pill ${tone.id === 'none' ? 'promptpro-tone-pill--active' : ''}`;
      pill.type = 'button';
      pill.setAttribute('data-tone', tone.id);
      pill.textContent = tone.label;

      pill.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Toggle active state
        toneRow.querySelectorAll('.promptpro-tone-pill').forEach(p =>
          p.classList.remove('promptpro-tone-pill--active')
        );
        pill.classList.add('promptpro-tone-pill--active');
      });

      toneRow.appendChild(pill);
    }

    dropdown.appendChild(toneRow);

    return dropdown;
  }

  function getSelectedTone() {
    const active = document.querySelector('.promptpro-tone-pill--active');
    const tone = active?.getAttribute('data-tone');
    return tone === 'none' ? null : tone;
  }

  function showScoreBadge(score) {
    let badge = document.getElementById('promptpro-score-badge');
    if (!badge) return;

    const before = score.before;
    const after = score.after;
    const delta = after.total - before.total;
    const sign = delta > 0 ? '+' : '';

    // Build breakdown HTML using textContent only
    badge.innerHTML = '';

    const totalLine = document.createElement('div');
    totalLine.className = 'promptpro-score-badge__total';
    totalLine.textContent = `${before.total} → ${after.total} (${sign}${delta})`;

    const breakdown = document.createElement('div');
    breakdown.className = 'promptpro-score-badge__breakdown';

    const axes = [
      { key: 'clarity', label: 'Clar', emoji: '💡' },
      { key: 'specificity', label: 'Spec', emoji: '🎯' },
      { key: 'structure', label: 'Strc', emoji: '📐' },
      { key: 'intent', label: 'Intn', emoji: '🎪' }
    ];

    for (const axis of axes) {
      const axisEl = document.createElement('span');
      axisEl.className = 'promptpro-score-badge__axis';

      const diff = after[axis.key] - before[axis.key];
      const diffSign = diff > 0 ? '+' : '';
      axisEl.textContent = `${axis.emoji}${diffSign}${diff}`;
      axisEl.title = `${axis.label}: ${before[axis.key]} → ${after[axis.key]}`;

      breakdown.appendChild(axisEl);
    }

    badge.appendChild(totalLine);
    badge.appendChild(breakdown);

    badge.style.display = 'inline-flex';
    badge.className = `promptpro-score-badge ${delta > 0 ? 'promptpro-score-badge--improved' : ''}`;

    // Auto-hide after 6 seconds
    setTimeout(() => { badge.style.display = 'none'; }, 6000);
  }

  function injectButton(adapter, onUpgrade) {
    if (isInjected()) return;

    const sendButton = adapter.getSendButton();
    const toolbar = adapter.getToolbar();

    const btn = createButton(() => {
      const dd = document.getElementById(DROPDOWN_ID);
      if (dd) dd.classList.toggle('promptpro-dropdown--visible');
    });

    const dropdown = createDropdown((strategy, tone) => {
      onUpgrade(strategy, tone);
    });

    const badge = document.createElement('div');
    badge.id = 'promptpro-score-badge';
    badge.className = 'promptpro-score-badge';
    badge.style.display = 'none';

    const container = document.createElement('div');
    container.className = 'promptpro-container';
    container.appendChild(btn);
    container.appendChild(dropdown);
    container.appendChild(badge);

    if (sendButton?.parentElement) {
      sendButton.parentElement.insertBefore(container, sendButton);
    } else if (toolbar) {
      toolbar.appendChild(container);
    }

    document.addEventListener('click', (e) => {
      const dd = document.getElementById(DROPDOWN_ID);
      if (dd && !container.contains(e.target)) {
        dd.classList.remove('promptpro-dropdown--visible');
      }
    }, { capture: true });
  }

  // ═══════════════════════════════════════════════════════════
  // Prompt Bridge
  // ═══════════════════════════════════════════════════════════

  function upgradePrompt(text, siteId, strategy, tone) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'UPGRADE_PROMPT', payload: { text, siteId, strategy, tone } },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        }
      );
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Observer Manager
  // ═══════════════════════════════════════════════════════════

  class ObserverManager {
    constructor(adapter, onUpgrade) {
      this.adapter = adapter;
      this.onUpgrade = onUpgrade;
      this.observer = null;
      this.debounceTimer = null;
      this.isProcessing = false;
    }

    start() {
      this._reinject();

      this.observer = new MutationObserver(() => {
        if (isInjected()) return;
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          requestAnimationFrame(() => this._reinject());
        }, 200);
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      this._watchNavigation();

      document.addEventListener('focusin', (e) => {
        if (isInjected()) return;
        const t = e.target;
        if (t?.contentEditable === 'true' || t?.tagName === 'TEXTAREA') {
          setTimeout(() => this._reinject(), 100);
        }
      });
    }

    stop() {
      this.observer?.disconnect();
      clearTimeout(this.debounceTimer);
    }

    _reinject() {
      if (this.isProcessing || isInjected()) return;
      this.isProcessing = true;
      try {
        injectButton(this.adapter, this.onUpgrade);
      } catch (err) {
        console.warn('[PromptPro] Reinjection failed:', err.message);
      } finally {
        this.isProcessing = false;
      }
    }

    _watchNavigation() {
      const origPush = history.pushState;
      history.pushState = function (...args) {
        origPush.apply(this, args);
        window.dispatchEvent(new CustomEvent('promptpro:navigate'));
      };
      const origReplace = history.replaceState;
      history.replaceState = function (...args) {
        origReplace.apply(this, args);
        window.dispatchEvent(new CustomEvent('promptpro:navigate'));
      };
      window.addEventListener('popstate', () => {
        window.dispatchEvent(new CustomEvent('promptpro:navigate'));
      });
      window.addEventListener('promptpro:navigate', () => {
        setTimeout(() => {
          document.querySelector('.promptpro-container')?.remove();
          this._reinject();
        }, 500);
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Handle Upgrade Click (with edge case guards)
  // ═══════════════════════════════════════════════════════════

  async function handleUpgrade(adapter, strategy, tone) {
    // EDGE CASE: Rapid click guard
    const now = Date.now();
    if (isUpgrading || (now - lastUpgradeTime) < UPGRADE_COOLDOWN) {
      console.log('[PromptPro] Upgrade in progress or cooldown active, skipping');
      return;
    }

    const text = adapter.getPromptText();

    // EDGE CASE: Empty prompt
    if (!text || !text.trim()) {
      showToast('Type a prompt first before upgrading', 'error');
      return;
    }

    // Lock
    isUpgrading = true;
    lastUpgradeTime = now;
    setButtonLoading(true);

    try {
      const result = await upgradePrompt(text, adapter.siteId, strategy, tone);

      if (result.error) {
        if (result.error === 'EMPTY') {
          showToast(result.message || 'Please type a prompt first', 'error');
        } else {
          showToast(result.message || 'Failed to upgrade prompt', 'error');
        }
        return;
      }

      // Write rewritten prompt back to the input (safe injection)
      adapter.setPromptText(result.rewritten);

      // Show score badge with multi-dimensional breakdown
      if (result.score) {
        showScoreBadge(result.score);
      }

      // Success toast
      const delta = result.score.after.total - result.score.before.total;
      if (delta > 0) {
        showToast(`Prompt upgraded! Score: ${result.score.before.total} → ${result.score.after.total} (+${delta})`, 'success');
      }

      console.log(
        `[PromptPro] Upgraded (${strategy}${tone ? '/' + tone : ''}): ` +
        `${result.score.before.total} → ${result.score.after.total}`
      );
    } catch (err) {
      console.error('[PromptPro] Upgrade failed:', err);
      showToast('Upgrade failed — please try again', 'error');
    } finally {
      // Unlock after cooldown
      setButtonLoading(false);
      setTimeout(() => {
        isUpgrading = false;
      }, UPGRADE_COOLDOWN);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Main
  // ═══════════════════════════════════════════════════════════

  function init() {
    const adapter = resolveAdapter();
    if (!adapter) {
      console.log('[PromptPro] Unsupported site');
      return;
    }

    console.log(`[PromptPro] Initialized for ${adapter.siteId}`);

    const onUpgrade = (strategy, tone) => handleUpgrade(adapter, strategy, tone);

    const observer = new ObserverManager(adapter, onUpgrade);
    observer.start();

    window.addEventListener('beforeunload', () => observer.stop());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
