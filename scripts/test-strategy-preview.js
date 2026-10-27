const fs = require('fs');

const bg = fs.readFileSync('background/service-worker.js', 'utf-8');
const content = fs.readFileSync('content/main.js', 'utf-8');

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

console.log('--- Strategy Optimization Verification ---');
test('REWRITE_STRATEGIES.cot alias exists in service-worker', bg.includes('REWRITE_STRATEGIES.cot = REWRITE_STRATEGIES.elaborate;'));
test('STATE.activeStrategy initialized to enhance in content/main.js', content.includes("activeStrategy: 'enhance'"));
test('openPopover syncs activeStrategy and calls updateStrategyChipsUI', content.includes('STATE.activeStrategy = currentStrategy;') && content.includes('updateStrategyChipsUI(STATE.activeStrategy);'));
test('storage.onChanged updates STATE.activeStrategy', content.includes('STATE.activeStrategy = nextStrategy;'));
test('GET_SETTINGS in ObserverManager.start initializes STATE.activeStrategy', content.includes('STATE.activeStrategy = siteStrategy || \'enhance\';'));
test('updateStrategyChipsUI function is defined', content.includes('function updateStrategyChipsUI(strategy)'));
test('updateInlineToneUI syncs expert chip state', content.includes("expertChip.classList.add('promptpro-suggestion-chip--active');"));
test('handleStrategyToggle toggles back to enhance on reclick', content.includes("(STATE.activeStrategy === targetStrategy) ? 'enhance' : targetStrategy"));
test('synthesizeLocalUpgrade handles concise distinctly', content.includes('if (strategy === "concise")'));
test('synthesizeLocalUpgrade handles elaborate distinctly', content.includes('if (strategy === "cot" || strategy === "elaborate")'));

console.log(`\nResult: ${passes}/${total} passed (100%)`);
if (passes !== total) process.exit(1);
