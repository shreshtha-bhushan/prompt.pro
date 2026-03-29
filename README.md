# PromptPro

The first native prompt optimization layer that lives inside AI tools—right where you type.

PromptPro is a lightweight, local-first Chrome Extension that upgrades your prompts in real time, directly inside the input boxes of ChatGPT, Claude, and Gemini. Say goodbye to copying and pasting from external prompt optimizers.

## Features

- **Inline UX Integration**: Injects a sleek "✨ Upgrade" button directly beside the native send/attach button in your favorite AI chat tools.
- **Apple-Inspired Design Language**: Features state-of-the-art glassmorphic UI, responsive micro-animations, sweep glows, and a beautiful monotone mesh-gradient popup.
- **Cross-Platform Resilience**: Robust DOM observers ensure the button stays unconditionally anchored through single-page navigation and dynamic UI updates across ChatGPT, Claude, and Gemini.
- **Local-First & Secure**: Completely privacy-focused. Configuration, history, and library templates are stored exclusively on your local device via `chrome.storage.local`.
- **Intelligent Strategies**: Choose from strategies like Enhance, Elaborate, and Concise, and fine-tune your prompts using distinct professional, creative, or specialized tones.

---

## Complete Installation Steps

### Prerequisites
- Google Chrome browser (or a Chromium-based browser like Brave or Edge).

### Installation Details
1. **Download Code**: Clone or download this repository to your local machine.
2. **Open Extensions**: Open Chrome and navigate to the Extensions management page by typing:
   `chrome://extensions/` into your URL bar.
3. **Enable Developer Mode**: Toggle the **Developer mode** switch located in the top-right corner.
4. **Load Unpacked**: Click the **Load unpacked** button that appears in the top-left corner.
5. **Select Directory**: Locate and select the root directory containing the `manifest.json` file.
6. **Pin the Extension**: (Recommended) Click the puzzle piece icon in the top right of your browser and "Pin" PromptPro to your toolbar for instant access to your settings.

---

## How to Use PromptPro

### 1. In Your Browser (The Popup Menu)
Click the PromptPro extension icon in your Chrome toolbar to open the settings menu. From here, you can:
- **Set Default Strategy:** Toggle between Enhance, Elaborate, or Concise algorithms.
- **Select Tone:** Use the scrollable liquid-glass tone selector to refine the output flavor (e.g., Professional, Academic, Direct).
- **Manage History & Context:** View recently upgraded prompts, save reusable context blocks, or clear your history safely.
- **Global Config:** Turn the entire extension on/off, toggle "No Fluff" mode, or manage site memory.

### 2. Inside AI Chats (ChatGPT, Claude, Gemini)
1. Open up a chat interface (e.g., [chatgpt.com](https://chatgpt.com), [claude.ai](https://claude.ai)).
2. Type a crude, quick, or simple prompt directly into the standard input box.
3. Instead of hitting Enter to send, click the glowing **✨ Upgrade** button injected right next to the send button.
4. A beautiful glassmorphic popover will instantly appear displaying the optimized prompt.
5. Review the new prompt. 
6. Click the animated **Apply** button. PromptPro will safely replace your typed text with the optimized version directly in the DOM.
7. Send your newly polished prompt to the AI as usual!

---

## Technical Considerations
PromptPro utilizes a robust, zero-friction monolithic injection strategy (`main.js`) to completely bypass standard Chrome MV3 Content Script ES module limitations. It employs persistent heuristic anchoring, batched tree-mutation observers, and safe ProseMirror execution logic to ensure it fundamentally cannot corrupt the underlying React structures of external websites.
