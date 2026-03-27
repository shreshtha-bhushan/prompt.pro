/**
 * PromptPro Popup Script (Phase 5 - Bottom Dock & Glass UI)
 */
(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    defaultStrategy: 'enhance',
    defaultTone: null,
    showScoreBadge: true,
    enabled: true,
    noFluff: false,
    siteMemory: true
  };

  const enabledToggle = document.getElementById('enabled-toggle');
  const scoreToggle = document.getElementById('score-toggle');
  const noFluffToggle = document.getElementById('no-fluff-toggle');
  const siteMemoryToggle = document.getElementById('site-memory-toggle');
  const strategyInputs = document.querySelectorAll('input[name="strategy"]');
  const toneSelector = document.getElementById('tone-dropdown');
  const toneDisplay = document.getElementById('current-tone');

  // Nav mapping
  const navItems = document.querySelectorAll('.bottom-nav__item');
  const tabPanes = document.querySelectorAll('.popup__tab-pane');
  const bottomNav = document.getElementById('bottom-nav');
  const navGlider = bottomNav?.querySelector('.bottom-nav__glider');
  
  // Content areas
  const historyContent = document.getElementById('history-content');
  const libraryContent = document.getElementById('library-content');
  const contextContent = document.getElementById('context-content');
  const historyClearBtn = document.getElementById('history-clear-btn');

  let promptDb = null;

  // ── Load Settings & DB ────────────────────────────────
  chrome.storage.local.get(['settings', 'promptDb'], (result) => {
    const settings = { ...DEFAULT_SETTINGS, ...result.settings };
    promptDb = result.promptDb || { history: [], library: [], contextBlocks: [] };

    // Standard Toggles
    if(enabledToggle) enabledToggle.checked = settings.enabled !== false;
    if(scoreToggle) scoreToggle.checked = settings.showScoreBadge !== false;
    if(noFluffToggle) noFluffToggle.checked = !!settings.noFluff;
    if(siteMemoryToggle) siteMemoryToggle.checked = settings.siteMemory !== false;

    // Strategy Radio
    const targetRadio = Array.from(strategyInputs).find(r => r.value === (settings.defaultStrategy || 'enhance'));
    if (targetRadio) targetRadio.checked = true;

    // Tone Dropdown
    const activeToneValue = settings.defaultTone || 'professional';
    const activeToneItem = toneSelector?.querySelector(`[data-value="${activeToneValue}"]`);
    if (activeToneItem && toneDisplay) {
      toneDisplay.textContent = activeToneItem.querySelector('span').textContent;
      toneSelector.querySelectorAll('.popup__dropdown-item').forEach(b => b.classList.remove('popup__dropdown-item--active'));
      activeToneItem.classList.add('popup__dropdown-item--active');
    }

    // Render DB areas
    renderTabContent('history');
    renderTabContent('library');
    renderTabContent('context');
  });

  // ── Save Helper ───────────────────────────────────────
  function saveSettings(updates) {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = { ...DEFAULT_SETTINGS, ...result.settings, ...updates };
      chrome.storage.local.set({ settings });
    });
  }

  // ── Nav Dock & Tab Switching ──────────────────────────
  function updateNavGlider(activeItem) {
    if (!navGlider || !activeItem) return;
    const rect = activeItem.getBoundingClientRect();
    const parentRect = bottomNav.getBoundingClientRect();
    navGlider.style.transform = `translateX(${rect.left - parentRect.left}px)`;
    navGlider.style.width = `${rect.width}px`;
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-tab');

      // Update Dock UI
      navItems.forEach(nav => nav.classList.remove('bottom-nav__item--active'));
      item.classList.add('bottom-nav__item--active');
      
      // Update Tabs visibility
      tabPanes.forEach(pane => {
        if (pane.id === `tab-${targetId}`) {
          pane.classList.add('popup__tab-pane--active');
        } else {
          pane.classList.remove('popup__tab-pane--active');
        }
      });
      
      // Update Glider (wait for CSS expansion)
      setTimeout(() => updateNavGlider(item), 150);

      // Lazy render
      renderTabContent(targetId);
    });
  });

  // Initial glider position
  window.addEventListener('load', () => {
    setTimeout(() => {
      const active = document.querySelector('.bottom-nav__item--active');
      if (active) updateNavGlider(active);
    }, 200);
  });

  // ── Form Events ───────────────────────────────────────

  enabledToggle?.addEventListener('change', () => {
    saveSettings({ enabled: enabledToggle.checked });
  });

  scoreToggle?.addEventListener('change', () => {
    saveSettings({ showScoreBadge: scoreToggle.checked });
  });

  noFluffToggle?.addEventListener('change', () => {
    saveSettings({ noFluff: noFluffToggle.checked });
  });

  siteMemoryToggle?.addEventListener('change', () => {
    saveSettings({ siteMemory: siteMemoryToggle.checked });
  });

  // Liquid Glass radio listeners
  strategyInputs.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        saveSettings({ defaultStrategy: e.target.value });
      }
    });
  });

  // Tone Dropdown Logic
  const toneTrigger = toneSelector?.querySelector('.popup__dropdown-trigger');
  const toneMenu = toneSelector?.querySelector('.popup__dropdown-menu');

  toneTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = toneSelector.classList.toggle('popup__dropdown--open');
    
    if (isOpen && toneMenu) {
      // Smooth scroll to active item
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
    
    toneSelector.querySelectorAll('.popup__dropdown-item').forEach(b =>
      b.classList.remove('popup__dropdown-item--active')
    );
    item.classList.add('popup__dropdown-item--active');
    
    if (toneDisplay) toneDisplay.textContent = item.querySelector('span').textContent;
    toneSelector.classList.remove('popup__dropdown--open');
    
    const tone = item.getAttribute('data-value');
    saveSettings({ defaultTone: tone });
  });

  // ── Render DB Logic ───────────────────────────────────

  historyClearBtn?.addEventListener('click', () => {
    if (promptDb) {
      promptDb.history = [];
      chrome.storage.local.set({ promptDb });
      renderTabContent('history');
    }
  });

  function renderTabContent(tabId) {
    if (!promptDb) return;
    
    if (tabId === 'history' && historyContent) {
      historyContent.innerHTML = '';
      const history = promptDb.history || [];
      if (history.length === 0) {
        historyContent.innerHTML = '<div style="color:#86868b;font-size:11px;padding:10px;">No recent upgrades yet.</div>';
        return;
      }
      history.slice(0, 15).forEach(item => {
        const el = document.createElement('div');
        el.className = 'sidebar__item';
        
        const mins = Math.round((Date.now() - item.timestamp) / 60000);
        const timeStr = isNaN(mins) ? 'Recently' : (mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`);
        const pts = item.score ? ` · <span style="color:#30d158;">+${item.score}</span> pts` : '';
        
        el.innerHTML = `
          <div class="sidebar__item-title" style="font-size:11px;color:#86868b;margin-bottom:6px;">${timeStr}${pts}</div>
          <div class="sidebar__item-text">${item.text}</div>
        `;
        historyContent.appendChild(el);
      });
    } 
    else if (tabId === 'library' && libraryContent) {
      libraryContent.innerHTML = '';
      const library = promptDb.library || [];
      if (library.length === 0) {
        libraryContent.innerHTML = '<div style="color:#86868b;font-size:11px;padding:10px;">Your library is empty.</div>';
        return;
      }
      library.forEach(item => {
        const el = document.createElement('div');
        el.className = 'sidebar__item';
        el.innerHTML = `
          <div class="sidebar__item-title">${item.title}</div>
          <div class="sidebar__item-text">${item.text}</div>
        `;
        libraryContent.appendChild(el);
      });
    }
    else if (tabId === 'context' && contextContent) {
      contextContent.innerHTML = '';
      const blocks = promptDb.contextBlocks || [];
      if (blocks.length === 0) {
        contextContent.innerHTML = '<div style="color:#86868b;font-size:11px;padding:10px;">No context blocks set.</div>';
        return;
      }
      blocks.forEach(block => {
        const el = document.createElement('div');
        el.className = `sidebar__item ${block.active ? 'sidebar__context-active' : ''}`;
        el.innerHTML = `
          <div class="sidebar__item-title">${block.title}</div>
          <div class="sidebar__item-text">${block.content}</div>
        `;
        
        el.addEventListener('click', () => {
          block.active = !block.active;
          chrome.storage.local.set({ promptDb });
          el.classList.toggle('sidebar__context-active', block.active);
        });
        
        contextContent.appendChild(el);
      });
    }
  }

})();
