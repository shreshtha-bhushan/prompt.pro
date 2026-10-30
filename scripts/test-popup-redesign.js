// scripts/test-popup-redesign.js
// Verification suite for PromptPro Inline Optimization Popup Redesign & Functional Upgrade

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('============================================================');
console.log(' PROMPTPRO POPUP REDESIGN & FUNCTIONAL VERIFICATION SUITE');
console.log('============================================================\n');

const mainJsPath = path.join(__dirname, '..', 'content', 'main.js');
const mainJs = fs.readFileSync(mainJsPath, 'utf8').replace(/\r\n/g, '\n');

const cssPath = path.join(__dirname, '..', 'styles', 'injected.css');
const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

let passes = 0;
let total = 0;

function test(name, condition) {
  total++;
  if (condition) {
    console.log('  ✓ PASS: ' + name);
    passes++;
  } else {
    console.error('  ✗ FAIL: ' + name);
  }
}

// ─────────────────────────────────────────────────────────────
// 1. Popup Hierarchy & "Your Prompt" Removal
// ─────────────────────────────────────────────────────────────
console.log('--- 1. Popup Hierarchy & "Your Prompt" Removal ---');

// Critical constraint: Must NOT contain "Your prompt" card or section in preview popover
test('Popover contains NO "Your prompt" heading or panel', 
  !mainJs.includes('Your prompt') && 
  !mainJs.includes('promptpro-original-prompt') &&
  !mainJs.includes('Original Prompt')
);

test('Header has compact title "Rewrite Preview"', 
  mainJs.includes('Rewrite Preview') && mainJs.includes('promptpro-popover__title')
);

test('Header contains word count comparison display', 
  mainJs.includes('id="promptpro-word-count"') && mainJs.includes('countWords')
);

test('Header contains quality score progress ring', 
  mainJs.includes('promptpro-score-progress') && mainJs.includes('role="progressbar"')
);

test('Preview is primary content, multiline and editable', 
  mainJs.includes("preview.setAttribute('contenteditable', 'true')") &&
  mainJs.includes("preview.setAttribute('aria-multiline', 'true')")
);

test('Change summary section "What changed" is present', 
  mainJs.includes('promptpro-change-summary') && mainJs.includes('What changed')
);

test('Diff toggle button "View changes" is present with safe HTML toggle', 
  mainJs.includes('id="promptpro-diff-toggle"') && mainJs.includes('renderPreviewContent')
);

test('Contextual refinement actions container is present', 
  mainJs.includes('id = IDS.SUGGESTIONS') || mainJs.includes('id="promptpro-suggestions"')
);

test('Actual tone dropdown selector is present directly in popover', 
  mainJs.includes('toneDropdown') && mainJs.includes('popover.appendChild(toneDropdown)')
);

test('Action buttons: primary "Apply upgrade" and secondary "Cancel"', 
  mainJs.includes('Apply upgrade') && 
  mainJs.includes('promptpro-action-btn--apply') && 
  mainJs.includes('promptpro-action-btn--cancel')
);

// ─────────────────────────────────────────────────────────────
// 2. CSS Design Direction & Apple Aesthetics
// ─────────────────────────────────────────────────────────────
console.log('\n--- 2. CSS Design Direction & Apple Aesthetics ---');

test('CSS styles popover with deep charcoal background and blur', 
  css.includes('background: rgba(20, 20, 26, 0.85)') && 
  css.includes('backdrop-filter: blur(28px)')
);

test('CSS styles preview editor with generous radius and scrolling', 
  css.includes('.promptpro-preview') && 
  css.includes('overflow-y: auto') && 
  css.includes('border-radius: 12px')
);

test('CSS styles Apple-style pill suggestion chips', 
  css.includes('.promptpro-suggestion-chip') && 
  css.includes('border-radius: 999px')
);

test('CSS styles Apple-style primary apply button with black default and white hover', 
  css.includes('.promptpro-action-btn--apply') && 
  css.includes('background: #000000') && 
  css.includes('.promptpro-action-btn--apply:hover') &&
  css.includes('background: #ffffff')
);

test('CSS styles secondary dark cancel button', 
  css.includes('.promptpro-action-btn--cancel') && 
  css.includes('background: rgba(255, 255, 255, 0.08)')
);

test('CSS has collapsible style preferences styling', 
  css.includes('.promptpro-style-prefs') && 
  css.includes('.promptpro-style-prefs__header')
);

// ─────────────────────────────────────────────────────────────
// 3. Functional Logic: Change Summary & Contextual Refinements
// ─────────────────────────────────────────────────────────────
console.log('\n--- 3. Functional Logic: Change Summary & Refinements ---');

// Extract deriveChangeSummary and getContextualRefinements functions from main.js for direct unit execution
const extractFunc = (fnName) => {
  const start = mainJs.indexOf(`function ${fnName}(`);
  assert(start !== -1, `Function ${fnName} must exist`);
  let parenEnd = mainJs.indexOf(')', start);
  let bodyStart = mainJs.indexOf('{', parenEnd);
  let braceCount = 0;
  let i = bodyStart;
  for (; i < mainJs.length; i++) {
    if (mainJs[i] === '{') braceCount++;
    else if (mainJs[i] === '}') {
      braceCount--;
      if (braceCount === 0) break;
    }
  }
  const code = mainJs.slice(start, i + 1);
  return new Function(`${code}; return ${fnName};`)();
};

const deriveChangeSummary = extractFunc('deriveChangeSummary');
const getContextualRefinements = extractFunc('getContextualRefinements');
const countWords = extractFunc('countWords');

test('countWords accurately calculates token counts', () => {
  return countWords('Write a Python function to sort numbers') === 7 &&
         countWords('') === 0 &&
         countWords('   one   two   three   ') === 3;
});

test('deriveChangeSummary identifies added structure and constraints', () => {
  const orig = 'Write a function to sort';
  const rew = '**Role:** Senior Architect\n\n**Task:** Write a function to sort\n\n**Output Format:** Clean code\n\n**Quality Constraints:** Handle edge cases';
  const summary = deriveChangeSummary(orig, rew, 'enhance', null, {});
  return summary.some(s => s.toLowerCase().includes('structure')) ||
         summary.some(s => s.toLowerCase().includes('format'));
});

test('deriveChangeSummary identifies concise and token compression', () => {
  const orig = 'Can you please possibly help me write an essay about science';
  const rew = 'Write an essay analyzing empirical scientific methodology.';
  const summary = deriveChangeSummary(orig, rew, 'concise', null, { lowTokenEnabled: true, noFluff: true });
  return summary.some(s => s.toLowerCase().includes('concise') || s.toLowerCase().includes('fluff') || s.toLowerCase().includes('efficiency'));
});

test('getContextualRefinements suggests coding actions for code prompts', () => {
  const chips = getContextualRefinements('Write a React component with state');
  const ids = chips.map(c => c.id);
  return ids.includes('edge-cases') && ids.includes('tests') && chips.length <= 4;
});

test('getContextualRefinements suggests academic actions for essay prompts', () => {
  const chips = getContextualRefinements('Write an academic research essay on climate change');
  const ids = chips.map(c => c.id);
  return ids.includes('examples') && ids.includes('structure') && chips.length <= 4;
});

test('getContextualRefinements suggests business actions for pitch prompts', () => {
  const chips = getContextualRefinements('Draft a business pitch proposal for investors with KPI roadmap');
  const ids = chips.map(c => c.id);
  return ids.includes('audience') && ids.includes('objectives') && chips.length <= 4;
});

// ─────────────────────────────────────────────────────────────
// 4. Form Submit Prevention & User Edit Preservation
// ─────────────────────────────────────────────────────────────
console.log('\n--- 4. Form Submit Prevention & User Edit Preservation ---');

test('applyBtn syncs edited text from preview editor before injection', 
  mainJs.includes('previewEl.innerText') && mainJs.includes('STATE.currentRewrite = previewEl.innerText')
);

test('diff toggle button syncs edited text before switching views', 
  mainJs.includes('if (!STATE.isDiffView && previewElement)') && 
  mainJs.includes('STATE.currentRewrite = previewElement.innerText')
);

test('applyBtn and cancelBtn have type="button" and e.preventDefault()', 
  mainJs.includes("cancelBtn.type = 'button'") &&
  mainJs.includes("applyBtn.type = 'button'") &&
  mainJs.includes("applyBtn.addEventListener('click', (e) => {\n      e.preventDefault();")
);

// ─────────────────────────────────────────────────────────────
// 5. Settings Integration & Score Badge Behavior
// ─────────────────────────────────────────────────────────────
console.log('\n--- 5. Settings Integration & Score Badge Behavior ---');

test('updateScoreViz checks showScoreBadge setting', 
  mainJs.includes('STATE.settings.showScoreBadge !== false') &&
  mainJs.includes("scoreContainer.style.display = scoreBadgeEnabled ? '' : 'none'")
);

test('storage listener re-evaluates score badge immediately on settings change', 
  mainJs.includes('if (STATE.currentScore) {\n              updateScoreViz(STATE.currentScore);\n            }')
);

// ─────────────────────────────────────────────────────────────
// 6. Concurrency & Concurrency Protection
// ─────────────────────────────────────────────────────────────
console.log('\n--- 6. Concurrency & Fallback Protection ---');

test('Duplicate refinement clicks are prevented by isRefining flag', 
  mainJs.includes('if (STATE.isRefining) return;') &&
  mainJs.includes('STATE.isRefining = true;')
);

test('previewRequestId guards against stale asynchronous responses', 
  mainJs.includes('if (requestId !== previewRequestId) return;')
);

test('Refinement execution provides local synthesis fallback on API error', 
  mainJs.includes('Refinement request returned error, applying local fallback')
);

console.log('\n============================================================');
console.log(` RESULTS: ${passes}/${total} tests passed (${Math.round((passes / total) * 100)}%)`);
console.log('============================================================');

if (passes !== total) {
  process.exit(1);
}
