/**
 * Gemini Site Adapter
 * Handles DOM interaction for gemini.google.com
 * 
 * Gemini uses Web Components with Shadow DOM:
 * - Custom <rich-textarea> element with Quill editor inside shadow root
 * - Material Design components for toolbar
 * - Heavy use of Shadow DOM requiring recursive traversal
 */

import { BaseSiteAdapter } from './base-adapter.js';
import { shadowQuery } from '../dom/shadow-traverser.js';

export class GeminiAdapter extends BaseSiteAdapter {

  get siteId() {
    return 'gemini';
  }

  get selectors() {
    return {
      input: [
        'rich-textarea .ql-editor',                           // Quill editor inside custom element
        'div[contenteditable="true"][aria-label*="prompt"]',   // Accessible contenteditable
        '.text-input-field_textarea',                          // Class-based selector
        'div[contenteditable="true"][role="textbox"]'          // Role-based fallback
      ],
      toolbar: [
        '.input-area-container .trailing-actions',             // Trailing actions container
        'div[class*="action-wrapper"]',                        // Action wrapper
        '.input-area div:last-child',                          // Positional
        '.bottom-container div[class*="actions"]'              // Bottom actions
      ],
      sendButton: [
        'button.send-button',                                  // Direct class
        'button[aria-label="Send message"]',                   // Accessible label
        'button[mattooltip="Send"]',                           // Material tooltip
        '.input-area button:last-of-type'                      // Structural fallback
      ]
    };
  }

  /**
   * Gemini's input is inside a shadow root within <rich-textarea>.
   * We need to pierce the shadow DOM to find the actual editor,
   * then use its API or direct manipulation.
   */
  getInputField() {
    // First try the selector chain (shadowQuery handles shadow roots)
    const fromChain = this._query(this.selectors.input);
    if (fromChain) return fromChain;

    // Fallback: manually find rich-textarea and traverse its shadow
    const richTextarea = document.querySelector('rich-textarea');
    if (richTextarea?.shadowRoot) {
      const editor = richTextarea.shadowRoot.querySelector('.ql-editor')
        || richTextarea.shadowRoot.querySelector('[contenteditable="true"]');
      if (editor) return editor;
    }

    return null;
  }

  /**
   * Gemini's Quill editor needs special handling for text insertion.
   * Direct innerText manipulation may not trigger Quill's change detection.
   */
  setPromptText(text) {
    const input = this.getInputField();
    if (!input) return;

    input.focus();

    // Clear and set content
    input.innerHTML = '';

    const p = document.createElement('p');
    p.textContent = text;
    input.appendChild(p);

    // Fire multiple event types to ensure Quill picks up the change
    input.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: text
    }));

    // Quill also listens for 'text-change' internally
    // The input event with bubbles should propagate up through the shadow root
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }
}
