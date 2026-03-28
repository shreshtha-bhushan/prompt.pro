/**
 * PromptPro Popup — settings + History / Library / Context pipelines (chrome.storage.local + service worker)
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

  let promptDb = null;

  /**
   * Bottom-sheet confirmation (shadcn/vaul-style UX without React).
   * For the full React + Tailwind implementation see web/src/components/ui/confirm-drawer.tsx
   */
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

        // Never set aria-hidden while a descendant still has focus (Chrome a11y).
        requestAnimationFrame(() => {
          root.setAttribute('aria-hidden', 'true');
          if ('inert' in root) root.inert = true;
          else root.setAttribute('inert', '');
          resolve(value);
        });
      }

      function onOk() {
        finish(true);
      }
      function onCancel() {
        finish(false);
      }
      function onBackdrop() {
        finish(false);
      }
      function onKey(e) {
        if (e.key === 'Escape') finish(false);
      }

      if ('inert' in root) root.inert = false;
      else root.removeAttribute('inert');
      root.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => {
        root.classList.add('confirm-drawer--open');
        setTimeout(() => {
          try {
            okBtn.focus();
          } catch (e) {
            /* ignore */
          }
        }, 50);
      });

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      backdrop.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
    });
  }

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

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.promptDb) return;
    mergeDb(changes.promptDb.newValue);
    renderTabContent('history');
    renderTabContent('library');
    renderTabContent('context');
  });

  chrome.storage.local.get(['settings', 'promptDb'], (result) => {
    const settings = { ...DEFAULT_SETTINGS, ...result.settings };
    promptDb = result.promptDb || { history: [], library: [], contextBlocks: [], historyLimit: 50 };

    if (enabledToggle) enabledToggle.checked = settings.enabled !== false;
    if (scoreToggle) scoreToggle.checked = settings.showScoreBadge !== false;
    if (noFluffToggle) noFluffToggle.checked = !!settings.noFluff;
    if (siteMemoryToggle) siteMemoryToggle.checked = settings.siteMemory !== false;

    const targetRadio = Array.from(strategyInputs).find((r) => r.value === (settings.defaultStrategy || 'enhance'));
    if (targetRadio) targetRadio.checked = true;

    const activeToneValue = settings.defaultTone || 'professional';
    const activeToneItem = toneSelector?.querySelector(`[data-value="${activeToneValue}"]`);
    if (activeToneItem && toneDisplay) {
      toneDisplay.textContent = activeToneItem.querySelector('span').textContent;
      toneSelector.querySelectorAll('.popup__dropdown-item').forEach((b) => b.classList.remove('popup__dropdown-item--active'));
      activeToneItem.classList.add('popup__dropdown-item--active');
    }

    renderTabContent('history');
    renderTabContent('library');
    renderTabContent('context');
  });

  function saveSettings(updates) {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = { ...DEFAULT_SETTINGS, ...result.settings, ...updates };
      chrome.storage.local.set({ settings });
    });
  }

  function updateNavGlider(activeItem) {
    if (!navGlider || !activeItem) return;
    const rect = activeItem.getBoundingClientRect();
    const parentRect = bottomNav.getBoundingClientRect();
    navGlider.style.transform = `translateX(${rect.left - parentRect.left}px)`;
    navGlider.style.width = `${rect.width}px`;
  }

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-tab');

      navItems.forEach((nav) => nav.classList.remove('bottom-nav__item--active'));
      item.classList.add('bottom-nav__item--active');

      tabPanes.forEach((pane) => {
        if (pane.id === `tab-${targetId}`) {
          pane.classList.add('popup__tab-pane--active');
        } else {
          pane.classList.remove('popup__tab-pane--active');
        }
      });

      setTimeout(() => updateNavGlider(item), 150);
      renderTabContent(targetId);
    });
  });

  window.addEventListener('load', () => {
    setTimeout(() => {
      const active = document.querySelector('.bottom-nav__item--active');
      if (active) updateNavGlider(active);
    }, 200);
  });

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

  strategyInputs.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        saveSettings({ defaultStrategy: e.target.value });
      }
    });
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
    } catch (err) {
      console.warn('[PromptPro]', err);
    }
  });

  libraryAddBtn?.addEventListener('click', async () => {
    const title = (libraryTitle?.value || '').trim();
    const text = (libraryText?.value || '').trim();
    const tagsRaw = (libraryTags?.value || '').trim();
    if (!text) return;

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
    } catch (err) {
      console.warn('[PromptPro]', err);
    }
  });

  contextAddBtn?.addEventListener('click', async () => {
    const title = (document.getElementById('context-title')?.value || '').trim();
    const content = (document.getElementById('context-body')?.value || '').trim();
    if (!content) return;

    try {
      const res = await sendBackground('ADD_CONTEXT_BLOCK', { title, content });
      if (res.promptDb) mergeDb(res.promptDb);
      const ti = document.getElementById('context-title');
      const tb = document.getElementById('context-body');
      if (ti) ti.value = '';
      if (tb) tb.value = '';
      renderTabContent('context');
    } catch (err) {
      console.warn('[PromptPro]', err);
    }
  });

  function renderTabContent(tabId) {
    if (!promptDb) return;

    if (tabId === 'history' && historyContent) {
      historyContent.innerHTML = '';
      const history = promptDb.history || [];
      if (history.length === 0) {
        historyContent.innerHTML =
          '<div style="color:#86868b;font-size:11px;padding:10px;">No recent upgrades yet.</div>';
        return;
      }
      history.slice(0, 15).forEach((item) => {
        const el = document.createElement('div');
        el.className = 'sidebar__item';

        const mins = Math.round((Date.now() - item.timestamp) / 60000);
        const timeStr = Number.isNaN(mins)
          ? 'Recently'
          : mins < 60
            ? `${mins}m ago`
            : `${Math.floor(mins / 60)}h ago`;
        const scoreLabel =
          item.score != null && typeof item.score === 'object' && item.score.total != null
            ? item.score.total
            : item.score;

        const meta = document.createElement('div');
        meta.className = 'sidebar__item-title';
        meta.style.fontSize = '11px';
        meta.style.color = '#86868b';
        meta.style.marginBottom = '6px';
        meta.textContent =
          scoreLabel != null ? `${timeStr} · quality ${scoreLabel}` : timeStr;

        const body = document.createElement('div');
        body.className = 'sidebar__item-text';
        body.textContent = item.text || '';

        el.appendChild(meta);
        el.appendChild(body);
        historyContent.appendChild(el);
      });
    } else if (tabId === 'library' && libraryContent) {
      libraryContent.innerHTML = '';
      const library = promptDb.library || [];
      if (library.length === 0) {
        libraryContent.innerHTML =
          '<div style="color:#86868b;font-size:11px;padding:10px;">Your library is empty.</div>';
        return;
      }
      library.forEach((item) => {
        const el = document.createElement('div');
        el.className = 'sidebar__item';

        const title = document.createElement('div');
        title.className = 'sidebar__item-title';
        title.textContent = item.title || 'Untitled';

        const text = document.createElement('div');
        text.className = 'sidebar__item-text';
        text.textContent = item.text || '';

        const actions = document.createElement('div');
        actions.className = 'sidebar__item-actions';

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'sidebar__mini-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(item.text || '').catch(() => {});
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'sidebar__mini-btn sidebar__mini-btn--danger';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const ok = await showConfirmDrawer({
            title: 'Delete library entry?',
            description: 'This removes the saved prompt from your library. This cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            destructive: true
          });
          if (!ok) return;
          try {
            const res = await sendBackground('DELETE_LIBRARY_ENTRY', { id: item.id });
            if (res.promptDb) mergeDb(res.promptDb);
            renderTabContent('library');
          } catch (err) {
            console.warn('[PromptPro]', err);
          }
        });

        actions.appendChild(copyBtn);
        actions.appendChild(delBtn);

        el.appendChild(title);
        el.appendChild(text);
        if (item.tags && item.tags.length) {
          const tags = document.createElement('div');
          tags.style.fontSize = '10px';
          tags.style.color = 'rgba(255,255,255,0.35)';
          tags.style.marginTop = '6px';
          tags.textContent = item.tags.join(' · ');
          el.appendChild(tags);
        }
        el.appendChild(actions);
        libraryContent.appendChild(el);
      });
    } else if (tabId === 'context' && contextList) {
      contextList.innerHTML = '';
      const blocks = promptDb.contextBlocks || [];
      if (blocks.length === 0) {
        contextList.innerHTML =
          '<div style="color:#86868b;font-size:11px;padding:10px;">No context blocks. Add reusable context for upgrades.</div>';
        return;
      }
      blocks.forEach((block) => {
        const el = document.createElement('div');
        el.className = `sidebar__item ${block.active ? 'sidebar__context-active' : ''}`;

        const title = document.createElement('div');
        title.className = 'sidebar__item-title';
        title.textContent = block.title || 'Context';

        const content = document.createElement('div');
        content.className = 'sidebar__item-text';
        content.textContent = block.content || '';

        const actions = document.createElement('div');
        actions.className = 'sidebar__item-actions';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'sidebar__mini-btn';
        toggleBtn.textContent = block.active ? 'Active · turn off' : 'Use in upgrades';
        toggleBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            const res = await sendBackground('TOGGLE_CONTEXT_BLOCK', {
              id: block.id,
              active: !block.active
            });
            if (res.promptDb) mergeDb(res.promptDb);
            renderTabContent('context');
          } catch (err) {
            console.warn('[PromptPro]', err);
          }
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'sidebar__mini-btn sidebar__mini-btn--danger';
        delBtn.textContent = 'Delete';
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
          } catch (err) {
            console.warn('[PromptPro]', err);
          }
        });

        actions.appendChild(toggleBtn);
        actions.appendChild(delBtn);

        el.appendChild(title);
        el.appendChild(content);
        el.appendChild(actions);
        contextList.appendChild(el);
      });
    }
  }
})();
