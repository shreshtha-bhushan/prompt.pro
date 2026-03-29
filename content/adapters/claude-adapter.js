/**
 * ⚠️  REFERENCE ONLY — This file is NOT loaded by the manifest.
 * See content/main.js for the runtime implementation.
 *
 * Claude Site Adapter
 * Handles DOM interaction for claude.ai
 * 
 * Claude uses a React-based SPA with:
 * - ProseMirror contenteditable editor inside a fieldset
 * - Toolbar with model selector and send button
 * - Dynamic DOM updates on conversation switches
 */

import { BaseSiteAdapter } from './base-adapter.js';

export class ClaudeAdapter extends BaseSiteAdapter {

  get siteId() {
    return 'claude';
  }

  get selectors() {
    return {
      input: [
        'div[contenteditable="true"].ProseMirror',            // Primary ProseMirror editor
        'div[contenteditable="true"][data-placeholder]',      // Generic contenteditable
        'fieldset div[contenteditable="true"]',               // Inside fieldset
        'div.is-editor-empty[contenteditable="true"]'         // Empty state editor
      ],
      toolbar: [
        // Claude's toolbar sits at the bottom of the fieldset
        'fieldset > div:last-child',                           // Last child of fieldset
        'div[class*="flex"][class*="items-center"]:has(button[aria-label*="Send"])',
        'div[class*="flex"][class*="gap"]:has(button[type="submit"])',
        'div[class*="toolbar"]'                                // Generic toolbar class
      ],
      sendButton: [
        'button[aria-label="Send Message"]',                   // Full label
        'button[aria-label="Send"]',                           // Short label
        'button[type="submit"]',                               // Form submit
        'fieldset button:last-of-type'                         // Structural fallback
      ]
    };
  }

  /**
   * Claude's ProseMirror editor uses <p> tags for paragraphs.
   * We need to properly structure the content and dispatch
   * ProseMirror-compatible events.
   */
  setPromptText(text) {
    const input = this.getInputField();
    if (!input) return;

    input.focus();

    // Split by newlines and create paragraph elements
    const lines = text.split('\n');
    input.innerHTML = '';

    for (const line of lines) {
      const p = document.createElement('p');
      if (line.trim() === '') {
        p.innerHTML = '<br>';
      } else {
        p.textContent = line;
      }
      input.appendChild(p);
    }

    // Dispatch input event for ProseMirror
    input.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText'
    }));
  }
}
