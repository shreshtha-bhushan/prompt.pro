/**
 * ⚠️  REFERENCE ONLY — This file is NOT loaded by the manifest.
 * The manifest loads content/main.js (a self-contained IIFE) which contains
 * its own inline copy of all adapters. Edits here have NO runtime effect.
 * Chrome MV3 content_scripts do not support ES module imports.
 *
 * BaseSiteAdapter — Abstract interface for site-specific DOM interaction.
 * 
 * Each AI chat site (ChatGPT, Claude, Gemini) has its own adapter that
 * extends this base. Selectors are ordered fallback chains — the first
 * match wins, providing resilience against frontend changes.
 */

import { shadowQuery } from '../dom/shadow-traverser.js';

export class BaseSiteAdapter {

  /**
   * @returns {string} Site identifier (e.g. 'chatgpt', 'claude', 'gemini')
   */
  get siteId() {
    throw new Error('BaseSiteAdapter.siteId must be overridden');
  }

  /**
   * Returns ordered selector chains for each critical DOM element.
   * @returns {{ input: string[], toolbar: string[], sendButton: string[] }}
   */
  get selectors() {
    throw new Error('BaseSiteAdapter.selectors must be overridden');
  }

  /**
   * Find the prompt input field.
   * @returns {Element|null}
   */
  getInputField() {
    return this._query(this.selectors.input);
  }

  /**
   * Find the toolbar / button container adjacent to the input.
   * @returns {Element|null}
   */
  getToolbar() {
    return this._query(this.selectors.toolbar);
  }

  /**
   * Find the send / submit button.
   * @returns {Element|null}
   */
  getSendButton() {
    return this._query(this.selectors.sendButton);
  }

  /**
   * Read the current prompt text from the input field.
   * Handles both <textarea> and contenteditable divs.
   * @returns {string}
   */
  getPromptText() {
    const input = this.getInputField();
    if (!input) return '';

    if (input.tagName === 'TEXTAREA') {
      return input.value;
    }

    // contenteditable — use innerText for whitespace-aware reading
    return input.innerText;
  }

  /**
   * Write text into the prompt input field.
   * Dispatches appropriate events so React/frameworks pick up the change.
   * @param {string} text
   */
  setPromptText(text) {
    const input = this.getInputField();
    if (!input) return;

    if (input.tagName === 'TEXTAREA') {
      // Use native setter to bypass React's synthetic event system
      const nativeSet = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      if (nativeSet) {
        nativeSet.call(input, text);
      } else {
        input.value = text;
      }

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // contenteditable div
      input.focus();
      input.innerText = text;
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText'
      }));
    }
  }

  /**
   * Resolve the first matching selector from a fallback chain.
   * Uses shadow-aware querying for Web Component support.
   * @param {string[]} selectorChain - Ordered list of CSS selectors
   * @returns {Element|null}
   * @protected
   */
  _query(selectorChain) {
    for (const sel of selectorChain) {
      const el = shadowQuery(document, sel);
      if (el) return el;
    }
    return null;
  }
}
