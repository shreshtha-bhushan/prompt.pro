/**
 * Button Injector
 * Injects the PromptPro "✨ Upgrade" button into the AI chat toolbar.
 * 
 * STRATEGY: Always anchor to the send button's parent container.
 * The button is inserted as a sibling — never absolutely positioned
 * relative to the viewport.
 */

export const BUTTON_ID = 'promptpro-upgrade-btn';
export const DROPDOWN_ID = 'promptpro-dropdown';

/**
 * Check if the button is already injected in the DOM.
 * @returns {boolean}
 */
export function isInjected() {
  return !!document.getElementById(BUTTON_ID);
}

/**
 * Create the PromptPro button element.
 * @param {Function} onClick - Click handler
 * @returns {HTMLButtonElement}
 */
function createButton(onClick) {
  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.className = 'promptpro-btn';
  btn.type = 'button'; // Prevent form submission
  btn.setAttribute('data-promptpro', 'true');
  btn.title = 'Upgrade prompt with PromptPro';

  // Icon + label (no innerHTML for dynamic content)
  const icon = document.createElement('span');
  icon.className = 'promptpro-btn__icon';
  icon.textContent = '✨';

  const label = document.createElement('span');
  label.className = 'promptpro-btn__label';
  label.textContent = 'Upgrade';

  btn.appendChild(icon);
  btn.appendChild(label);

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });

  return btn;
}

/**
 * Create the strategy dropdown menu.
 * @param {Function} onSelect - Called with strategy name
 * @returns {HTMLDivElement}
 */
function createDropdown(onSelect) {
  const dropdown = document.createElement('div');
  dropdown.id = DROPDOWN_ID;
  dropdown.className = 'promptpro-dropdown';

  const strategies = [
    { id: 'enhance', label: '🚀 Enhance', desc: 'Add structure & context' },
    { id: 'elaborate', label: '📝 Elaborate', desc: 'Step-by-step reasoning' },
    { id: 'concise', label: '⚡ Concise', desc: 'Tighten & focus' }
  ];

  for (const strat of strategies) {
    const item = document.createElement('button');
    item.className = 'promptpro-dropdown__item';
    item.type = 'button';
    item.setAttribute('data-strategy', strat.id);

    const itemLabel = document.createElement('span');
    itemLabel.className = 'promptpro-dropdown__item-label';
    itemLabel.textContent = strat.label;

    const itemDesc = document.createElement('span');
    itemDesc.className = 'promptpro-dropdown__item-desc';
    itemDesc.textContent = strat.desc;

    item.appendChild(itemLabel);
    item.appendChild(itemDesc);

    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.classList.remove('promptpro-dropdown--visible');
      onSelect(strat.id);
    });

    dropdown.appendChild(item);
  }

  return dropdown;
}

/**
 * Create the score badge element.
 * @returns {HTMLDivElement}
 */
function createScoreBadge() {
  const badge = document.createElement('div');
  badge.id = 'promptpro-score-badge';
  badge.className = 'promptpro-score-badge';
  badge.style.display = 'none';
  return badge;
}

/**
 * Inject the PromptPro button into the page.
 * Anchors relative to the send button or toolbar — never viewport-absolute.
 * 
 * @param {import('../adapters/base-adapter.js').BaseSiteAdapter} adapter
 * @param {Function} onUpgrade - Called with strategy when upgrade is requested
 */
export function injectButton(adapter, onUpgrade) {
  // Guard: don't double-inject
  if (isInjected()) return;

  const sendButton = adapter.getSendButton();
  const toolbar = adapter.getToolbar();

  // Create the button with a default click that opens the dropdown
  const btn = createButton(() => {
    // Toggle dropdown
    const dd = document.getElementById(DROPDOWN_ID);
    if (dd) {
      dd.classList.toggle('promptpro-dropdown--visible');
    }
  });

  // Create dropdown
  const dropdown = createDropdown((strategy) => {
    onUpgrade(strategy);
  });

  // Create score badge
  const badge = createScoreBadge();

  // Create a container so button + dropdown are a single unit
  const container = document.createElement('div');
  container.className = 'promptpro-container';
  container.appendChild(btn);
  container.appendChild(dropdown);
  container.appendChild(badge);

  // INJECTION STRATEGY:
  if (sendButton?.parentElement) {
    // Strategy 1: Insert as sibling, right before the send button
    sendButton.parentElement.insertBefore(container, sendButton);
  } else if (toolbar) {
    // Strategy 2: Append to toolbar container
    toolbar.appendChild(container);
  }
  // else: neither found — MutationObserver will retry later

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const dd = document.getElementById(DROPDOWN_ID);
    if (dd && !container.contains(e.target)) {
      dd.classList.remove('promptpro-dropdown--visible');
    }
  }, { capture: true });
}

/**
 * Remove the injected button from the DOM.
 */
export function removeButton() {
  const container = document.querySelector('.promptpro-container');
  container?.remove();
}

/**
 * Update the score badge with before/after scores.
 * @param {{ before: number, after: number }} score
 */
export function showScoreBadge(score) {
  const badge = document.getElementById('promptpro-score-badge');
  if (!badge) return;

  const delta = score.after - score.before;
  const sign = delta > 0 ? '+' : '';

  badge.textContent = `${score.before} → ${score.after} (${sign}${delta})`;
  badge.style.display = 'inline-flex';
  badge.className = `promptpro-score-badge ${delta > 0 ? 'promptpro-score-badge--improved' : ''}`;

  // Auto-hide after 5 seconds
  setTimeout(() => {
    badge.style.display = 'none';
  }, 5000);
}
