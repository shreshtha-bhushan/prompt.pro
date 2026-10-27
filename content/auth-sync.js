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
        payload: {
          ...event.data.payload,
          apiBase: window.location.origin
        }
      }, (response) => {
        const _err = chrome.runtime.lastError;
        if (response && response.success) {
          console.log("[PromptPro] Successfully synced auth token to extension from:", window.location.origin);
        }
      });
    } catch (err) {}
  }

  if (event.data && event.data.type === "PROMPT_PRO_SYNC_SIGNOUT") {
    try {
      chrome.runtime.sendMessage({ type: "CLEAR_AUTH_SESSION" });
    } catch (err) {}
  }

  if (event.data && event.data.type === "PROMPTPRO_UPDATE_SETTINGS") {
    try {
      const payload = event.data.payload || {};
      const extSettings = {
        enabled: payload.enabled !== undefined ? payload.enabled : true,
        defaultStrategy: payload.defaultStrategy || "enhance",
        defaultTone: payload.defaultTone === "none" ? null : payload.defaultTone || null,
        lowTokenEnabled: Boolean(payload.lowTokenEnabled),
        noFluff: Boolean(payload.noFluff),
        siteMemory: Boolean(payload.siteMemory),
        autocompleteEnabled: Boolean(payload.autocompleteEnabled)
      };
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['settings'], (res) => {
          const current = res.settings || {};
          const merged = { ...current, ...extSettings };
          chrome.storage.local.set({ settings: merged, ...extSettings }, () => {
            console.log("[PromptPro] Successfully synced web dashboard settings to extension storage:", merged);
          });
        });
      }
      chrome.runtime.sendMessage({ type: "UPDATE_SETTINGS", payload: extSettings }, () => {
        if (chrome.runtime.lastError) {}
      });
    } catch (err) {
      console.warn("[PromptPro AuthSync] Could not sync settings to extension.", err);
    }
  }
});
