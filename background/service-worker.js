/**
 * PromptPro — Background Service Worker (Phase 1)
 * 
 * Advanced prompt optimization engine with:
 * - 5-component structured rewriting (ROLE, TASK, CONTEXT, FORMAT, CONSTRAINTS)
 * - 6 tone presets (professional, casual, academic, creative, technical, direct)
 * - Multi-dimensional scoring (clarity, specificity, structure, intent)
 * 
 * ZERO network calls. ZERO external dependencies. ZERO telemetry.
 * All processing is pure string operations — target < 150ms.
 */

// ═══════════════════════════════════════════════════════════════
// PROMPT ANALYZER — Decompose raw prompt into components
// ═══════════════════════════════════════════════════════════════

const ANALYSIS_PATTERNS = {
  hasRole: /^(you are|act as|as a|pretend|imagine you're|your role|you're a)/im,
  hasContext: /(context|background|given that|considering|based on|regarding|about|in the context of)/i,
  hasFormat: /(format|bullet|list|table|step|structured|markdown|json|code|paragraph|heading|number)/i,
  hasConstraints: /(don't|avoid|must|limit|only|do not|never|within|at most|at least|no more|keep it|maximum|minimum|restrict|exclude)/i,
  hasExamples: /(example|e\.g\.|for instance|such as|like this|here's|sample|demo|illustration)/i,
  hasQuestion: /\?/,
  hasNumbers: /\b\d+\b/,
  isCodeRelated: /(code|function|class|api|debug|error|bug|implement|refactor|algorithm|syntax|compile|runtime|variable|method|script)/i,
  isWriting: /(write|essay|article|blog|story|email|letter|summary|review|report|paragraph|content|copy|draft)/i,
  isAnalysis: /(analyze|compare|evaluate|assess|review|critique|explain|break down|pros and cons|advantages|difference)/i,
  isCreative: /(creative|brainstorm|idea|imagine|design|invent|generate|suggest|come up with|think of)/i,
};

function analyzePrompt(text) {
  const t = text.trim();
  const lower = t.toLowerCase();

  return {
    text: t,
    length: t.length,
    lineCount: t.split('\n').length,
    sentenceCount: t.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
    wordCount: t.split(/\s+/).filter(w => w.length > 0).length,
    hasRole: ANALYSIS_PATTERNS.hasRole.test(t),
    hasContext: ANALYSIS_PATTERNS.hasContext.test(t),
    hasFormat: ANALYSIS_PATTERNS.hasFormat.test(t),
    hasConstraints: ANALYSIS_PATTERNS.hasConstraints.test(t),
    hasExamples: ANALYSIS_PATTERNS.hasExamples.test(t),
    hasQuestion: ANALYSIS_PATTERNS.hasQuestion.test(t),
    hasNumbers: ANALYSIS_PATTERNS.hasNumbers.test(t),
    isCodeRelated: ANALYSIS_PATTERNS.isCodeRelated.test(lower),
    isWriting: ANALYSIS_PATTERNS.isWriting.test(lower),
    isAnalysis: ANALYSIS_PATTERNS.isAnalysis.test(lower),
    isCreative: ANALYSIS_PATTERNS.isCreative.test(lower),
  };
}

// ═══════════════════════════════════════════════════════════════
// ROLE INFERENCE — Determine the best expert persona
// ═══════════════════════════════════════════════════════════════

function inferRole(analysis) {
  if (analysis.hasRole) return null; // User already specified a role

  if (analysis.isCodeRelated) {
    return 'You are a senior software engineer with deep expertise in writing clean, efficient, and well-documented code.';
  }
  if (analysis.isWriting) {
    return 'You are an expert writer and editor skilled at producing clear, engaging, and well-structured content.';
  }
  if (analysis.isAnalysis) {
    return 'You are a thorough analytical thinker who excels at breaking down complex topics and providing balanced evaluations.';
  }
  if (analysis.isCreative) {
    return 'You are a highly creative thinker who generates original, diverse, and actionable ideas.';
  }

  return 'You are a knowledgeable and precise expert assistant.';
}

// ═══════════════════════════════════════════════════════════════
// TASK CLARIFICATION — Sharpen the core ask
// ═══════════════════════════════════════════════════════════════

function clarifyTask(analysis) {
  const { text } = analysis;

  // If prompt is already well-structured (3+ sentences), return as-is
  if (analysis.sentenceCount >= 3 && analysis.wordCount > 30) {
    return text;
  }

  // For very short prompts, wrap with explicit task framing
  if (analysis.wordCount < 10) {
    return `Provide a comprehensive and detailed response to the following:\n\n${text}`;
  }

  return text;
}

// ═══════════════════════════════════════════════════════════════
// FORMAT INFERENCE — Add output structure hints
// ═══════════════════════════════════════════════════════════════

function inferFormat(analysis) {
  if (analysis.hasFormat) return null; // User already specified format

  if (analysis.isCodeRelated) {
    return 'Provide your response with code blocks, inline comments, and a brief explanation of the approach.';
  }
  if (analysis.isAnalysis) {
    return 'Structure your response with clear sections, use comparisons where relevant, and end with a concise summary.';
  }
  if (analysis.isWriting) {
    return 'Organize your response with clear paragraphs and logical flow.';
  }
  if (analysis.isCreative) {
    return 'Present ideas as a numbered list with a brief description for each.';
  }
  if (analysis.wordCount < 15) {
    return 'Provide a well-structured, clear, and comprehensive response.';
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// CONSTRAINTS INFERENCE — Add quality boundaries
// ═══════════════════════════════════════════════════════════════

function inferConstraints(analysis) {
  if (analysis.hasConstraints) return null;

  const constraints = [];

  if (analysis.isCodeRelated) {
    constraints.push('Follow best practices and include error handling where appropriate.');
  }

  if (!analysis.hasExamples && analysis.wordCount > 10) {
    constraints.push('Include a concrete example where it aids understanding.');
  }

  constraints.push('Be specific and provide actionable details rather than vague generalities.');

  return constraints.length > 0 ? constraints.join(' ') : null;
}

// ═══════════════════════════════════════════════════════════════
// REWRITE STRATEGIES — 3 strategies using 5-component model
// ═══════════════════════════════════════════════════════════════

const REWRITE_STRATEGIES = {

  /**
   * Enhance: Full 5-component decomposition.
   * ROLE → TASK → CONTEXT(preserved) → FORMAT → CONSTRAINTS
   */
  enhance(text) {
    const analysis = analyzePrompt(text);
    const parts = [];

    // 1. ROLE
    const role = inferRole(analysis);
    if (role) parts.push(role);

    // 2. TASK (clarified core prompt)
    parts.push(clarifyTask(analysis));

    // 3. CONTEXT — already embedded in the user's text, we don't fabricate

    // 4. FORMAT
    const format = inferFormat(analysis);
    if (format) parts.push(format);

    // 5. CONSTRAINTS
    const constraints = inferConstraints(analysis);
    if (constraints) parts.push(constraints);

    return parts.join('\n\n');
  },

  /**
   * Elaborate: Add chain-of-thought + reasoning scaffold.
   */
  elaborate(text) {
    const analysis = analyzePrompt(text);
    const parts = [];

    const role = inferRole(analysis);
    if (role) parts.push(role);

    parts.push(analysis.text);

    parts.push(
      'Please think through this systematically:\n' +
      '1. Begin by identifying the core question or problem.\n' +
      '2. Analyze it from multiple angles or perspectives.\n' +
      '3. Provide detailed reasoning with supporting evidence or examples.\n' +
      '4. Address potential counterarguments or edge cases.\n' +
      '5. Conclude with a clear, actionable summary.'
    );

    return parts.join('\n\n');
  },

  /**
   * Concise: Strip fluff, add focus constraints.
   */
  concise(text) {
    const analysis = analyzePrompt(text);
    const parts = [];

    // No role for concise — keep it tight
    parts.push(analysis.text);

    parts.push(
      'Be concise and direct:\n' +
      '• Lead with the answer or key point.\n' +
      '• Use bullet points for multiple items.\n' +
      '• Omit preamble, filler, and unnecessary qualifications.\n' +
      '• Keep total response under 200 words unless complexity demands more.'
    );

    return parts.join('\n\n');
  }
};

// ═══════════════════════════════════════════════════════════════
// TONE PRESETS — Post-processing transformations
// ═══════════════════════════════════════════════════════════════

const TONE_PRESETS = {

  professional(text) {
    return text + '\n\nUse a professional, business-appropriate tone throughout. Maintain clarity and precision.';
  },

  casual(text) {
    return text + '\n\nUse a friendly, conversational tone. Explain things as if talking to a curious friend.';
  },

  academic(text) {
    return text + '\n\nUse a formal academic tone. Be rigorous and precise. Cite relevant concepts or frameworks where applicable.';
  },

  creative(text) {
    return text + '\n\nBe imaginative and original. Use vivid language, metaphors, and unexpected angles to make the response engaging.';
  },

  technical(text) {
    return text + '\n\nUse precise technical terminology. Assume the reader has domain expertise. Prioritize accuracy and depth over simplicity.';
  },

  direct(text) {
    return text + '\n\nBe extremely direct. No hedging, no caveats, no filler. State facts and opinions plainly.';
  }
};

// ═══════════════════════════════════════════════════════════════
// MULTI-DIMENSIONAL SCORING (4 axes × 25 points = 100)
// ═══════════════════════════════════════════════════════════════

/**
 * Score prompt clarity (0-25).
 * Measures: sentence completeness, question presence, low ambiguity.
 */
function scoreClarity(text, analysis) {
  let score = 0;

  // Has at least one complete sentence
  if (analysis.sentenceCount >= 1) score += 5;
  if (analysis.sentenceCount >= 2) score += 3;

  // Reasonable length (not too short, not too long)
  if (analysis.wordCount >= 5) score += 3;
  if (analysis.wordCount >= 15) score += 2;
  if (analysis.wordCount >= 30) score += 2;

  // Has clear question or imperative
  if (analysis.hasQuestion) score += 4;
  if (/^(explain|describe|list|create|write|build|design|compare|analyze|help|show|tell)/im.test(text)) score += 3;

  // Low ambiguity markers (absence of vague words)
  const vagueWords = (text.match(/\b(stuff|things|something|somehow|whatever|etc|kind of|sort of)\b/gi) || []).length;
  if (vagueWords === 0) score += 3;

  return Math.min(score, 25);
}

/**
 * Score prompt specificity (0-25).
 * Measures: numbers, proper nouns, concrete details, domain terms.
 */
function scoreSpecificity(text, analysis) {
  let score = 0;

  // Contains numbers or quantities
  if (analysis.hasNumbers) score += 4;

  // Contains proper nouns (capitalized words not at start of sentence)
  const properNouns = (text.match(/(?<=[.!?\s])[A-Z][a-z]{2,}/g) || []).length;
  if (properNouns >= 1) score += 3;
  if (properNouns >= 3) score += 2;

  // Contains quoted terms or specific references
  if (/["'`]/.test(text)) score += 2;

  // Domain-specific terminology
  if (analysis.isCodeRelated || analysis.isAnalysis) score += 3;

  // Has examples
  if (analysis.hasExamples) score += 5;

  // Word diversity (unique words / total words)
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const unique = new Set(words).size;
  const diversity = words.length > 0 ? unique / words.length : 0;
  if (diversity > 0.6) score += 3;
  if (diversity > 0.8) score += 3;

  return Math.min(score, 25);
}

/**
 * Score prompt structure (0-25).
 * Measures: format instructions, logical markers, multi-section.
 */
function scoreStructure(text, analysis) {
  let score = 0;

  // Has format instructions
  if (analysis.hasFormat) score += 6;

  // Has multiple lines (structured input)
  if (analysis.lineCount >= 2) score += 3;
  if (analysis.lineCount >= 4) score += 2;

  // Has numbered items or bullets
  if (/^\s*[\d]+[.)]\s/m.test(text) || /^\s*[-*•]\s/m.test(text)) score += 4;

  // Has logical flow markers
  if (/\b(first|then|next|finally|also|additionally|moreover|however|specifically)\b/i.test(text)) score += 3;

  // Has section breaks or clear delineation
  if (/\n\n/.test(text)) score += 2;

  // Prompt length suggests thoughtful structure
  if (analysis.wordCount > 50) score += 3;
  if (analysis.wordCount > 100) score += 2;

  return Math.min(score, 25);
}

/**
 * Score prompt intent (0-25).
 * Measures: role assignment, constraints, output spec, context setting.
 */
function scoreIntent(text, analysis) {
  let score = 0;

  // Has explicit role assignment
  if (analysis.hasRole) score += 6;

  // Has constraints or boundaries
  if (analysis.hasConstraints) score += 5;

  // Has context or background setting
  if (analysis.hasContext) score += 4;

  // Has output specification
  if (/\b(output|result|response|answer|return|give me|provide|deliver|produce)\b/i.test(text)) score += 3;

  // Has scope definition
  if (/\b(focus on|specifically|in particular|regarding|about|concerning)\b/i.test(text)) score += 3;

  // Has success criteria
  if (/\b(should|must|need to|important|critical|essential|key|required)\b/i.test(text)) score += 2;

  // Has audience specification
  if (/\b(for a|audience|reader|beginner|expert|team|developer|student|manager)\b/i.test(text)) score += 2;

  return Math.min(score, 25);
}

/**
 * Full multi-dimensional score.
 * Returns total (0-100) plus per-axis breakdown.
 */
function scorePrompt(text) {
  if (!text || typeof text !== 'string') {
    return { total: 0, clarity: 0, specificity: 0, structure: 0, intent: 0 };
  }

  const analysis = analyzePrompt(text);
  const clarity = scoreClarity(text, analysis);
  const specificity = scoreSpecificity(text, analysis);
  const structure = scoreStructure(text, analysis);
  const intent = scoreIntent(text, analysis);

  return {
    total: clarity + specificity + structure + intent,
    clarity,
    specificity,
    structure,
    intent
  };
}

// ═══════════════════════════════════════════════════════════════
// INTELLIGENCE LAYER: MEMORY & PROFILING (Phase 3)
// ═══════════════════════════════════════════════════════════════

const IntelligenceMemory = {
  async getSession() {
    if (!chrome.storage.session) return null; // Safety fallback
    const data = await chrome.storage.session.get(['activeSession']);
    return data.activeSession || {
      sessionId: `sess_${Date.now()}`,
      promptCount: 0,
      recentTopics: [],
      currentIntent: null
    };
  },

  async updateSession(promptData) {
    if (!chrome.storage.session) return null;
    const session = await this.getSession();
    session.promptCount += 1;
    await chrome.storage.session.set({ activeSession: session });
    return session;
  },

  async getProfile() {
    const data = await chrome.storage.local.get(['userProfile']);
    return data.userProfile || {
      preferences: {
        dominantTone: null,
        favoredFormat: null
      },
      adaptiveWeights: {
        brevity_modifier: 0.5,
        detail_modifier: 0.5
      },
      acceptedSuggestions: {}
    };
  },

  async registerAction(actionType, value, weightDelta = 0.1) {
    const profile = await this.getProfile();
    
    if (actionType === 'tone_accept') {
      profile.preferences.dominantTone = value;
      profile.acceptedSuggestions[value] = (profile.acceptedSuggestions[value] || 0) + 1;
    } else if (actionType === 'suggestion_click') {
      profile.acceptedSuggestions[value] = (profile.acceptedSuggestions[value] || 0) + 1;
    }
    
    await chrome.storage.local.set({ userProfile: profile });
  }
};

// ═══════════════════════════════════════════════════════════════
// INTELLIGENCE LAYER: SUGGESTION ENGINE (Phase 3)
// ═══════════════════════════════════════════════════════════════

async function generateSmartSuggestions(text, analysis) {
  // Edge heuristics: extremely fast (<5ms) generation
  const suggestions = [];
  
  // 1. Format Suggestions
  if (analysis.isCodeRelated && !analysis.hasFormat) {
    suggestions.push({ id: 'fmt_code', type: 'format', text: 'Ask for code blocks' });
  } else if (analysis.isAnalysis && !analysis.hasFormat) {
    suggestions.push({ id: 'fmt_table', type: 'format', text: 'Format as table' });
  } else if (!analysis.hasFormat && analysis.wordCount > 30 && analysis.sentenceCount >= 3) {
    suggestions.push({ id: 'fmt_bullet', type: 'format', text: 'Use bullet points' });
  }

  // 2. Constraint Suggestions
  if (analysis.isCodeRelated && !analysis.hasConstraints) {
    suggestions.push({ id: 'cnst_types', type: 'constraint', text: 'Include TS types' });
  } else if (analysis.isWriting && !analysis.hasConstraints) {
    suggestions.push({ id: 'cnst_concise', type: 'constraint', text: 'Be short & concise' });
  } else if (!analysis.isCodeRelated && analysis.wordCount > 15 && !analysis.hasConstraints) {
    suggestions.push({ id: 'cnst_n_hall', type: 'constraint', text: 'No hallucinations' });
  }

  // 3. Clarity Hooks
  if (!analysis.hasRole) {
    suggestions.push({ id: 'role_expert', type: 'clarity', text: 'Assign Expert Role' });
  }

  // Profile injection will happen here later
  return suggestions.slice(0, 3);
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Only accept messages from our own content scripts
  if (!sender.tab?.id) {
    sendResponse({ error: 'Invalid sender' });
    return true;
  }

  if (message.type === 'UPGRADE_PROMPT') {
    const { text, siteId, strategy = 'enhance', tone = null } = message.payload || {};

    // Validate input
    if (!text || typeof text !== 'string') {
      sendResponse({ error: 'EMPTY', message: 'Please type a prompt first' });
      return true;
    }

    if (text.trim().length === 0) {
      sendResponse({ error: 'EMPTY', message: 'Please type a prompt first' });
      return true;
    }

    if (text.length > 10000) {
      sendResponse({ error: 'TOO_LONG', message: 'Prompt too long (max 10,000 characters)' });
      return true;
    }

    // Score before
    const beforeScore = scorePrompt(text);
    const analysis = analyzePrompt(text);

    // AI Intelligence: Async Memory & Suggestion Fetch (non-blocking)
    IntelligenceMemory.updateSession(text);
    const suggestionsPromise = generateSmartSuggestions(text, analysis);

    // Rewrite
    const rewriteFn = REWRITE_STRATEGIES[strategy];
    if (!rewriteFn) {
      sendResponse({ error: 'UNKNOWN_STRATEGY', message: `Unknown strategy: ${strategy}` });
      return true;
    }

    let rewritten = rewriteFn(text);

    // Apply tone preset if specified
    if (tone && TONE_PRESETS[tone]) {
      rewritten = TONE_PRESETS[tone](rewritten);
    }

    // Score after
    const afterScore = scorePrompt(rewritten);

    suggestionsPromise.then(suggestions => {
      sendResponse({
        rewritten,
        original: text,
        score: {
          before: beforeScore,
          after: afterScore
        },
        suggestions,
        strategy,
        tone: tone || null,
        applied: true
      });
    });

    return true;
  }

  if (message.type === 'REGISTER_ACTION') {
    const { actionType, value } = message.payload || {};
    if (actionType && value) {
      IntelligenceMemory.registerAction(actionType, value);
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse(result.settings || {
        defaultStrategy: 'enhance',
        defaultTone: null,
        showScoreBadge: true,
        enabled: true
      });
    });
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    chrome.storage.local.set({ settings: message.payload }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// ═══════════════════════════════════════════════════════════════
// INSTALL / UPDATE
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      settings: {
        defaultStrategy: 'enhance',
        defaultTone: null,
        showScoreBadge: true,
        enabled: true
      }
    });
  }
});
