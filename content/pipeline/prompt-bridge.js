/**
 * Prompt Bridge
 * Handles communication between content script and background service worker.
 * All messages go through chrome.runtime.sendMessage — never external networks.
 */

/**
 * Send a prompt to the background for processing.
 * @param {string} text - Raw prompt text
 * @param {string} siteId - Site identifier (chatgpt, claude, gemini)
 * @param {string} strategy - Rewrite strategy (enhance, elaborate, concise)
 * @returns {Promise<{ rewritten: string, score: { before: number, after: number }, applied: boolean } | { error: string }>}
 */
export function upgradePrompt(text, siteId, strategy = 'enhance') {
  return new Promise((resolve, reject) => {
    if (!text || typeof text !== 'string') {
      resolve({ error: 'Empty prompt' });
      return;
    }

    if (text.length > 10000) {
      resolve({ error: 'Prompt too long (max 10,000 characters)' });
      return;
    }

    chrome.runtime.sendMessage(
      {
        type: 'UPGRADE_PROMPT',
        payload: { text, siteId, strategy }
      },
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

/**
 * Get current settings from storage.
 * @returns {Promise<object>}
 */
export function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      resolve(result.settings || {
        defaultStrategy: 'enhance',
        showScoreBadge: true,
        enabled: true
      });
    });
  });
}

/**
 * Save settings to storage.
 * @param {object} settings
 * @returns {Promise<void>}
 */
export function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ settings }, resolve);
  });
}
