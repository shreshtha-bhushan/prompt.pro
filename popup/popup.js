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

    // Highlight active tone
    const activeTone = toneSelector.querySelector(
      `[data-tone="${settings.defaultTone || 'none'}"]`
    );
    if (activeTone) {
      toneSelector.querySelectorAll('.popup__tone').forEach(b =>
        b.classList.remove('popup__tone--active')
      );
      activeTone.classList.add('popup__tone--active');
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

  toneSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tone]');
    if (!btn) return;
    toneSelector.querySelectorAll('.popup__tone').forEach(b =>
      b.classList.remove('popup__tone--active')
    );
    btn.classList.add('popup__tone--active');
    const tone = btn.getAttribute('data-tone');
    saveSettings({ defaultTone: tone === 'none' ? null : tone });
  });
})();
