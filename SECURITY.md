# PromptPro — Security, Privacy, and Chrome Web Store Alignment

This document summarizes the threat model for a Chrome extension that injects UI next to third-party AI chat surfaces, and records how PromptPro mitigates those risks.

## Threat model (summary)

| Threat | Description | Mitigation |
|--------|-------------|------------|
| **T1 — UI injection abuse** | Malicious or buggy DOM injection could block Send, steal clicks, or spoof native controls. | Inject a **sibling** before the send control (`insertBefore`), `type="button"`, `stopPropagation` on our UI only, `data-promptpro` markers, no overlay on native buttons. |
| **T2 — Keylogging / input capture** | Reading every keystroke or full page text and exfiltrating it. | **No** `document.addEventListener('input', …)` on the page for logging. Prompt text is read **only** when the user invokes upgrade/apply, and processed **locally** in the service worker. |
| **T3 — Unauthorized exfiltration** | Sending prompts or browsing data to third-party servers. | **No** `fetch` / `XMLHttpRequest` to external origins for prompt content. Processing stays in the extension (MV3 service worker + `chrome.storage.local`). |
| **T4 — Storage disclosure** | Stolen device or malicious extension reading storage. | Data stays in **local** extension storage; no cloud sync in this codebase. Users can clear history/library via the popup. |
| **T5 — Message spoofing** | Another page sending `chrome.runtime.sendMessage` to the extension. | Message handlers validate **`sender.id === chrome.runtime.id`** so only this extension’s contexts (popup, content, offscreen) are accepted. |
| **T6 — Clipboard abuse** | Writing sensitive data without user action. | Clipboard use in the popup is **button-triggered** (“Copy”) only. |

Residual risk: **any** content script can be affected by page scripts in the same world; we do not claim immunity from a fully compromised renderer. The design minimizes attack surface and avoids privileged patterns (e.g. no `<all_urls>`).

## Secure injection guidelines

1. **Anchor, not replace** — Never remove or replace the host send button; insert beside it in the same flex row when possible.
2. **Explicit button types** — Use `type="button"` so injected controls do not submit host forms.
3. **Event boundaries** — Use `stopPropagation()` on our controls to avoid triggering host handlers; avoid capturing listeners that wrap the entire composer unless necessary.
4. **Minimal z-index** — Use high stacking only where needed (popover, dropdown) so host tooltips remain usable; avoid full-screen transparent layers.
5. **No shadowing of critical ARIA** — Do not duplicate `aria-label` of the send control; keep our control as a separate named control.

## Privacy architecture

- **Data locations**: `chrome.storage.local` for settings, history, library, and context blocks; optional `chrome.storage.session` for ephemeral session state.
- **Data flow**: Content script → `chrome.runtime.sendMessage` → service worker → **local** string transforms and scoring. No telemetry or remote API calls for prompt text.
- **Transparency**: Description and UI copy should state that processing is local and that optional saved snippets live in extension storage on the device.
- **User control**: History can be cleared; library entries and context blocks can be deleted from the popup.

## Chrome Web Store policy alignment (high level)

- **Single purpose**: Improve prompts on supported AI sites; no unrelated behavior.
- **Narrow permissions**: `storage`, `activeTab`, and explicit host permissions for listed chat origins only.
- **No undisclosed collection**: No remote transmission of user prompts.
- **Privacy policy**: Publish a short policy that matches the above (local processing, what is stored, how to delete).

Review the [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies) before publication; this file is engineering guidance, not legal advice.
