import { NextResponse } from 'next/server';
import config from '../../../../config.json';

export const runtime = 'edge';

export async function POST(request: Request) {
  // CORS setup
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const data = await request.json();
    const {
      text,
      strategy = 'enhance',
      tone = null,
      lowTokenEnabled = false,
      noFluff = true,
    } = data;

    const model = config.model;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Empty prompt text provided.' }, { status: 400, headers });
    }

    if (text.length > 10000) {
      return NextResponse.json({ error: 'Prompt text exceeds maximum allowed limit.' }, { status: 400, headers });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server misconfiguration: missing API key.' }, { status: 500, headers });
    }

    let systemPrompt = `You are PromptPro, an expert prompt engineering AI. Your job is to rewrite and optimize the user's input prompt based on their chosen strategy and tone.

CRITICAL INSTRUCTION:
Your response must consist ONLY of the final, optimized prompt itself. You must absolutely NOT include any conversational introductory remarks, conversational preambles (e.g., "To optimize your request...", "Here is the optimized prompt:"), conversational postambles, explanations of changes, or greetings. Start your output directly with the rewritten prompt text. Do not wrap the output in markdown code blocks or backticks.`;

    if (strategy === "elaborate") {
      systemPrompt += `

Strategy [ELABORATE]:
Expand the prompt with a systematic reasoning scaffold and chain-of-thought structure. Encourage deep analysis.
Desired Output Structure:
Start directly with the first line of the rewritten prompt. Expand the task into structured thinking steps.`;
    } else if (strategy === "concise") {
      systemPrompt += `

Strategy [CONCISE]:
Strip away any fluff, focus on directness, and enforce short, bullet-pointed, high-density instructions.
Desired Output Structure:
Start directly with the first bullet point or instruction. Avoid any preamble or intro.`;
    } else {
      systemPrompt += `

Strategy [ENHANCE]:
Apply a complete 5-component decomposition framework.
Your output must start directly with:
**Role:** [Expert role definition]

**Task:** [Clarified core task]

**Context:** [Preserved context]

**Format:** [Clear output format specification]

**Constraints:** [Established quality constraints]

Do NOT output any intro text before "**Role:**".`;
    }

    if (tone) {
      systemPrompt += `\n\nTone [${tone.toUpperCase()}]: Enforce a ${tone} tone throughout the optimized prompt's instructions and requirements.`;
    }

    if (lowTokenEnabled) {
      systemPrompt += "\n\nCRITICAL CONSTRAINTS (LOW TOKEN MODE):\nEnsure the upgraded prompt instructs the target model to be extremely concise, utilizing minimal tokens. Inject strict length limits (e.g., \"keep response under 150 words\"), restrict verbose explanations, and enforce direct fact-based answers with zero filler.";
    }

    if (noFluff) {
      systemPrompt += "\n\nCRITICAL CONSTRAINTS (NO-FLUFF):\n1. Output ONLY the raw, enhanced prompt that the user will copy and paste.\n2. Do NOT include any greetings, introduction, closing remarks, explanations of changes, or conversational filler.\n3. Do NOT wrap the prompt in markdown code blocks or backticks. Output pure, copyable text. Start directly with the first character of the rewritten prompt.";
    }

    const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/shreshtha-bhushan/prompt.pro",
        "X-Title": "PromptPro Vercel API"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.3
      })
    });

    if (!openrouterResponse.ok) {
      let errorPayload;
      try {
        errorPayload = await openrouterResponse.json();
      } catch (e) {
        errorPayload = { error: { message: `HTTP status ${openrouterResponse.status}` } };
      }
      return NextResponse.json({ 
        error: 'OpenRouter rejected the request', 
        details: errorPayload,
        status: openrouterResponse.status
      }, { status: openrouterResponse.status, headers });
    }

    const completion = await openrouterResponse.json();
    let aiText = completion.choices?.[0]?.message?.content;
    
    if (!aiText) {
      return NextResponse.json({ error: 'Received empty completion from OpenRouter.', details: completion }, { status: 502, headers });
    }

    let cleanText = aiText.trim();
    if (noFluff) {
      // 1. Remove markdown code blocks if present
      if (cleanText.startsWith("```") && cleanText.endsWith("```")) {
        cleanText = cleanText.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "");
      }
      
      // 2. Remove standard conversational preambles/intros
      cleanText = cleanText.replace(/^(here is|here's|sure, here is|sure, here's|certainly, here is|certainly, here's) the (enhanced|rewritten|optimized|upgraded)? prompt:?\n*/i, "");
      
      // 3. Remove academic/meta explanations (e.g. "To optimize your request using the ENHANCE strategy... I have restructured...")
      cleanText = cleanText.replace(/^[\s\S]*?(?:###\s+Optimized\s+Prompt|###\s+Enhanced\s+Prompt|###\s+Upgraded\s+Prompt)\s*/i, "");
      cleanText = cleanText.replace(/^(?:To\s+optimize\s+your\s+request|I\s+have\s+restructured|I've\s+optimized|Here\s+is\s+your\s+enhanced|Here\s+is\s+the\s+optimized)[\s\S]*?(?:\*{3,}|\-{3,})\s*/i, "");
      
      // 4. Failsafe for ENHANCE strategy: if output contains "**Role:**" or "Role:", discard anything before it
      const roleIndex = cleanText.search(/\*\*(?:Role|Persona)\*\*:/i);
      if (roleIndex > 0) {
        cleanText = cleanText.substring(roleIndex).trim();
      } else {
        const plainRoleIndex = cleanText.search(/^(?:Role|Persona):/im);
        if (plainRoleIndex > 0) {
          cleanText = cleanText.substring(plainRoleIndex).trim();
        }
      }
      
      cleanText = cleanText.trim();
    }

    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const estimatedCost = (promptTokens * 0.000003) + (completionTokens * 0.000015);

    return NextResponse.json({
      success: true,
      rewritten: cleanText,
      tokensUsed: promptTokens + completionTokens,
      estimatedCost
    }, { status: 200, headers });

  } catch (error: any) {
    console.error("[upgradePrompt] Secure enhancement failed:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500, headers });
  }
}
