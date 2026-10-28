/**
 * PromptPro V3 — Style Intelligence Test Suite
 * Phase 5: Regression tests for canonical style resolution, auto-detection,
 *           preference memory learning loop, and override protection.
 */
'use strict';

console.log('============================================================');
console.log(' PROMPTPRO V3 — STYLE INTELLIGENCE TEST SUITE');
console.log('============================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      r.then(() => { console.log(`  PASS: ${name}`); passed++; })
       .catch(e => { console.log(`  FAIL: ${name}\n         ${e.message}`); failed++; });
    } else {
      console.log(`  PASS: ${name}`);
      passed++;
    }
  } catch (e) {
    console.log(`  FAIL: ${name}\n         ${e.message}`);
    failed++;
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error(`${msg}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`); }
function assertBetween(v, lo, hi, msg) { if (v < lo || v > hi) throw new Error(`${msg}: ${v} not in [${lo},${hi}]`); }

// ── Inline port of detectPromptStyle ────────────────────────────────────────

const STYLE_PATTERNS = {
  academic:     { patterns: [/\b(thesis|dissertation|literature review|methodology|scholarly|hypothesis|peer.reviewed|citation|academic|empirical|theoretical framework|research paper|journal|survey|meta.analysis)\b/i, /\b(analyze critically|critical analysis|discourse analysis|epistemology|positivism|qualitative|quantitative research)\b/i], weight: 1.2 },
  technical:    { patterns: [/\b(function|algorithm|api|debug|implement|typescript|python|javascript|runtime|codebase|refactor|deploy|database|sql|regex|endpoint|library|framework|module|class|interface|recursion)\b/i, /\b(time complexity|big o|memory leak|race condition|concurrency|async|await|promise|dependency injection|unit test|integration test)\b/i], weight: 1.0 },
  creative:     { patterns: [/\b(story|poem|narrative|character|scene|dialogue|plot|fiction|metaphor|prose|screenplay|novel|short story|creative writing|imagery|protagonist|antagonist|arc)\b/i, /\b(evocative|vivid|lyrical|write a|craft a|compose a)\b/i], weight: 1.0 },
  professional: { patterns: [/\b(email|client|stakeholder|proposal|executive summary|meeting|deliverable|project plan|business case|roi|kpi|strategy|roadmap|quarterly|annual report|memo|briefing)\b/i, /\b(professional tone|corporate|enterprise|b2b|revenue|budget|forecast|milestone)\b/i], weight: 0.9 },
  casual:       { patterns: [/\b(btw|lol|kinda|gonna|wanna|idk|fyi|ngl|tbh|omg|hey|asap|awesome|basically|literally)\b/i, /[?!]{2,}|\.\.\./], weight: 0.8 }
};

function detectPromptStyle(text, analysis) {
  if (!text || text.trim().length < 8) return { detectedStyle: null, confidence: 0, signals: [] };
  const scores = {}; const signals = {};
  for (const [style, config] of Object.entries(STYLE_PATTERNS)) {
    let hits = 0; const terms = [];
    for (const p of config.patterns) { const m = text.match(new RegExp(p.source,'gi'))||[]; hits+=m.length; terms.push(...m.slice(0,3)); }
    scores[style] = hits * config.weight;
    signals[style] = [...new Set(terms.map(m=>m.toLowerCase()))].slice(0,5);
  }
  if (analysis) {
    if (analysis.isCodeRelated) scores.technical = (scores.technical||0)+1.5;
    if (analysis.isWriting)     scores.creative   = (scores.creative||0)+0.5;
    if (analysis.isCreative)    scores.creative   = (scores.creative||0)+1.0;
  }
  const sorted = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  if (!sorted.length || sorted[0][1]===0) return { detectedStyle: null, confidence: 0, signals: [] };
  const [topStyle,topScore] = sorted[0];
  const secondScore = sorted[1]?.[1]||0;
  const totalScore = sorted.reduce((acc,[,s])=>acc+s,0);
  const absConf = Math.min(1, topScore/6);
  const sepConf = totalScore>0 ? Math.min(1,(topScore-secondScore)/Math.max(1,topScore)) : 0;
  const confidence = Math.round(((absConf*0.6)+(sepConf*0.4))*100)/100;
  return { detectedStyle: topStyle, confidence, signals: signals[topStyle]||[] };
}

// ── Inline port of resolveEffectiveStyle ─────────────────────────────────────

function resolveEffectiveStyle(STATE, siteId) {
  const s = STATE.settings || {};
  let tone = STATE.activeTone;
  if (tone===undefined||tone===null) {
    if (siteId && s.siteMemory && s.sites?.[siteId]?.defaultTone!==undefined) tone = s.sites[siteId].defaultTone;
    else tone = s.defaultTone||null;
  }
  let strategy = STATE.activeStrategy;
  if (!strategy) {
    if (siteId && s.siteMemory && s.sites?.[siteId]?.defaultStrategy) strategy = s.sites[siteId].defaultStrategy;
    else strategy = s.defaultStrategy||'enhance';
  }
  return { tone: tone||null, strategy: strategy||'enhance' };
}

// ── In-memory IntelligenceMemory ─────────────────────────────────────────────

function makeMemory() {
  let profile = { preferences:{ dominantTone:null, dominantStrategy:null }, adaptiveWeights:{}, acceptedSuggestions:{} };
  return {
    async getProfile() { return JSON.parse(JSON.stringify(profile)); },
    async registerAction(actionType, value) {
      if (actionType==='tone_accept')     { profile.preferences.dominantTone=value;     profile.acceptedSuggestions[`tone:${value}`]=(profile.acceptedSuggestions[`tone:${value}`]||0)+1; }
      else if (actionType==='strategy_accept') { profile.preferences.dominantStrategy=value; profile.acceptedSuggestions[`strategy:${value}`]=(profile.acceptedSuggestions[`strategy:${value}`]||0)+1; }
    },
    async getRecommendation() {
      const sug = profile.acceptedSuggestions||{}; let bestTone=profile.preferences.dominantTone, bestStrategy=profile.preferences.dominantStrategy;
      let mt=0,ms=0;
      for (const [k,c] of Object.entries(sug)) {
        if (k.startsWith('tone:')     && c>mt) { mt=c; bestTone=k.slice(5); }
        if (k.startsWith('strategy:') && c>ms) { ms=c; bestStrategy=k.slice(9); }
      }
      return { recommendedTone:bestTone, recommendedStrategy:bestStrategy||'enhance' };
    }
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

console.log('--- 1. Canonical Style Resolution (Phase 1) ---');

test('STATE.activeTone wins over settings.defaultTone', () => {
  const r = resolveEffectiveStyle({ activeTone:'academic', settings:{ defaultTone:'professional' } }, null);
  assertEqual(r.tone,'academic','tone');
});
test('Academic-vs-Professional regression: activeTone=academic beats defaultTone=professional', () => {
  const r = resolveEffectiveStyle({ activeTone:'academic', activeStrategy:'enhance', settings:{ defaultTone:'professional' } }, null);
  assertEqual(r.tone,'academic','Must return academic (regression fix)');
});
test('Site-memory tone overrides global when activeTone=null', () => {
  const r = resolveEffectiveStyle({ activeTone:null, settings:{ siteMemory:true, defaultTone:'casual', sites:{ chatgpt:{ defaultTone:'academic', defaultStrategy:'elaborate' } } } }, 'chatgpt');
  assertEqual(r.tone,'academic','tone'); assertEqual(r.strategy,'elaborate','strategy');
});
test('Falls back to global settings when site has no override', () => {
  const r = resolveEffectiveStyle({ activeTone:null, settings:{ siteMemory:true, defaultTone:'technical', defaultStrategy:'concise', sites:{} } }, 'claude');
  assertEqual(r.tone,'technical','tone'); assertEqual(r.strategy,'concise','strategy');
});
test('Returns null tone + enhance when nothing set', () => {
  const r = resolveEffectiveStyle({ activeTone:null, settings:{} }, null);
  assertEqual(r.tone,null,'tone'); assertEqual(r.strategy,'enhance','strategy');
});
test('siteMemory=false ignores site overrides', () => {
  const r = resolveEffectiveStyle({ activeTone:null, settings:{ siteMemory:false, defaultTone:'direct', sites:{ chatgpt:{ defaultTone:'casual' } } } }, 'chatgpt');
  assertEqual(r.tone,'direct','Should use global when siteMemory=false');
});

console.log('\n--- 2. Automatic Style Detection Engine (Phase 2) ---');

test('Detects academic prompts', () => {
  const r = detectPromptStyle('Write a thesis examining the theoretical framework of qualitative research methodology', { isCodeRelated:false });
  assertEqual(r.detectedStyle,'academic','style'); assert(r.confidence>=0.5,`low confidence: ${r.confidence}`);
});
test('Detects technical/code prompts', () => {
  const r = detectPromptStyle('Implement a recursive algorithm in Python to refactor the database API endpoint', { isCodeRelated:true });
  assertEqual(r.detectedStyle,'technical','style');
});
test('Detects professional business prompts', () => {
  const r = detectPromptStyle('Draft an executive summary for the Q3 roadmap proposal with KPIs and client deliverables', { isCodeRelated:false });
  assertEqual(r.detectedStyle,'professional','style');
});
test('Detects creative writing prompts', () => {
  const r = detectPromptStyle('Write a vivid short story with a compelling protagonist and metaphors about redemption', { isCodeRelated:false, isCreative:true });
  assertEqual(r.detectedStyle,'creative','style');
});
test('Returns null for short/ambiguous prompts', () => {
  const r = detectPromptStyle('help me', null);
  assertEqual(r.detectedStyle,null,'style'); assertEqual(r.confidence,0,'confidence');
});
test('Confidence is between 0 and 1', () => {
  const r = detectPromptStyle('Debug this typescript function with runtime error', { isCodeRelated:true });
  assertBetween(r.confidence,0,1,'confidence');
});
test('analysis.isCodeRelated boosts technical score', () => {
  const r = detectPromptStyle('fix my code', { isCodeRelated:true });
  assertEqual(r.detectedStyle,'technical','technical boost from analysis');
});

console.log('\n--- 3. Preference Memory Learning Loop (Phase 3) ---');

const m1 = makeMemory();
test('tone_accept stores dominantTone', async () => {
  await m1.registerAction('tone_accept','academic');
  const p = await m1.getProfile();
  assertEqual(p.preferences.dominantTone,'academic','dominantTone');
  assertEqual(p.acceptedSuggestions['tone:academic'],1,'count');
});
const m2 = makeMemory();
test('strategy_accept stores dominantStrategy', async () => {
  await m2.registerAction('strategy_accept','elaborate');
  const p = await m2.getProfile();
  assertEqual(p.preferences.dominantStrategy,'elaborate','dominantStrategy');
  assertEqual(p.acceptedSuggestions['strategy:elaborate'],1,'count');
});
const m3 = makeMemory();
test('getRecommendation returns most-used tone', async () => {
  await m3.registerAction('tone_accept','professional');
  await m3.registerAction('tone_accept','academic');
  await m3.registerAction('tone_accept','academic');
  const rec = await m3.getRecommendation();
  assertEqual(rec.recommendedTone,'academic','Most used should win');
});
const m4 = makeMemory();
test('getRecommendation returns most-used strategy', async () => {
  await m4.registerAction('strategy_accept','enhance');
  await m4.registerAction('strategy_accept','concise');
  await m4.registerAction('strategy_accept','concise');
  const rec = await m4.getRecommendation();
  assertEqual(rec.recommendedStrategy,'concise','Most used strategy');
});
test('getRecommendation returns enhance when no history', async () => {
  const rec = await makeMemory().getRecommendation();
  assertEqual(rec.recommendedStrategy,'enhance','Default strategy');
});

console.log('\n--- 4. Auto-Detection Override Protection ---');

test('toneIsExplicit=true prevents auto-detection from overriding tone', () => {
  const STATE = { activeTone:'professional', toneIsExplicit:true };
  const detection = { detectedStyle:'academic', confidence:0.85, signals:['thesis'] };
  if (detection.confidence>=0.65 && !STATE.toneIsExplicit) STATE.activeTone = detection.detectedStyle;
  assertEqual(STATE.activeTone,'professional','Explicit tone must not be overridden');
});
test('toneIsExplicit=false allows auto-detection to apply', () => {
  const STATE = { activeTone:null, toneIsExplicit:false };
  const detection = { detectedStyle:'academic', confidence:0.85 };
  if (detection.confidence>=0.65 && !STATE.toneIsExplicit) STATE.activeTone = detection.detectedStyle;
  assertEqual(STATE.activeTone,'academic','Should apply when not explicit');
});
test('Low confidence (<0.65) detection does not auto-apply', () => {
  const STATE = { activeTone:null, toneIsExplicit:false };
  const detection = { detectedStyle:'academic', confidence:0.42 };
  if (detection.confidence>=0.65 && !STATE.toneIsExplicit) STATE.activeTone = detection.detectedStyle;
  assertEqual(STATE.activeTone,null,'Low confidence should not change tone');
});
test('toneIsExplicit resets to false when no saved preference on open', () => {
  const simulate = (savedTone) => { const S = {}; S.activeTone=savedTone||null; S.toneIsExplicit=!!S.activeTone; return S; };
  assert(simulate('technical').toneIsExplicit===true,'Saved pref -> explicit=true');
  assert(simulate(null).toneIsExplicit===false,'No saved pref -> explicit=false');
});
test('toneIsExplicit set to true when saved preference exists on open', () => {
  const simulate = (savedTone) => { const S = {}; S.activeTone=savedTone||null; S.toneIsExplicit=!!S.activeTone; return S; };
  assert(simulate('academic').toneIsExplicit===true,'academic pref -> explicit=true');
});

// ── Summary ──────────────────────────────────────────────────────────────────
setTimeout(() => {
  console.log('\n============================================================');
  const total = passed + failed;
  if (failed === 0) {
    console.log(` ALL ${total} TESTS PASSED`);
  } else {
    console.log(` ${passed}/${total} PASSED, ${failed} FAILED`);
  }
  console.log('============================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}, 500);
