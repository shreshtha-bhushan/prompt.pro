import { NextResponse } from 'next/server';


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
      model = 'anthropic/claude-3.5-sonnet',
    } = data;

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

    let systemPrompt = "You are PromptPro, an expert prompt engineering AI. Your job is to rewrite and optimize the user's input prompt based on their chosen strategy and tone.";
    
    if (strategy === "elaborate") {
      systemPrompt += "\n\nStrategy [ELABORATE]: Expand the prompt with a systematic reasoning scaffold and chain-of-thought structure. Encourage deep analysis.";
    } else if (strategy === "concise") {
      systemPrompt += "\n\nStrategy [CONCISE]: Strip away any fluff, focus on directness, and enforce short, bullet-pointed, high-density instructions.";
    } else {
      systemPrompt += "\n\nStrategy [ENHANCE]: Apply a complete 5-component decomposition framework: define an expert ROLE, state the clarified core TASK, preserve existing CONTEXT, outline a clear output FORMAT, and establish quality CONSTRAINTS.";
    }

    if (tone) {
      systemPrompt += `\n\nTone [${tone.toUpperCase()}]: Enforce a ${tone} tone throughout the response.`;
    }

    if (lowTokenEnabled) {
      systemPrompt += "\n\nCRITICAL CONSTRAINTS (LOW TOKEN MODE):\nEnsure the upgraded prompt instructs the target model to be extremely concise, utilizing minimal tokens. Inject strict length limits (e.g., \"keep response under 150 words\"), restrict verbose explanations, and enforce direct fact-based answers with zero filler.";
    }

    if (noFluff) {
      systemPrompt += "\n\nCRITICAL CONSTRAINTS (NO-FLUFF):\n1. Output ONLY the raw, enhanced prompt that the user will copy and paste.\n2. Do NOT include any greetings, introduction, closing remarks, explanations of changes, or conversational filler.\n3. Do NOT wrap the prompt in markdown code blocks or backticks. Output pure, copyable text.";
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
      const errorPayload = await openrouterResponse.json();
      const apiErrorMessage = errorPayload.error?.message || `HTTP status ${openrouterResponse.status}`;
      return NextResponse.json({ error: `OpenRouter API rejected call: ${apiErrorMessage}` }, { status: 502, headers });
    }

    const completion = await openrouterResponse.json();
    let aiText = completion.choices?.[0]?.message?.content;
    
    if (!aiText) {
      return NextResponse.json({ error: 'Received empty completion from OpenRouter.' }, { status: 502, headers });
    }

    let cleanText = aiText.trim();
    if (noFluff) {
      if (cleanText.startsWith("```") && cleanText.endsWith("```")) {
        cleanText = cleanText.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "");
      }
      cleanText = cleanText.replace(/^(here is|here's|sure, here is|sure, here's) the (enhanced|rewritten|optimized|upgraded)? prompt:?\n*/i, "");
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
