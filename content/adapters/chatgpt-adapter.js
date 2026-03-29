/**
 * ⚠️  REFERENCE ONLY — This file is NOT loaded by the manifest.
 * See content/main.js for the runtime implementation.
 *
 * ChatGPT Site Adapter
 * Handles DOM interaction for chat.openai.com and chatgpt.com
 * 
 * ChatGPT uses a React-based SPA with:
 * - contenteditable div (#prompt-textarea) or textarea for input
 * - Flex-based toolbar with send button
 * - Frequent DOM re-renders on conversation switches
 */

import { BaseSiteAdapter } from './base-adapter.js';

export class ChatGPTAdapter extends BaseSiteAdapter {

  get siteId() {
    return 'chatgpt';
  }

  get selectors() {
    return {
      input: [
        '#prompt-textarea',                                   // Primary: contenteditable div
        'div[contenteditable="true"][data-placeholder]',      // Generic contenteditable
        'textarea[data-id="root"]',                           // Legacy textarea
        'form textarea'                                       // Deep fallback
      ],
      toolbar: [
        // The toolbar is typically a sibling/child container near the input
        '#prompt-textarea ~ div',                              // Sibling to input
        'form div[class*="flex"][class*="items-end"]',         // Flex container at bottom
        'form > div > div:last-child',                         // Positional last child
        'form div[class*="justify-between"]'                   // Justify container
      ],
      sendButton: [
        'button[data-testid="send-button"]',                  // Primary test ID
        'button[aria-label="Send prompt"]',                    // Accessibility label
        'button[aria-label="Send"]',                           // Shorter label variant
        'form button[class*="bottom"]:last-of-type'           // Structural fallback
      ]
    };
  }

  /**
   * ChatGPT uses a contenteditable ProseMirror-like editor.
   * We need to handle the paragraph structure inside it.
   */
  setPromptText(text) {
    const input = this.getInputField();
    if (!input) return;

    if (input.tagName === 'TEXTAREA') {
      // Legacy textarea path
      super.setPromptText(text);
      return;
    }

    // contenteditable div — set via innerText for clean paragraph handling
    input.focus();

    // Clear existing content
    input.innerHTML = '';

    // Create a paragraph element for the text
    const p = document.createElement('p');
    p.textContent = text;
    input.appendChild(p);

    // Fire events that ChatGPT's React listens for
    input.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: text
    }));
  }
}
