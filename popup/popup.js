/**
 * PromptPro Popup Script (Phase 1)
 * Handles settings UI including tone presets.
 */

(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    defaultStrategy: 'enhance',
    defaultTone: null,
    showScoreBadge: true,
    enabled: true
  };

  const enabledToggle = document.getElementById('enabled-toggle');
  const scoreToggle = document.getElementById('score-toggle');
  const strategySelector = document.getElementById('strategy-selector');
  const toneSelector = document.getElementById('tone-selector');

  // ── Load Settings ─────────────────────────────────────
  chrome.storage.local.get(['settings'], (result) => {
    const settings = { ...DEFAULT_SETTINGS, ...result.settings };

    enabledToggle.checked = settings.enabled !== false;
    scoreToggle.checked = settings.showScoreBadge !== false;

    // Highlight active strategy
    const activeStrat = strategySelector.querySelector(
      `[data-strategy="${settings.defaultStrategy || 'enhance'}"]`
    );
    if (activeStrat) {
      strategySelector.querySelectorAll('.popup__strategy').forEach(b =>
        b.classList.remove('popup__strategy--active')
      );
      activeStrat.classList.add('popup__strategy--active');
    }

    // Highlight active tone (Dropdown)
    const activeToneItem = toneSelector.querySelector(
      `[data-tone="${settings.defaultTone || 'none'}"]`
    );
    const toneDisplay = document.getElementById('tone-display');
    if (activeToneItem && toneDisplay) {
      toneDisplay.textContent = activeToneItem.querySelector('span').textContent;
      toneSelector.querySelectorAll('.popup__dropdown-item').forEach(b =>
        b.classList.remove('popup__dropdown-item--active')
      );
      activeToneItem.classList.add('popup__dropdown-item--active');
    }
  });

  // ── Save Helper ───────────────────────────────────────
  function saveSettings(updates) {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = { ...DEFAULT_SETTINGS, ...result.settings, ...updates };
      chrome.storage.local.set({ settings });
    });
  }

  // ── Events ────────────────────────────────────────────

  enabledToggle.addEventListener('change', () => {
    saveSettings({ enabled: enabledToggle.checked });
  });

  scoreToggle.addEventListener('change', () => {
    saveSettings({ showScoreBadge: scoreToggle.checked });
  });

  strategySelector.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-strategy]');
    if (!btn) return;
    strategySelector.querySelectorAll('.popup__strategy').forEach(b =>
      b.classList.remove('popup__strategy--active')
    );
    btn.classList.add('popup__strategy--active');
    saveSettings({ defaultStrategy: btn.getAttribute('data-strategy') });
  });

  // Tone Dropdown Logic
  const toneTrigger = toneSelector.querySelector('.popup__dropdown-trigger');
  const toneDisplay = document.getElementById('tone-display');
  
  toneTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    toneSelector.classList.toggle('popup__dropdown--open');
  });

  document.addEventListener('click', (e) => {
    if (toneSelector && !toneSelector.contains(e.target)) {
      toneSelector.classList.remove('popup__dropdown--open');
    }
  });

  toneSelector.addEventListener('click', (e) => {
    const item = e.target.closest('.popup__dropdown-item');
    if (!item) return;
    
    toneSelector.querySelectorAll('.popup__dropdown-item').forEach(b =>
      b.classList.remove('popup__dropdown-item--active')
    );
    item.classList.add('popup__dropdown-item--active');
    
    if (toneDisplay) {
      toneDisplay.textContent = item.querySelector('span').textContent;
    }
    toneSelector.classList.remove('popup__dropdown--open');
    
    const tone = item.getAttribute('data-tone');
    saveSettings({ defaultTone: tone === 'none' ? null : tone });
  });
})();
