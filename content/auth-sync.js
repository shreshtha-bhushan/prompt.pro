/**
 * PromptPro Auth Sync Script
 * Injected into the PromptPro web dashboard (localhost and production)
 * Listens for Clerk auth tokens from the web app and forwards them to the extension.
 */
window.addEventListener("message", (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  if (event.data && event.data.type === "PROMPT_PRO_SYNC_TOKEN") {
    try {
      chrome.runtime.sendMessage({
        type: "SYNC_CLERK_TOKEN",
        payload: event.data.payload
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Extension might be reloaded or context invalidated
          console.warn("[PromptPro] Extension context invalid or background script not ready.");
        } else if (response && response.success) {
          console.log("[PromptPro] Successfully synced auth token to extension.");
        }
      });
    } catch (err) {
      console.warn("[PromptPro AuthSync] Could not send message to extension background.", err);
    }
  }

  if (event.data && event.data.type === "PROMPT_PRO_SYNC_SIGNOUT") {
    try {
      chrome.runtime.sendMessage({ type: "CLEAR_AUTH_SESSION" });
    } catch (err) {}
  }
});
