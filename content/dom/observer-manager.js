/**
 * ⚠️  REFERENCE ONLY — This file is NOT loaded by the manifest.
 * See content/main.js for the runtime implementation.
 *
 * MutationObserver Manager
 * 
 * Watches for DOM changes caused by React re-renders and SPA navigation.
 * Reinjection is debounced (200ms) + RAF-batched to avoid performance issues
 * during rapid DOM thrashing.
 */

import { BUTTON_ID, isInjected, injectButton } from './button-injector.js';

export class ObserverManager {
  /**
   * @param {import('../adapters/base-adapter.js').BaseSiteAdapter} adapter
   * @param {Function} onUpgrade - Passed through to button injector
   */
  constructor(adapter, onUpgrade) {
    this.adapter = adapter;
    this.onUpgrade = onUpgrade;
    this.observer = null;
    this.debounceTimer = null;
    this.isProcessing = false;
    this._boundNavigationHandler = null;
  }

  /**
   * Start observing DOM mutations on <body>.
   */
  start() {
    // Initial injection attempt
    this._reinject();

    this.observer = new MutationObserver((mutations) => {
      // FAST PATH: if button still exists, skip everything
      if (isInjected()) return;

      // Debounce rapid mutations (React re-renders can fire dozens)
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        requestAnimationFrame(() => this._reinject());
      }, 200);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
      // NOTE: no attributes/characterData — only structural changes matter
    });

    // SPA navigation detection
    this._watchNavigation();

    // Backup: focus event on document (handles cases where input is
    // dynamically created on focus, like Gemini)
    document.addEventListener('focusin', this._onFocusIn.bind(this));
  }

  /**
   * Stop all observation and cleanup timers.
   */
  stop() {
    this.observer?.disconnect();
    this.observer = null;
    clearTimeout(this.debounceTimer);
    document.removeEventListener('focusin', this._onFocusIn);
  }

  /**
   * Attempt to reinject the button.
   * @private
   */
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

  /**
   * Focus-based backup reinjection trigger.
   * @private
   */
  _onFocusIn(e) {
    if (isInjected()) return;

    // Only act if focus landed on something that looks like an input
    const target = e.target;
    if (
      target?.contentEditable === 'true' ||
      target?.tagName === 'TEXTAREA'
    ) {
      // Small delay to let the UI settle after focus
      setTimeout(() => this._reinject(), 100);
    }
  }

  /**
   * Hook pushState/replaceState and popstate for SPA navigation detection.
   * On navigation, teardown and reinitialize.
   * @private
   */
  _watchNavigation() {
    // Hook history.pushState
    const originalPush = history.pushState;
    history.pushState = function (...args) {
      originalPush.apply(this, args);
      window.dispatchEvent(new CustomEvent('promptpro:navigate'));
    };

    // Hook history.replaceState
    const originalReplace = history.replaceState;
    history.replaceState = function (...args) {
      originalReplace.apply(this, args);
      window.dispatchEvent(new CustomEvent('promptpro:navigate'));
    };

    // Listen for back/forward
    window.addEventListener('popstate', () => {
      window.dispatchEvent(new CustomEvent('promptpro:navigate'));
    });

    // Handle navigation events
    this._boundNavigationHandler = () => {
      // Delay to let the new SPA view render
      setTimeout(() => {
        // Remove old button if present
        const oldContainer = document.querySelector('.promptpro-container');
        oldContainer?.remove();

        // Reinject into the new view
        this._reinject();
      }, 500);
    };

    window.addEventListener('promptpro:navigate', this._boundNavigationHandler);
  }
}
