/**
 * PromptPro Popup — settings + History / Library / Context pipelines
 * Phase 5: Authentication + Cloud Sync + Data Merge
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // CONSTANTS & CONFIG
  // ═══════════════════════════════════════════════════════════════

  const API_BASE = 'https://prompt-pro-liart.vercel.app'; // Change to https://prompt-pro-liart.vercel.app for production

  const DEFAULT_SETTINGS = {
    defaultStrategy: 'enhance',
    defaultTone: null,
    showScoreBadge: true,
    enabled: true,
    noFluff: false,
    lowTokenEnabled: false,
    siteMemory: true,
    openrouterEnabled: false,
    openrouterApiKey: '',
    openrouterModel: 'anthropic/claude-3.5-sonnet',
    customModel: '',
    autocompleteEnabled: true
  };

  // Safe SVG helper to eliminate innerHTML duplication for copy buttons
  function setCopyIcon(btn, copied = false) {
    btn.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', copied ? '#30d158' : 'currentColor');
    svg.setAttribute('stroke-width', '2');

    if (copied) {
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', '20 6 9 17 4 12');
      svg.appendChild(polyline);
    } else {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '9');
      rect.setAttribute('y', '9');
      rect.setAttribute('width', '13');
      rect.setAttribute('height', '13');
      rect.setAttribute('rx', '2');
      rect.setAttribute('ry', '2');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');
      svg.appendChild(rect);
      svg.appendChild(path);
    }

    const span = document.createElement('span');
    if (copied) span.style.color = '#30d158';
    span.textContent = copied ? 'Copied' : 'Copy';

    btn.appendChild(svg);
    btn.appendChild(span);
  }

  // ═══════════════════════════════════════════════════════════════
  // DOM REFERENCES
  // ═══════════════════════════════════════════════════════════════

  const enabledToggle = document.getElementById('enabled-toggle');
  const scoreToggle = document.getElementById('score-toggle');
  const noFluffToggle = document.getElementById('no-fluff-toggle');
  const lowTokenToggle = document.getElementById('low-token-toggle');
  const autocompleteToggle = document.getElementById('autocomplete-toggle');
  const siteMemoryToggle = document.getElementById('site-memory-toggle');
  const analyticsToggle = document.getElementById('analytics-toggle'); // analytics opt-out
  const strategyInputs = document.querySelectorAll('input[name="strategy"]');
  const toneSelector = document.getElementById('tone-dropdown');
  const toneDisplay = document.getElementById('current-tone');

  const aiEngineToggle = document.getElementById('ai-engine-toggle');

  const navItems = document.querySelectorAll('.bottom-nav__item');
  const tabPanes = document.querySelectorAll('.popup__tab-pane');
  const bottomNav = document.getElementById('bottom-nav');
  const navGlider = bottomNav?.querySelector('.bottom-nav__glider');

  const historyContent = document.getElementById('history-content');
  const libraryContent = document.getElementById('library-content');
  const contextList = document.getElementById('context-list');
  const historyClearBtn = document.getElementById('history-clear-btn');

  const libraryTitle = document.getElementById('library-title');
  const libraryText = document.getElementById('library-text');
  const libraryTags = document.getElementById('library-tags');
  const libraryAddBtn = document.getElementById('library-add-btn');

  const contextAddBtn = document.getElementById('context-add-btn');

  // ═══ Header & Auth elements (Compact Apple-inspired single row) ═══
  const authScreen = document.getElementById('auth-screen');
  const authSignInBtn = document.getElementById('auth-sign-in');
  const authSkipBtn = document.getElementById('auth-skip');

  const headerPlanBadge = document.getElementById('header-plan-badge');
  const headerSyncIndicator = document.getElementById('header-sync-indicator');
  const headerSyncDot = document.getElementById('header-sync-dot');
  const headerSyncTooltip = document.getElementById('header-sync-tooltip');
  const headerSyncTooltipStatus = document.getElementById('header-sync-tooltip-status');
  const headerSyncTooltipTime = document.getElementById('header-sync-tooltip-time');
  const headerAvatarBtn = document.getElementById('header-avatar-btn');
  const headerUserAvatar = document.getElementById('header-user-avatar');
  const headerUserInitials = document.getElementById('header-user-initials');

  // ─── Analytics init (MV3-safe, from analytics.js loaded before this script) ───
  // initAnalytics / track / identifyUser / optOut / optIn are global functions
  // defined in popup/analytics.js (loaded via <script src="analytics.js">)
  if (typeof initAnalytics === 'function') { initAnalytics(); }

  let promptDb = null;
  let authSession = null; // { token, user: { id, email, name, picture }, linkedAt }

  // ═══════════════════════════════════════════════════════════════
  // AUTH STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  function isAuthenticated() {
    return authSession && authSession.token;
  }

  function showAuthScreen() {
    if (authScreen) authScreen.style.display = 'flex';
  }

  function hideAuthScreen() {
    if (authScreen) authScreen.style.display = 'none';
  }

  function getInitials(name, email) {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email && email.trim()) {
      const clean = email.split('@')[0];
      return clean.substring(0, 2).toUpperCase();
    }
    return 'PP';
  }

  /**
   * Update compact single-row header based on authentication state:
   * - Shows Clerk profile image or fallback initials
   * - Updates sync dot and tooltip
   */
  function updateHeaderForAuth() {
    if (isAuthenticated() && authSession.user) {
      const user = authSession.user;
      if (headerUserAvatar && user.picture) {
        headerUserAvatar.src = user.picture;
        headerUserAvatar.style.display = 'block';
        if (headerUserInitials) headerUserInitials.style.display = 'none';
      } else {
        if (headerUserAvatar) headerUserAvatar.style.display = 'none';
        if (headerUserInitials) {
          headerUserInitials.textContent = getInitials(user.name, user.email);
          headerUserInitials.style.display = 'block';
        }
      }
      if (headerAvatarBtn) {
        headerAvatarBtn.title = `${user.name || user.email || 'Clerk Account'} — Manage Account`;
        headerAvatarBtn.classList.remove('popup__avatar-btn--loading');
      }
      updateSyncStatus('synced', 'Synced', 'Last sync just now');
    } else {
      if (headerUserAvatar) headerUserAvatar.style.display = 'none';
      if (headerUserInitials) {
        headerUserInitials.textContent = 'PP';
        headerUserInitials.style.display = 'block';
      }
      if (headerAvatarBtn) {
        headerAvatarBtn.title = 'Sign in with Clerk';
        headerAvatarBtn.classList.remove('popup__avatar-btn--loading');
      }
      updateSyncStatus('offline', 'Sync offline', 'Sign in to enable cloud sync');
    }
  }

  /**
   * Update sync indicator state (green dot = synced, amber = syncing, red = error/offline)
   */
  function updateSyncStatus(status, statusText, timeText) {
    if (!headerSyncDot) return;
    headerSyncDot.classList.remove('popup__sync-dot--syncing', 'popup__sync-dot--error');

    if (status === 'syncing') {
      headerSyncDot.classList.add('popup__sync-dot--syncing');
      if (headerSyncTooltipStatus) headerSyncTooltipStatus.textContent = statusText || 'Syncing…';
      if (headerSyncTooltipTime) headerSyncTooltipTime.textContent = timeText || 'Syncing data to cloud';
      if (headerSyncIndicator) headerSyncIndicator.title = 'Syncing…';
    } else if (status === 'error' || status === 'offline') {
      headerSyncDot.classList.add('popup__sync-dot--error');
      if (headerSyncTooltipStatus) headerSyncTooltipStatus.textContent = statusText || 'Sync unavailable';
      if (headerSyncTooltipTime) headerSyncTooltipTime.textContent = timeText || 'Check connection';
      if (headerSyncIndicator) headerSyncIndicator.title = statusText || 'Sync unavailable';
    } else {
      if (headerSyncTooltipStatus) headerSyncTooltipStatus.textContent = statusText || 'Synced';
      if (headerSyncTooltipTime) headerSyncTooltipTime.textContent = timeText || 'Last sync just now';
      if (headerSyncIndicator) headerSyncIndicator.title = `${statusText || 'Synced'} · ${timeText || 'Last sync just now'}`;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CLOUD API CALLS
  // ═══════════════════════════════════════════════════════════════

  async function cloudFetch(path, options = {}) {
    if (!isAuthenticated()) return null;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authSession.token}`,
      ...(options.headers || {})
    };
    try {
      const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (!resp.ok) {
        if (resp.status === 401) {
          authSession = null;
        }
        return null;
      }
      return await resp.json();
    } catch (err) {
      return null;
    }
  }

  async function fetchCloudData() {
    return cloudFetch('/api/extension/sync');
  }

  async function cloudWrite(action, data) {
    return cloudFetch('/api/extension/sync', {
      method: 'POST',
      body: JSON.stringify({ action, ...data })
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // FLUSH TO CLOUD — Push ALL local data to Supabase before sign-out
  // ═══════════════════════════════════════════════════════════════

  async function flushLocalToCloud() {
    if (!isAuthenticated()) return;
    const db = promptDb || { history: [], library: [], contextBlocks: [] };
    const history = (db.history || []).map(h => ({
      text: h.text,
      score: h.score,
      originalText: h.originalText,
      scoreBefore: h.scoreBefore,
      site: h.site,
      strategy: h.strategy
    }));
    const library = (db.library || []).map(l => ({ title: l.title, text: l.text }));
    const contextBlocks = (db.contextBlocks || []).map(c => ({
      title: c.title,
      content: c.content,
      active: c.active
    }));
    if (history.length === 0 && library.length === 0 && contextBlocks.length === 0) return;
    await cloudWrite('bulkMerge', { history, library, contextBlocks });
  }

  // ═══════════════════════════════════════════════════════════════
  // DATA MERGE — Cloud + Local
  // ═══════════════════════════════════════════════════════════════

  async function mergeCloudAndLocal() {
    if (!isAuthenticated()) return;

    updateSyncStatus('syncing', 'Syncing…');

    const cloudData = await fetchCloudData();
    if (!cloudData || !cloudData.success) {
      updateSyncStatus('error', 'Sync failed');
      return;
    }

    // ── User-switch detection: wipe local DB if a different user signs in ──
    const currentUserId = authSession.user && authSession.user.id;
    const storedData = await new Promise((resolve) =>
      chrome.storage.local.get(['lastUserId'], resolve)
    );
    const lastUserId = storedData.lastUserId || null;

    if (currentUserId && lastUserId && lastUserId !== currentUserId) {
      // Different user — discard all previous local data
      promptDb = { history: [], library: [], contextBlocks: [], historyLimit: 50 };
      await new Promise((resolve) =>
        chrome.storage.local.set({ promptDb }, resolve)
      );
    }

    // Record the current user so we can detect future switches
    if (currentUserId) {
      await new Promise((resolve) =>
        chrome.storage.local.set({ lastUserId: currentUserId }, resolve)
      );
    }

    // Get current local data
    const localDb = promptDb || { history: [], library: [], contextBlocks: [] };

    // Find local-only items to push to cloud
    const cloudHistoryTexts = new Set((cloudData.history || []).map(h => h.text));
    const localOnlyHistory = (localDb.history || []).filter(h => !cloudHistoryTexts.has(h.text));

    const cloudLibraryKeys = new Set((cloudData.library || []).map(l => `${l.title}||${l.text}`));
    const localOnlyLibrary = (localDb.library || []).filter(l => !cloudLibraryKeys.has(`${l.title}||${l.text}`));

    const cloudContextKeys = new Set((cloudData.contextBlocks || []).map(c => `${c.title}||${c.content}`));
    const localOnlyContext = (localDb.contextBlocks || []).filter(c => !cloudContextKeys.has(`${c.title}||${c.content}`));

    // Push items to cloud (bulk merge) — send ALL local history so the server
    // can update stale records (e.g. site='extension') with correct site names
    const allLocalHistory = (localDb.history || []);
    const hasDataToSync = allLocalHistory.length > 0 || localOnlyLibrary.length > 0 || localOnlyContext.length > 0;
    if (hasDataToSync) {
      await cloudWrite('bulkMerge', {
        history: allLocalHistory.map(h => ({ 
          text: h.text, 
          score: h.score,
          originalText: h.originalText,
          scoreBefore: h.scoreBefore,
          site: h.site,
          strategy: h.strategy
        })),
        library: localOnlyLibrary.map(l => ({ title: l.title, text: l.text })),
        contextBlocks: localOnlyContext.map(c => ({ title: c.title, content: c.content, active: c.active }))
      });
    }

    // Build merged local DB (cloud data is source of truth + local-only items appended)
    const mergedHistory = [
      ...(cloudData.history || []).map(h => ({
        id: h.id,
        text: h.text,
        score: h.score,
        originalText: h.originalText,
        scoreBefore: h.scoreBefore,
        site: h.site,
        strategy: h.strategy,
        timestamp: new Date(h.createdAt).getTime()
      })),
      ...localOnlyHistory
    ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const mergedLibrary = [
      ...(cloudData.library || []).map(l => ({
        id: l.id,
        title: l.title,
        text: l.text,
        tags: l.tags || []
      })),
      ...localOnlyLibrary
    ];

    const mergedContext = [
      ...(cloudData.contextBlocks || []).map(c => ({
        id: c.id,
        title: c.title,
        content: c.content,
        active: c.active
      })),
      ...localOnlyContext
    ];

    // Update local DB with merged data
    promptDb = {
      ...localDb,
      history: mergedHistory,
      library: mergedLibrary,
      contextBlocks: mergedContext,
      historyLimit: localDb.historyLimit || 50
    };

    await new Promise((resolve) => chrome.storage.local.set({ promptDb }, resolve));

    renderTabContent('history');
    renderTabContent('library');
    renderTabContent('context');

    updateSyncStatus('synced', 'Synced');
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTH FLOW — Sign In / Sign Out
  // ═══════════════════════════════════════════════════════════════

  function startLogin() {
    // Open the web app dashboard — ExtensionSync will broadcast the token
    chrome.tabs.create({ url: `${API_BASE}/dashboard` });
    // Popup will close when the tab opens. When user reopens, auth will be loaded from storage.
  }

  async function signOut() {
    const ok = await showConfirmDrawer({
      title: 'Sign Out?',
      description: 'Your cloud data will remain safe. You can sign in again anytime.',
      confirmLabel: 'Sign Out',
      cancelLabel: 'Cancel'
    });
    if (!ok) return;

    // ── Step 1: Flush all local data to Supabase BEFORE clearing ──
    // This ensures the user's data is safely stored and restored on next sign-in.
    updateSyncStatus('syncing', 'Saving your data…');
    try {
      await flushLocalToCloud();
    } catch (e) {
      console.warn('[PromptPro] Pre-signout flush failed:', e);
    }

    // ── Step 2: Snapshot session so we can still sign out on the dashboard ──
    const sessionSnapshot = authSession;
    authSession = null;

    // ── Step 3: Clear local data so the next user starts fresh ──
    promptDb = { history: [], library: [], contextBlocks: [], historyLimit: 50 };
    await new Promise((resolve) =>
      chrome.storage.local.set(
        { ignoreSyncUntil: Date.now() + 5000, promptDb },
        resolve
      )
    );
    await new Promise((resolve) =>
      chrome.storage.local.remove(['authSession', 'skipLogin', 'lastUserId'], resolve)
    );

    renderTabContent('history');
    renderTabContent('library');
    renderTabContent('context');

    // Sign out from the dashboard: redirect existing tab if open, otherwise use a temporary background tab
    chrome.tabs.query({ url: ['*://prompt-pro-liart.vercel.app/*', '*://localhost/*'] }, (tabs) => {
      let foundTab = false;
      if (tabs && tabs.length > 0) {
        tabs.forEach(tab => {
          try {
            const origin = new URL(tab.url).origin;
            // Only update if it's our production app or localhost on port 3000
            if (origin === 'https://prompt-pro-liart.vercel.app' || origin.includes('localhost:3000')) {
              chrome.tabs.update(tab.id, { url: `${origin}/signout` });
              foundTab = true;
            }
          } catch (e) {}
        });
      }
      
      if (!foundTab) {
        chrome.tabs.create({ url: `${API_BASE}/signout`, active: false }, (tab) => {
          setTimeout(() => { if (tab && tab.id) chrome.tabs.remove(tab.id).catch(()=>{}); }, 3000);
        });
      }
    });

    updateHeaderForAuth();
    // Show the login screen again
    showAuthScreen();
    if (headerSignInBtn) headerSignInBtn.style.display = 'none';
  }

  // ═══════════════════════════════════════════════════════════════
  // CONFIRM DRAWER (unchanged from original)
  // ═══════════════════════════════════════════════════════════════

  function showConfirmDrawer(options) {
    return new Promise((resolve) => {
      const root = document.getElementById('confirm-drawer-root');
      const titleEl = document.getElementById('confirm-drawer-title');
      const descEl = document.getElementById('confirm-drawer-desc');
      const okBtn = document.getElementById('confirm-drawer-ok');
      const cancelBtn = document.getElementById('confirm-drawer-cancel');
      const backdrop = root?.querySelector('[data-confirm-drawer-dismiss]');
      if (!root || !titleEl || !descEl || !okBtn || !cancelBtn || !backdrop) {
        resolve(false);
        return;
      }

      titleEl.textContent = options.title || 'PromptPro';
      descEl.textContent = options.description || '';
      okBtn.textContent = options.confirmLabel || 'OK';
      cancelBtn.textContent = options.cancelLabel || 'Cancel';
      okBtn.classList.toggle('confirm-drawer__btn--destructive', !!options.destructive);

      let settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        backdrop.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);

        root.classList.remove('confirm-drawer--open');

        const active = document.activeElement;
        if (active && typeof root.contains === 'function' && root.contains(active)) {
          active.blur();
        }

        requestAnimationFrame(() => {
          root.setAttribute('aria-hidden', 'true');
          if ('inert' in root) root.inert = true;
          else root.setAttribute('inert', '');
          resolve(value);
        });
      }

      function onOk() { finish(true); }
      function onCancel() { finish(false); }
      function onBackdrop() { finish(false); }
      function onKey(e) { if (e.key === 'Escape') finish(false); }

      if ('inert' in root) root.inert = false;
      else root.removeAttribute('inert');
      root.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => {
        root.classList.add('confirm-drawer--open');
        setTimeout(() => {
          try { okBtn.focus(); } catch (e) { /* ignore */ }
        }, 50);
      });

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      backdrop.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SERVICE WORKER MESSAGING
  // ═══════════════════════════════════════════════════════════════

  function sendBackground(type, payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, payload }, (res) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (res && res.error) {
          reject(new Error(res.error));
          return;
        }
        resolve(res);
      });
    });
  }

  function mergeDb(next) {
    if (next && typeof next === 'object') {
      promptDb = next;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STORAGE CHANGE LISTENER
  // ═══════════════════════════════════════════════════════════════

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    // React to auth session changes (e.g., service worker stored a new token)
    if (changes.authSession) {
      authSession = changes.authSession.newValue || null;
      hideAuthScreen();
      updateHeaderForAuth();
      if (isAuthenticated()) {
        mergeCloudAndLocal();
      }
    }

    if (changes.promptDb) {
      mergeDb(changes.promptDb.newValue);
      renderTabContent('history');
      renderTabContent('library');
      renderTabContent('context');
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // JWT DECODE (for popup-side token extraction fallback)
  // ═══════════════════════════════════════════════════════════════

  function decodeJWTPayload(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      return JSON.parse(atob(padded));
    } catch (e) {
      return null;
    }
  }

  /**
   * Fallback: check active tab URL for extensionToken param.
   * This handles the case where the service worker missed the
   * chrome.tabs.onUpdated event (e.g. old SW code was cached).
   * Also re-checks storage in case SW stored it between popup close/open.
   */
  function tryExtractTokenFromTab() {
    return new Promise((resolve) => {
      // First: re-check storage (SW may have stored it while popup was closed)
      chrome.storage.local.get(['authSession'], (result) => {
        if (result.authSession && result.authSession.token) {
          authSession = result.authSession;
          resolve(true);
          return;
        }

        // Second: check active tab URL for extensionToken
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || !tabs[0] || !tabs[0].url) {
            resolve(false);
            return;
          }
          try {
            const url = new URL(tabs[0].url);
            const token = url.searchParams.get('extensionToken');
            if (!token) {
              resolve(false);
              return;
            }

            const payload = decodeJWTPayload(token);
            if (!payload || !payload.sub) {
              resolve(false);
              return;
            }

            // Store the auth session
            authSession = {
              token: token,
              user: {
                id: payload.sub,
                email: payload.email || '',
                name: payload.name || '',
                picture: payload.picture || null
              },
              linkedAt: Date.now()
            };
            chrome.storage.local.set({ authSession, skipLogin: false }, () => {
              console.log('[PromptPro Popup] Extracted token from active tab for:', payload.email);
              resolve(true);
            });
          } catch (e) {
            resolve(false);
          }
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  chrome.storage.local.get(['settings', 'promptDb', 'authSession', 'skipLogin', 'pp_analytics_opt_out'], (result) => {
    const settings = { ...DEFAULT_SETTINGS, ...result.settings };
    promptDb = result.promptDb || { history: [], library: [], contextBlocks: [], historyLimit: 50 };
    authSession = result.authSession || null;
    const skipLogin = result.skipLogin || false;

    // ── Analytics opt-out toggle: reflect stored preference ──
    const isAnalyticsOptOut = result.pp_analytics_opt_out === true;
    if (analyticsToggle) analyticsToggle.checked = !isAnalyticsOptOut;
    if (isAnalyticsOptOut && typeof optOut === 'function') optOut();

    // ── Auth UI State ──
    if (isAuthenticated()) {
      hideAuthScreen();
      updateHeaderForAuth();
      // Identify user in analytics (popup context)
      if (authSession.user && authSession.user.id && typeof identifyUser === 'function') {
        identifyUser(authSession.user.id, { email: authSession.user.email });
      }
      // Fetch and merge cloud data in the background
      mergeCloudAndLocal();
    } else {
      // Not authenticated — try fallback: check active tab for extensionToken
      tryExtractTokenFromTab().then((extracted) => {
        if (extracted) {
          // Token found and stored — update UI
          hideAuthScreen();
          updateHeaderForAuth();
          // Identify newly linked user in analytics
          if (authSession && authSession.user && authSession.user.id && typeof identifyUser === 'function') {
            identifyUser(authSession.user.id, { email: authSession.user.email });
            if (typeof track === 'function') track('extension_authenticated', { clerk_user_id: authSession.user.id });
          }
          mergeCloudAndLocal();
        } else if (!skipLogin) {
          // Show login screen on first use / not skipped
          showAuthScreen();
          if (headerSignInBtn) headerSignInBtn.style.display = 'none';
        } else {
          // User skipped login — show sign-in button in header
          hideAuthScreen();
          if (headerSignInBtn) headerSignInBtn.style.display = 'flex';
        }
      });
    }

    // ── Settings Initialization (unchanged logic) ──
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let siteId = null;
      if (tabs && tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) siteId = 'chatgpt';
        else if (url.includes('claude.ai')) siteId = 'claude';
        else if (url.includes('gemini.google.com')) siteId = 'gemini';
        else if (url.includes('perplexity.ai')) siteId = 'perplexity';
      }

      let activeToneValue = settings.defaultTone || 'professional';
      let activeStrategyValue = settings.defaultStrategy || 'enhance';

      if (settings.siteMemory && siteId && settings.sites?.[siteId]) {
        if (settings.sites[siteId].defaultTone !== undefined) {
          activeToneValue = settings.sites[siteId].defaultTone;
        }
        if (settings.sites[siteId].defaultStrategy !== undefined) {
          activeStrategyValue = settings.sites[siteId].defaultStrategy;
        }
      }

      if (enabledToggle) enabledToggle.checked = settings.enabled !== false;
      if (scoreToggle) scoreToggle.checked = settings.showScoreBadge !== false;
      if (noFluffToggle) noFluffToggle.checked = !!settings.noFluff;
      if (lowTokenToggle) lowTokenToggle.checked = !!settings.lowTokenEnabled;
      if (autocompleteToggle) autocompleteToggle.checked = settings.autocompleteEnabled !== false;
      if (siteMemoryToggle) siteMemoryToggle.checked = settings.siteMemory !== false;

      const targetRadio = Array.from(strategyInputs).find((r) => r.value === activeStrategyValue);
      if (targetRadio) targetRadio.checked = true;

      const activeToneItem = toneSelector?.querySelector(`[data-value="${activeToneValue}"]`);
      if (activeToneItem && toneDisplay) {
        toneDisplay.textContent = activeToneItem.querySelector('span').textContent;
        toneSelector.querySelectorAll('.popup__dropdown-item').forEach((b) => b.classList.remove('popup__dropdown-item--active'));
        activeToneItem.classList.add('popup__dropdown-item--active');
      }

      if (aiEngineToggle) {
        aiEngineToggle.checked = !!settings.openrouterEnabled;
      }

      renderTabContent('history');
      renderTabContent('library');
      renderTabContent('context');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CLERK AVATAR & AUTH EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════

  authSignInBtn?.addEventListener('click', () => {
    startLogin();
  });

  authSkipBtn?.addEventListener('click', () => {
    hideAuthScreen();
    chrome.storage.local.set({ skipLogin: true });
    updateHeaderForAuth();
  });

  // ── Clerk Avatar Button: Single account entry point ──
  headerAvatarBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (isAuthenticated()) {
      // Open Clerk Account Management in web dashboard
      chrome.tabs.create({ url: API_BASE + '/dashboard/settings' });
    } else {
      // Open Clerk Sign-In
      chrome.tabs.create({ url: API_BASE + '/login' });
    }
  });

  // ── Sync Indicator click to refresh or show tooltip ──
  headerSyncIndicator?.addEventListener('click', (e) => {
    e.preventDefault();
    if (isAuthenticated()) {
      updateSyncStatus('syncing', 'Syncing…', 'Refreshing state…');
      chrome.runtime.sendMessage({ type: 'REFRESH_ENTITLEMENT' }, (res) => {
        if (res && res.snapshot) {
          renderEntitlement(res.snapshot);
          updateSyncStatus('synced', 'Synced', 'Last sync just now');
        } else {
          updateSyncStatus('synced', 'Synced', 'Last sync just now');
        }
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  function saveSettings(updates) {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = { ...DEFAULT_SETTINGS, ...result.settings };
      
      const shouldCheckSite = settings.siteMemory && 
        (updates.defaultStrategy !== undefined || updates.defaultTone !== undefined);
      
      if (shouldCheckSite && typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          let siteId = null;
          if (tabs && tabs[0] && tabs[0].url) {
            const url = tabs[0].url;
            if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) siteId = 'chatgpt';
            else if (url.includes('claude.ai')) siteId = 'claude';
            else if (url.includes('gemini.google.com')) siteId = 'gemini';
            else if (url.includes('perplexity.ai')) siteId = 'perplexity';
          }

          if (siteId) {
            if (!settings.sites) settings.sites = {};
            if (!settings.sites[siteId]) settings.sites[siteId] = {};
            
            if (updates.defaultStrategy !== undefined) {
              settings.sites[siteId].defaultStrategy = updates.defaultStrategy;
            }
            if (updates.defaultTone !== undefined) {
              settings.sites[siteId].defaultTone = updates.defaultTone;
            }
            
            Object.assign(settings, updates);
          } else {
            Object.assign(settings, updates);
          }
          
          chrome.storage.local.set({ settings });
        });
      } else {
        Object.assign(settings, updates);
        chrome.storage.local.set({ settings });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════

  function updateNavGlider(activeItem) {
    if (!navGlider || !activeItem) return;
    navGlider.style.transform = `translateX(${activeItem.offsetLeft}px)`;
    navGlider.style.width = `${activeItem.offsetWidth}px`;
    navGlider.classList.add('bottom-nav__glider--ready');
  }

  function activateTab(item) {
    if (!item) return;
    const targetId = item.getAttribute('data-tab');

    navItems.forEach((nav) => {
      nav.classList.remove('bottom-nav__item--active');
      nav.setAttribute('aria-selected', 'false');
    });
    item.classList.add('bottom-nav__item--active');
    item.setAttribute('aria-selected', 'true');

    tabPanes.forEach((pane) => {
      if (pane.id === `tab-${targetId}`) {
        pane.classList.add('popup__tab-pane--active');
      } else {
        pane.classList.remove('popup__tab-pane--active');
      }
    });

    updateNavGlider(item);
    setTimeout(() => updateNavGlider(item), 50);
    setTimeout(() => updateNavGlider(item), 260);
    renderTabContent(targetId);

    if (targetId === 'history' && typeof track === 'function') {
      track('history_drawer_opened', {});
    }
  }

  navItems.forEach((item, idx) => {
    item.addEventListener('click', () => activateTab(item));

    // Keyboard accessibility for arrow keys inside tablist
    item.addEventListener('keydown', (e) => {
      let nextIndex = null;
      if (e.key === 'ArrowRight') {
        nextIndex = (idx + 1) % navItems.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (idx - 1 + navItems.length) % navItems.length;
      }
      if (nextIndex !== null) {
        e.preventDefault();
        navItems[nextIndex].focus();
        activateTab(navItems[nextIndex]);
      }
    });
  });

  window.addEventListener('load', () => {
    const syncGlider = () => {
      const active = document.querySelector('.bottom-nav__item--active');
      if (active) updateNavGlider(active);
    };
    syncGlider();
    setTimeout(syncGlider, 100);
    setTimeout(syncGlider, 260);
  });

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════

  enabledToggle?.addEventListener('change', () => {
    saveSettings({ enabled: enabledToggle.checked });
  });

  scoreToggle?.addEventListener('change', () => {
    saveSettings({ showScoreBadge: scoreToggle.checked });
  });

  noFluffToggle?.addEventListener('change', () => {
    saveSettings({ noFluff: noFluffToggle.checked });
  });

  lowTokenToggle?.addEventListener('change', async () => {
    if (lowTokenToggle.checked) {
      const ok = await showConfirmDrawer({
        title: 'Enable Low Token Mode?',
        description: 'This instructs the AI to enforce a strict 150-word or 3-bullet point limit to minimize token usage. Keep this turned off if you want larger, more detailed responses.',
        confirmLabel: 'Enable',
        cancelLabel: 'Keep Disabled'
      });
      if (!ok) {
        lowTokenToggle.checked = false;
        return;
      }
    }
    saveSettings({ lowTokenEnabled: lowTokenToggle.checked });
  });

  autocompleteToggle?.addEventListener('change', () => {
    saveSettings({ autocompleteEnabled: autocompleteToggle.checked });
  });

  siteMemoryToggle?.addEventListener('change', () => {
    saveSettings({ siteMemory: siteMemoryToggle.checked });
  });

  // Analytics opt-out toggle — "Share anonymous usage data"
  analyticsToggle?.addEventListener('change', () => {
    if (analyticsToggle.checked) {
      if (typeof optIn === 'function') optIn();
    } else {
      if (typeof optOut === 'function') optOut();
    }
  });

  strategyInputs.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        saveSettings({ defaultStrategy: e.target.value });
      }
    });
  });

  aiEngineToggle?.addEventListener('change', () => {
    const enabled = aiEngineToggle.checked;
    saveSettings({ openrouterEnabled: enabled });
  });

  const toneTrigger = toneSelector?.querySelector('.popup__dropdown-trigger');
  const toneMenu = toneSelector?.querySelector('.popup__dropdown-menu');

  toneTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = toneSelector.classList.toggle('popup__dropdown--open');

    if (isOpen && toneMenu) {
      const active = toneMenu.querySelector('.popup__dropdown-item--active');
      if (active) {
        active.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (toneSelector && !toneSelector.contains(e.target)) {
      toneSelector.classList.remove('popup__dropdown--open');
    }
  });

  toneSelector?.addEventListener('click', (e) => {
    const item = e.target.closest('.popup__dropdown-item');
    if (!item) return;

    toneSelector.querySelectorAll('.popup__dropdown-item').forEach((b) =>
      b.classList.remove('popup__dropdown-item--active')
    );
    item.classList.add('popup__dropdown-item--active');

    if (toneDisplay) toneDisplay.textContent = item.querySelector('span').textContent;
    toneSelector.classList.remove('popup__dropdown--open');

    const tone = item.getAttribute('data-value');
    saveSettings({ defaultTone: tone });
  });

  // ═══════════════════════════════════════════════════════════════
  // HELPERS: TIME & MARKDOWN FORMATTING
  // ═══════════════════════════════════════════════════════════════

  function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Just now';
    const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - time) / 1000));

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 5) return `${diffWeek}w ago`;
    const date = new Date(time);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatResetCountdown(resetAt) {
    if (!resetAt) return 'in 30d';
    const target = new Date(resetAt).getTime();
    const now = Date.now();
    const diffMs = target - now;
    if (diffMs <= 0) return 'soon';
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) {
      const remainHours = diffHour % 24;
      return remainHours > 0 ? `in ${diffDay}d ${remainHours}h` : `in ${diffDay}d`;
    }
    if (diffHour > 0) {
      const remainMin = diffMin % 60;
      return remainMin > 0 ? `in ${diffHour}h ${remainMin}m` : `in ${diffHour}h`;
    }
    return `in ${Math.max(1, diffMin)}m`;
  }

  function renderMarkdownToHtml(markdown) {
    if (!markdown) return '';
    let str = String(markdown)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks: ```lang\n ... \n```
    str = str.replace(/```([\s\S]*?)```/g, (_, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code: `code`
    str = str.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold: **text** or __text__
    str = str.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    str = str.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    str = str.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    str = str.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Headings: ### Heading
    str = str.replace(/^### (.*$)/gim, '<h3 style="font-size:13px;font-weight:700;margin:6px 0 3px 0;color:#fff;">$1</h3>');
    str = str.replace(/^## (.*$)/gim, '<h2 style="font-size:14px;font-weight:700;margin:8px 0 4px 0;color:#fff;">$1</h2>');
    str = str.replace(/^# (.*$)/gim, '<h1 style="font-size:15px;font-weight:700;margin:10px 0 4px 0;color:#fff;">$1</h1>');

    // Unordered list items: - item or * item
    str = str.replace(/^[\*\-] (.*$)/gim, '<li>$1</li>');
    str = str.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

    // Paragraphs
    const paragraphs = str.split(/\n\n+/);
    return paragraphs
      .map(p => {
        p = p.trim();
        if (!p) return '';
        if (p.startsWith('<pre>') || p.startsWith('<ul>') || p.startsWith('<ol>') || p.startsWith('<h')) {
          return p;
        }
        return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
      })
      .join('');
  }

  // ═══════════════════════════════════════════════════════════════
  // DATA ACTION HANDLERS (with cloud sync)
  // ═══════════════════════════════════════════════════════════════

  historyClearBtn?.addEventListener('click', async () => {
    const ok = await showConfirmDrawer({
      title: 'Clear history?',
      description:
        'This removes saved upgraded prompts from this device only. This cannot be undone.',
      confirmLabel: 'Clear',
      cancelLabel: 'Cancel',
      destructive: true
    });
    if (!ok) return;
    try {
      const res = await sendBackground('CLEAR_HISTORY', {});
      if (res.promptDb) mergeDb(res.promptDb);
      renderTabContent('history');
      // Also clear on cloud
      if (isAuthenticated()) {
        cloudWrite('clearHistory', {}).catch(() => {});
      }
    } catch (err) {
      console.warn('[PromptPro]', err);
    }
  });

  libraryAddBtn?.addEventListener('click', async () => {
    const title = (libraryTitle?.value || '').trim();
    const text = (libraryText?.value || '').trim();
    const tagsRaw = (libraryTags?.value || '').trim();
    if (!text) return;

    // Enforce tier limit for saved prompts
    const currentCount = (promptDb.library || []).length;
    const limit = window.__promptProEntitlementSnapshot?.limits?.savedPrompts ?? 25;
    if (typeof limit === 'number' && currentCount >= limit) {
      if (typeof showUpgradeMessage === 'function') {
        showUpgradeMessage(`Limit reached (${limit} saved prompts on ${window.__promptProEntitlementSnapshot?.tier || 'free'} tier). Upgrade for more!`, API_BASE + '/upgrade');
      }
      return;
    }

    const tags = tagsRaw
      ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    try {
      const res = await sendBackground('SAVE_LIBRARY_ENTRY', { title, text, tags });
      if (res.promptDb) mergeDb(res.promptDb);
      if (libraryTitle) libraryTitle.value = '';
      if (libraryText) libraryText.value = '';
      if (libraryTags) libraryTags.value = '';
      renderTabContent('library');
      
      if (typeof track === 'function') track('snippet_saved', { source: 'composer', has_tags: tags.length > 0 });

      // Also save to cloud
      if (isAuthenticated()) {
        cloudWrite('saveLibrary', { title: title || 'Untitled', text }).catch(() => {});
      }
    } catch (err) {
      console.warn('[PromptPro]', err);
    }
  });

  contextAddBtn?.addEventListener('click', async () => {
    const title = (document.getElementById('context-title')?.value || '').trim();
    const content = (document.getElementById('context-body')?.value || '').trim();
    if (!content) return;

    // Enforce tier limit for context blocks
    const currentCount = (promptDb.contextBlocks || []).length;
    const limit = window.__promptProEntitlementSnapshot?.limits?.contextBlocks ?? 5;
    if (typeof limit === 'number' && currentCount >= limit) {
      if (typeof showUpgradeMessage === 'function') {
        showUpgradeMessage(`Limit reached (${limit} context blocks on ${window.__promptProEntitlementSnapshot?.tier || 'free'} tier). Upgrade for more!`, API_BASE + '/upgrade');
      }
      return;
    }

    try {
      const res = await sendBackground('ADD_CONTEXT_BLOCK', { title, content });
      if (res.promptDb) mergeDb(res.promptDb);
      const ti = document.getElementById('context-title');
      const tb = document.getElementById('context-body');
      if (ti) ti.value = '';
      if (tb) tb.value = '';
      renderTabContent('context');
      // Also save to cloud
      if (isAuthenticated()) {
        cloudWrite('addContext', { title: title || 'Context', content }).catch(() => {});
      }
    } catch (err) {
      console.warn('[PromptPro]', err);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // TAB CONTENT RENDERING (unchanged logic)
  // ═══════════════════════════════════════════════════════════════

  function renderTabContent(tabId) {
    if (!promptDb) return;

    if (tabId === 'history' && historyContent) {
      historyContent.innerHTML = '';
      const history = promptDb.history || [];
      if (history.length === 0) {
        historyContent.innerHTML = `
          <div class="popup__empty-state">
            <div class="popup__empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="popup__empty-title">No recent upgrades</div>
            <div class="popup__empty-subtext">Your upgraded prompts will appear here</div>
            <button type="button" class="popup__empty-btn" id="empty-history-btn">Upgrade your first prompt</button>
          </div>
        `;
        const actionBtn = document.getElementById('empty-history-btn');
        if (actionBtn) {
          actionBtn.addEventListener('click', () => {
            const homeNav = document.querySelector('.bottom-nav__item[data-tab="home"]');
            if (homeNav) homeNav.click();
          });
        }
        return;
      }

      function openDetailDrawer({ badgeText, timeText, originalText, upgradedText, historyIndex, historyItem }) {
        const drawerRoot = document.getElementById('detail-drawer-root');
        const badgeEl = document.getElementById('detail-drawer-badge');
        const timeEl = document.getElementById('detail-drawer-time');
        const contentEl = document.getElementById('detail-drawer-content');
        const actionsEl = document.getElementById('detail-drawer-actions');
        const closeBtn = document.getElementById('detail-drawer-close');
        const backdrop = document.getElementById('detail-drawer-backdrop');

        if (!drawerRoot) return;

        if (badgeText) {
          badgeEl.textContent = badgeText;
          badgeEl.style.display = 'inline-block';
        } else {
          badgeEl.style.display = 'none';
        }

        timeEl.textContent = timeText || '';
        contentEl.innerHTML = '';
        actionsEl.innerHTML = '';

        // Section 1: Complete Upgraded Prompt (Rendered Markdown)
        const upgradedSec = document.createElement('div');
        upgradedSec.className = 'detail-drawer__section';
        upgradedSec.innerHTML = `
          <div class="detail-drawer__section-header">
            <span class="detail-drawer__label">COMPLETE UPGRADED PROMPT</span>
          </div>
          <div class="detail-drawer__box detail-drawer__box--highlight">
            ${renderMarkdownToHtml(upgradedText || originalText)}
          </div>
        `;
        contentEl.appendChild(upgradedSec);

        // Section 2: Original Prompt (Plain Text)
        const originalSec = document.createElement('div');
        originalSec.className = 'detail-drawer__section';
        originalSec.innerHTML = `
          <div class="detail-drawer__section-header">
            <span class="detail-drawer__label">ORIGINAL PROMPT</span>
          </div>
          <div class="detail-drawer__box">
            ${originalText ? String(originalText).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '(No original prompt recorded)'}
          </div>
        `;
        contentEl.appendChild(originalSec);

        // ── 4-Icon Monotone Action Bar with Hover Tags ──
        // Action 1: Copy Upgraded (Tag: Copy Upg)
        const copyUpgWrap = document.createElement('div');
        copyUpgWrap.className = 'detail-drawer__action-wrapper';
        const copyUpgTag = document.createElement('span');
        copyUpgTag.className = 'detail-drawer__tag';
        copyUpgTag.textContent = 'Copy Upg';
        const copyUpgradedBtn = document.createElement('button');
        copyUpgradedBtn.type = 'button';
        copyUpgradedBtn.className = 'detail-drawer__action-btn';
        copyUpgradedBtn.setAttribute('aria-label', 'Copy Upgraded Prompt');
        const copyUpgIcon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
        const checkIcon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        copyUpgradedBtn.innerHTML = copyUpgIcon;
        copyUpgradedBtn.addEventListener('click', () => {
          if (typeof track === 'function') track('copy_clicked', { source: 'history', type: 'upgraded', score: historyItem?.score?.total || historyItem?.score || 0 });
          navigator.clipboard.writeText(upgradedText || originalText).then(() => {
            copyUpgradedBtn.innerHTML = checkIcon;
            copyUpgradedBtn.classList.add('detail-drawer__action-btn--success');
            copyUpgTag.textContent = 'Copied!';
            setTimeout(() => {
              copyUpgradedBtn.innerHTML = copyUpgIcon;
              copyUpgradedBtn.classList.remove('detail-drawer__action-btn--success');
              copyUpgTag.textContent = 'Copy Upg';
            }, 2000);
          }).catch(() => {});
        });
        copyUpgWrap.appendChild(copyUpgradedBtn);
        copyUpgWrap.appendChild(copyUpgTag);
        actionsEl.appendChild(copyUpgWrap);

        // Action 2: Copy Original (Tag: Copy Org)
        const copyOrgWrap = document.createElement('div');
        copyOrgWrap.className = 'detail-drawer__action-wrapper';
        const copyOrgTag = document.createElement('span');
        copyOrgTag.className = 'detail-drawer__tag';
        copyOrgTag.textContent = 'Copy Org';
        const copyOrigBtn = document.createElement('button');
        copyOrigBtn.type = 'button';
        copyOrigBtn.className = 'detail-drawer__action-btn';
        copyOrigBtn.setAttribute('aria-label', 'Copy Original Prompt');
        const copyOrgIcon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
        copyOrigBtn.innerHTML = copyOrgIcon;
        copyOrigBtn.addEventListener('click', () => {
          if (typeof track === 'function') track('copy_clicked', { source: 'history', type: 'original' });
          navigator.clipboard.writeText(originalText || upgradedText).then(() => {
            copyOrigBtn.innerHTML = checkIcon;
            copyOrigBtn.classList.add('detail-drawer__action-btn--success');
            copyOrgTag.textContent = 'Copied!';
            setTimeout(() => {
              copyOrigBtn.innerHTML = copyOrgIcon;
              copyOrigBtn.classList.remove('detail-drawer__action-btn--success');
              copyOrgTag.textContent = 'Copy Org';
            }, 2000);
          }).catch(() => {});
        });
        copyOrgWrap.appendChild(copyOrigBtn);
        copyOrgWrap.appendChild(copyOrgTag);
        actionsEl.appendChild(copyOrgWrap);

        // Action 3: Bookmark / Save to library (Tag: Save / Saved)
        const isAlreadySaved = (promptDb.library || []).some(
          l => (l.text === upgradedText || l.text === originalText)
        );
        const saveWrap = document.createElement('div');
        saveWrap.className = 'detail-drawer__action-wrapper';
        const saveTag = document.createElement('span');
        saveTag.className = 'detail-drawer__tag';
        saveTag.textContent = isAlreadySaved ? 'Saved' : 'Save';
        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.type = 'button';
        bookmarkBtn.className = `detail-drawer__action-btn ${isAlreadySaved ? 'detail-drawer__action-btn--active' : ''}`;
        bookmarkBtn.setAttribute('aria-label', isAlreadySaved ? 'Saved to library' : 'Save to library');
        const bookmarkIconOutline = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`;
        const bookmarkIconFilled = `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/><polyline points="9 10 12 13 16 9" stroke="#000" stroke-width="2" fill="none"/></svg>`;
        bookmarkBtn.innerHTML = isAlreadySaved ? bookmarkIconFilled : bookmarkIconOutline;
        
        bookmarkBtn.addEventListener('click', async () => {
          const textToSave = upgradedText || originalText;
          const titleToSave = (historyItem.site ? `${historyItem.site.charAt(0).toUpperCase() + historyItem.site.slice(1)} Prompt` : 'Saved Prompt');
          try {
            const res = await sendBackground('SAVE_LIBRARY_ENTRY', { title: titleToSave, text: textToSave, tags: ['history'] });
            if (res.promptDb) mergeDb(res.promptDb);
            bookmarkBtn.classList.add('detail-drawer__action-btn--active');
            bookmarkBtn.innerHTML = bookmarkIconFilled;
            saveTag.textContent = 'Saved!';
            
            if (typeof track === 'function' && !isAlreadySaved) track('snippet_saved', { source: 'history', has_tags: true });

            if (isAuthenticated()) {
              cloudWrite('saveLibrary', { title: titleToSave, text: textToSave }).catch(() => {});
            }
          } catch (err) {}
        });
        saveWrap.appendChild(bookmarkBtn);
        saveWrap.appendChild(saveTag);
        actionsEl.appendChild(saveWrap);

        // Action 4: Delete with 2-Stage Arm/Confirm (Tag: Delete / Delete?)
        const deleteWrap = document.createElement('div');
        deleteWrap.className = 'detail-drawer__action-wrapper';
        const deleteTag = document.createElement('span');
        deleteTag.className = 'detail-drawer__tag';
        deleteTag.textContent = 'Delete';
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'detail-drawer__action-btn detail-drawer__action-btn--danger';
        deleteBtn.setAttribute('aria-label', 'Delete from history');
        const trashIcon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
        const checkDeleteIcon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        deleteBtn.innerHTML = trashIcon;

        let isDeleteArmed = false;
        let deleteArmTimer = null;

        const disarmDelete = () => {
          isDeleteArmed = false;
          deleteBtn.classList.remove('detail-drawer__action-btn--armed');
          deleteBtn.innerHTML = trashIcon;
          deleteTag.textContent = 'Delete';
          if (deleteArmTimer) clearTimeout(deleteArmTimer);
        };

        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!isDeleteArmed) {
            isDeleteArmed = true;
            deleteBtn.classList.add('detail-drawer__action-btn--armed');
            deleteBtn.innerHTML = checkDeleteIcon;
            deleteTag.textContent = 'Confirm?';
            deleteArmTimer = setTimeout(disarmDelete, 3000);
          } else {
            // Second click: delete item
            disarmDelete();
            if (typeof historyIndex === 'number' && promptDb.history) {
              promptDb.history.splice(historyIndex, 1);
              chrome.storage.local.set({ promptDb });
              if (isAuthenticated() && historyItem && historyItem.id) {
                cloudWrite('deleteHistory', { id: historyItem.id }).catch(() => {});
              }
            }
            closeDrawer();
            renderTabContent('history');
          }
        });
        deleteWrap.appendChild(deleteBtn);
        deleteWrap.appendChild(deleteTag);
        actionsEl.appendChild(deleteWrap);

        const closeDrawer = () => {
          disarmDelete();
          drawerRoot.classList.remove('detail-drawer--open');
          drawerRoot.setAttribute('aria-hidden', 'true');
          drawerRoot.setAttribute('inert', '');
        };

        if (closeBtn) closeBtn.onclick = closeDrawer;
        if (backdrop) backdrop.onclick = closeDrawer;

        drawerRoot.removeAttribute('inert');
        drawerRoot.setAttribute('aria-hidden', 'false');
        drawerRoot.classList.add('detail-drawer--open');
      }

      const historyFrag = document.createDocumentFragment();
      history.slice(0, 15).forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'popup__history-row';

        const timeStr = formatRelativeTime(item.timestamp);

        const scoreVal =
          item.score != null && typeof item.score === 'object' && item.score.total != null
            ? item.score.total
            : (typeof item.score === 'number' ? item.score : 85);

        let scoreColor = '#30d158';
        let scoreBg = 'rgba(48, 209, 88, 0.15)';
        if (scoreVal < 70) {
          scoreColor = '#ff453a';
          scoreBg = 'rgba(255, 69, 58, 0.15)';
        } else if (scoreVal < 82) {
          scoreColor = '#ffd60a';
          scoreBg = 'rgba(255, 214, 10, 0.15)';
        }

        const modelName = item.site ? item.site.charAt(0).toUpperCase() + item.site.slice(1) : (item.model || 'ChatGPT');
        const upgradedText = item.text || item.upgraded || '';
        const originalText = item.originalText || item.original_prompt || item.original || item.prompt || item.text || '';

        const headerRow = document.createElement('div');
        headerRow.className = 'popup__history-header';

        const metaRow = document.createElement('div');
        metaRow.className = 'popup__history-meta';

        const modelChip = document.createElement('span');
        modelChip.className = 'popup__history-model';
        modelChip.textContent = modelName;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'popup__history-time';
        timeSpan.textContent = timeStr;

        metaRow.appendChild(modelChip);
        metaRow.appendChild(timeSpan);

        const rightRow = document.createElement('div');
        rightRow.className = 'popup__history-right';

        const scorePill = document.createElement('span');
        scorePill.className = 'popup__history-pill';
        scorePill.style.color = scoreColor;
        scorePill.style.background = scoreBg;
        scorePill.textContent = scoreVal;

        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'popup__history-arrow';
        arrowSpan.textContent = '›';

        rightRow.appendChild(scorePill);
        rightRow.appendChild(arrowSpan);

        headerRow.appendChild(metaRow);
        headerRow.appendChild(rightRow);

        const bodySpan = document.createElement('div');
        bodySpan.className = 'popup__history-body';
        bodySpan.textContent = upgradedText || originalText;

        el.appendChild(headerRow);
        el.appendChild(bodySpan);

        el.addEventListener('click', () => {
          openDetailDrawer({
            badgeText: `${modelName}  •  Score ${scoreVal}`,
            timeText: timeStr,
            originalText: originalText,
            upgradedText: upgradedText,
            historyIndex: index,
            historyItem: item
          });
        });

        historyFrag.appendChild(el);
      });
      historyContent.appendChild(historyFrag);
    } else if (tabId === 'library' && libraryContent) {
      libraryContent.innerHTML = '';
      const library = promptDb.library || [];
      if (library.length === 0) {
        libraryContent.innerHTML = `
          <div class="popup__empty-state">
            <div class="popup__empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div class="popup__empty-title">Your library is empty</div>
            <div class="popup__empty-subtext">Save prompts you use often to quickly reuse or inject them</div>
          </div>
        `;
        return;
      }
      const libFrag = document.createDocumentFragment();
      library.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'popup__library-row';

        const info = document.createElement('div');
        info.className = 'popup__library-info';

        const title = document.createElement('div');
        title.className = 'popup__library-title';
        title.textContent = item.title || 'Untitled';

        const text = document.createElement('div');
        text.className = 'popup__library-preview';
        text.textContent = item.text || '';

        info.appendChild(title);
        info.appendChild(text);

        const actions = document.createElement('div');
        actions.className = 'popup__context-actions';

        const leftActions = document.createElement('div');
        leftActions.style.display = 'flex';
        leftActions.style.alignItems = 'center';
        leftActions.style.gap = '6px';

        const injectBtn = document.createElement('button');
        injectBtn.type = 'button';
        injectBtn.className = 'popup__context-use-btn';
        injectBtn.textContent = 'Inject';
        injectBtn.title = 'Inject into Active Tab';
        injectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'INJECT_TEMPLATE',
                payload: { title: item.title, text: item.text }
              }, () => {
                if (chrome.runtime.lastError) {
                  navigator.clipboard.writeText(item.text || '').catch(() => {});
                  injectBtn.textContent = 'Copied!';
                } else {
                  injectBtn.textContent = 'Injected!';
                }
                setTimeout(() => { injectBtn.textContent = 'Inject'; }, 2000);
              });
            }
          });
        });

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'popup__context-use-btn';
        copyBtn.style.display = 'inline-flex';
        copyBtn.style.alignItems = 'center';
        copyBtn.style.gap = '4px';
        setCopyIcon(copyBtn, false);
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof track === 'function') track('copy_clicked', { source: 'library', type: 'snippet' });
          navigator.clipboard.writeText(item.text || '').then(() => {
            setCopyIcon(copyBtn, true);
            setTimeout(() => {
              setCopyIcon(copyBtn, false);
            }, 2000);
          }).catch(() => {});
        });

        leftActions.appendChild(injectBtn);
        leftActions.appendChild(copyBtn);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'popup__context-del-btn';
        delBtn.textContent = '✕';
        delBtn.title = 'Delete saved prompt';
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const ok = await showConfirmDrawer({
            title: 'Delete saved prompt?',
            description: 'This will remove the prompt from your library.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            destructive: true
          });
          if (!ok) return;
          promptDb.library.splice(index, 1);
          try {
            const res = await sendBackground('SAVE_PROMPTS', promptDb);
            if (res && res.promptDb) mergeDb(res.promptDb);
            renderTabContent('library');
            if (isAuthenticated() && item.id) {
              cloudWrite('deleteSnippet', { id: item.id }).catch(() => {});
            }
          } catch (err) {}
        });

        actions.appendChild(leftActions);
        actions.appendChild(delBtn);

        el.appendChild(info);
        el.appendChild(actions);

        libFrag.appendChild(el);
      });
      libraryContent.appendChild(libFrag);
    } else if (tabId === 'context' && contextList) {
      contextList.innerHTML = '';
      const blocks = promptDb.contextBlocks || [];
      if (blocks.length === 0) {
        contextList.innerHTML = `
          <div class="popup__empty-state">
            <div class="popup__empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            </div>
            <div class="popup__empty-title">No context blocks</div>
            <div class="popup__empty-subtext">Create reusable context blocks above to automatically merge into upgrades</div>
          </div>
        `;
        return;
      }
      blocks.forEach((block) => {
        const el = document.createElement('div');
        el.className = `popup__context-row ${block.active ? 'popup__context-row--active' : ''}`;

        const header = document.createElement('div');
        header.className = 'popup__context-header';

        const title = document.createElement('span');
        title.className = 'popup__context-title';
        title.textContent = block.title || 'Context';

        const statusChip = document.createElement('span');
        statusChip.className = `popup__context-status ${block.active ? 'popup__context-status--active' : ''}`;
        statusChip.textContent = block.active ? '[ Active ]' : 'Disabled';

        header.appendChild(title);
        header.appendChild(statusChip);

        const previewBox = document.createElement('div');
        previewBox.className = 'popup__context-preview';
        previewBox.textContent = block.content || '';

        const actions = document.createElement('div');
        actions.className = 'popup__context-actions';

        const useBtn = document.createElement('button');
        useBtn.type = 'button';
        useBtn.className = 'popup__context-use-btn';
        useBtn.textContent = block.active ? 'Enabled' : 'Enable';
        useBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            const res = await sendBackground('TOGGLE_CONTEXT_BLOCK', {
              id: block.id,
              active: !block.active
            });
            if (res.promptDb) mergeDb(res.promptDb);
            renderTabContent('context');
            if (isAuthenticated()) {
              cloudWrite('toggleContext', { id: block.id, active: !block.active }).catch(() => {});
            }
          } catch (err) {}
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'popup__context-del-btn';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const ok = await showConfirmDrawer({
            title: 'Delete context block?',
            description: 'It will no longer be merged into upgrades.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            destructive: true
          });
          if (!ok) return;
          try {
            const res = await sendBackground('DELETE_CONTEXT_BLOCK', { id: block.id });
            if (res.promptDb) mergeDb(res.promptDb);
            renderTabContent('context');
            if (isAuthenticated()) {
              cloudWrite('deleteContext', { id: block.id }).catch(() => {});
            }
          } catch (err) {}
        });

        const leftActions = document.createElement('div');
        leftActions.style.display = 'flex';
        leftActions.style.alignItems = 'center';
        leftActions.style.gap = '6px';

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'popup__context-use-btn';
        copyBtn.style.display = 'inline-flex';
        copyBtn.style.alignItems = 'center';
        copyBtn.style.gap = '4px';
        setCopyIcon(copyBtn, false);
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(block.content || '').then(() => {
            setCopyIcon(copyBtn, true);
            setTimeout(() => {
              setCopyIcon(copyBtn, false);
            }, 2000);
          }).catch(() => {});
        });

        leftActions.appendChild(useBtn);
        leftActions.appendChild(copyBtn);

        actions.appendChild(leftActions);
        actions.appendChild(delBtn);

        el.appendChild(header);
        el.appendChild(previewBox);
        el.appendChild(actions);

        contextList.appendChild(el);
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYWALL: Entitlement + Mode Selector (Shared Spec)
  // ═══════════════════════════════════════════════════════════════

  const MODE_INPUT_IDS = {
    quick: 'mode-opt-quick',
    advanced: 'mode-opt-advanced',
    max: 'mode-opt-max'
  };

  const MODE_TAB_IDS = {
    quick: 'mode-tab-quick',
    advanced: 'mode-tab-advanced',
    max: 'mode-tab-max'
  };

  let selectedOptimizeMode = 'quick'; // default to quick mode

  /**
   * Render entitlement state into the popup UI:
   * - Update Header plan badge (FREE, PLUS, MAX, ADMIN)
   * - Lock/unlock mode tabs based on allowedModes
   * - Update credit meter (Free: 50cr, Plus: 500cr, Max: 2000cr with dynamic countdown & refresh)
   * - Keep selectedOptimizeMode valid for current tier
   */
  function renderEntitlement(snapshot) {
    if (!snapshot) return;
    window.__promptProEntitlementSnapshot = snapshot;

    const tier = snapshot.tier || 'free';
    let isAdmin = !!snapshot.isAdmin;
    if (!isAdmin && authSession && authSession.user) {
      const uEmail = (authSession.user.email || '').toLowerCase();
      const uUsername = (authSession.user.username || '').toLowerCase();
      const uName = (authSession.user.name || '').toLowerCase();
      if (
        uUsername === 'admin-ceo' ||
        uUsername.includes('admin') ||
        uEmail.includes('shreshthabhushan19') ||
        uEmail.includes('shreshtha') ||
        uName.includes('shreshtha') ||
        authSession.user.role === 'admin'
      ) {
        isAdmin = true;
      }
    }
    const allowedModes = isAdmin ? ['quick', 'advanced', 'max'] : (snapshot.allowedModes || ['quick']);
    const creditsBalance = isAdmin ? 999999 : (snapshot.creditsBalance ?? (tier === 'max' ? 2000 : tier === 'plus' ? 500 : 50));
    const monthlyCredits = isAdmin ? 999999 : (snapshot.monthlyCredits || (tier === 'max' ? 2000 : tier === 'plus' ? 500 : 50));
    const creditsResetAt = snapshot.creditsResetAt || null;

    // ── 1. Header Plan Badge (FREE, PLUS, MAX, ADMIN) ──
    const planBadge = document.getElementById('header-plan-badge');
    if (planBadge) {
      if (isAdmin) {
        planBadge.textContent = 'ADMIN';
      } else if (tier === 'max') {
        planBadge.textContent = 'MAX';
      } else if (tier === 'plus') {
        planBadge.textContent = 'PLUS';
      } else {
        planBadge.textContent = 'FREE';
      }
      planBadge.style.display = 'inline-block';
    }

    // ── Update AI Engine Presentation (Tier-Aware) ──
    const aiTitle = document.getElementById('ai-engine-title');
    const aiSub = document.getElementById('ai-engine-subtext');
    if (aiTitle && aiSub) {
      if (isAdmin) {
        aiTitle.textContent = 'Ultra Optimization';
        aiSub.textContent = 'Unlimited frontier AI optimization';
      } else if (tier === 'max') {
        aiTitle.textContent = 'Ultra Optimization';
        aiSub.textContent = 'Premium frontier AI optimization';
      } else if (tier === 'plus') {
        aiTitle.textContent = 'Pro Optimization';
        aiSub.textContent = 'AI-powered prompt optimization';
      } else {
        aiTitle.textContent = 'Quick Optimization';
        aiSub.textContent = 'Fast AI prompt optimization (1 cr)';
      }
    }

    // ── 2. Mode tabs (quick, advanced, max) ──
    ['quick', 'advanced', 'max'].forEach(mode => {
      const input = document.getElementById(MODE_INPUT_IDS[mode]);
      const tab = document.getElementById(MODE_TAB_IDS[mode]);
      const lockEl = document.getElementById(`mode-lock-${mode}`);
      if (!tab) return;

      const isAllowed = isAdmin || allowedModes.includes(mode);

      if (isAllowed) {
        tab.classList.remove('popup__mode-tab--locked');
        if (input) input.disabled = false;
        if (lockEl) lockEl.style.display = 'none';
      } else {
        tab.classList.add('popup__mode-tab--locked');
        if (input) input.disabled = true;
        if (lockEl) lockEl.style.display = 'inline-block';
        // If currently selected mode is now locked, revert to quick
        if (selectedOptimizeMode === mode) {
          selectOptimizeMode('quick');
        }
      }
    });

    // ── 3. Usage Meter (Unified for Free 50cr, Plus 500cr, Max 2000cr) ──
    const meter = document.getElementById('credit-meter');
    const meterFill = document.getElementById('credit-meter-fill');
    const labelGroup = document.getElementById('credit-meter-label-group');

    if (meter) meter.style.display = 'flex';

    const countdownStr = formatResetCountdown(creditsResetAt);
    const ratio = monthlyCredits > 0 ? (creditsBalance / monthlyCredits) : 0;
    const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));

    if (isAdmin) {
      if (labelGroup) {
        labelGroup.innerHTML = `
          <span class="credit-meter__count" style="color:var(--text-primary);font-weight:600;">Unlimited (admin)</span>
        `;
      }
      if (meterFill) {
        meterFill.className = 'credit-meter__fill';
        meterFill.style.width = '100%';
      }
    } else if (creditsBalance <= 0) {
      // Exhausted: amber bar, "0 / {monthlyCredits} credits · resets in {countdown}" + Upgrade link
      if (meterFill) {
        meterFill.className = 'credit-meter__fill credit-meter__fill--exhausted';
        meterFill.style.width = '0%';
      }
      if (labelGroup) {
        labelGroup.innerHTML = `
          <span class="credit-meter__warning">0 / ${monthlyCredits.toLocaleString()} credits · resets ${countdownStr}</span>
          <a href="${API_BASE}/dashboard/billing" target="_blank" class="credit-meter__upgrade-link font-medium">Upgrade plan →</a>
        `;
      }
    } else if (ratio <= 0.20) {
      // Low: amber fill, appends "· running low"
      if (meterFill) {
        meterFill.className = 'credit-meter__fill credit-meter__fill--low';
        meterFill.style.width = pct + '%';
      }
      if (labelGroup) {
        labelGroup.innerHTML = `
          <span class="credit-meter__count">${creditsBalance.toLocaleString()} / ${monthlyCredits.toLocaleString()} credits</span>
          <span class="credit-meter__countdown">· resets ${countdownStr}</span>
          <span class="credit-meter__warning">· running low</span>
        `;
      }
    } else {
      // Normal: silver fill
      if (meterFill) {
        meterFill.className = 'credit-meter__fill';
        meterFill.style.width = pct + '%';
      }
      if (labelGroup) {
        labelGroup.innerHTML = `
          <span class="credit-meter__count">${creditsBalance.toLocaleString()} / ${monthlyCredits.toLocaleString()} credits</span>
          <span class="credit-meter__countdown">· resets ${countdownStr}</span>
        `;
      }
    }
  }

  /**
   * Switch the selected optimization mode radio input state and persist.
   */
  function selectOptimizeMode(mode) {
    if (selectedOptimizeMode !== mode && typeof track === 'function') {
      track('mode_selected', { mode, tier: window.__promptProEntitlementSnapshot?.tier || 'free' });
    }
    selectedOptimizeMode = mode;
    const input = document.getElementById(MODE_INPUT_IDS[mode]);
    if (input) {
      input.checked = true;
    }
    chrome.storage.local.set({ selectedOptimizeMode: mode });
  }

  /**
   * Show an inline upgrade message in the popup (never alert()).
   */
  function showUpgradeMessage(text, url) {
    const box = document.getElementById('upgrade-message');
    const textEl = document.getElementById('upgrade-message-text');
    const linkEl = document.getElementById('upgrade-message-link');
    if (!box || !textEl || !linkEl) return;

    textEl.textContent = text;
    linkEl.href = url || (API_BASE + '/dashboard/billing');
    linkEl.onclick = (e) => {
      e.preventDefault();
      if (typeof track === 'function') track('upgrade_link_clicked', { source: 'upgrade_message' });
      chrome.tabs.create({ url: linkEl.href });
    };
    box.style.display = 'flex';

    clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => { box.style.display = 'none'; }, 8000);
  }

  // ── Wire up mode tabs & inputs ──
  ['quick', 'advanced', 'max'].forEach((mode) => {
    const tab = document.getElementById(MODE_TAB_IDS[mode]);
    const input = document.getElementById(MODE_INPUT_IDS[mode]);
    if (!tab) return;

    tab.addEventListener('click', (e) => {
      if (tab.classList.contains('popup__mode-tab--locked')) {
        e.preventDefault();
        e.stopPropagation();
        const requiredTier = tab.dataset.requiredTier || (mode === 'max' ? 'max' : 'plus');
        
        if (typeof track === 'function') track('locked_mode_clicked', { mode_attempted: mode });

        showUpgradeMessage(
          `This mode requires ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} — upgrade to unlock it.`,
          `${API_BASE}/upgrade?tier=${requiredTier}`
        );
        return;
      }
      selectOptimizeMode(mode);
      const box = document.getElementById('upgrade-message');
      if (box) box.style.display = 'none';
    });

    input?.addEventListener('change', () => {
      if (input.checked) {
        selectOptimizeMode(mode);
      }
    });
  });

  // ── Refresh entitlement button ──
  const refreshBtn = document.getElementById('credit-meter-refresh');
  if (refreshBtn) {
    let isRefreshing = false;
    refreshBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isRefreshing) return;
      isRefreshing = true;
      refreshBtn.classList.add('spin');

      chrome.runtime.sendMessage({ type: 'REFRESH_ENTITLEMENT' }, (res) => {
        if (res && res.snapshot) {
          renderEntitlement(res.snapshot);
        }
        setTimeout(() => {
          refreshBtn.classList.remove('spin');
          isRefreshing = false;
        }, 500);
      });
    });
  }

  // ── Default Fallback Entitlement (Free: 50 credits, Quick mode only) ──
  const DEFAULT_ENTITLEMENT = {
    tier: 'free',
    planStatus: 'none',
    creditsBalance: 50,
    monthlyCredits: 50,
    creditsResetAt: null,
    allowedModes: ['quick'],
    features: ['basic_optimization', 'site_profiles', 'local_history'],
    isAdmin: false
  };

  // Immediately render default so mode locks and usage meter are NEVER missing from DOM
  renderEntitlement(DEFAULT_ENTITLEMENT);

  // ── Read cached snapshot & restore selected mode ──
  chrome.storage.local.get(['entitlementSnapshot', 'authSession', 'selectedOptimizeMode'], (result) => {
    if (result.selectedOptimizeMode && ['quick', 'advanced', 'max'].includes(result.selectedOptimizeMode)) {
      selectOptimizeMode(result.selectedOptimizeMode);
    }
    if (result.entitlementSnapshot) {
      renderEntitlement(result.entitlementSnapshot);
    }
    if (result.authSession && result.authSession.token) {
      chrome.runtime.sendMessage({ type: 'REFRESH_ENTITLEMENT' }, (res) => {
        if (res && res.snapshot) {
          renderEntitlement(res.snapshot);
        }
      });
    }
  });

  /**
   * Get the current optimize mode for use by the content script upgrade button.
   * Exposed via chrome.storage so content scripts can read it if needed.
   */
  window.__promptProGetOptimizeMode = () => selectedOptimizeMode;

})();

