import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim().length < 4) {
      return NextResponse.json({ completion: null }, { headers: corsHeaders });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ completion: null }, { headers: corsHeaders });
    }

    const model = process.env.OPENROUTER_MODEL || "openrouter/free";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s fast timeout for autocomplete

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://github.com/shreshtha-bhushan/prompt.pro",
          "X-Title": "PromptPro Autocomplete API",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an inline autocomplete engine for writing AI prompts. The user has typed the beginning of a prompt. Provide ONLY the immediate continuation (3 to 10 words) to complete the current thought. Do NOT repeat what the user typed. Do NOT output punctuation at the start. Output ONLY the suffix completion with NO explanation or quotes.",
            },
            {
              role: "user",
              content: text,
            },
          ],
          temperature: 0.2,
          max_tokens: 30,
        }),
      });

      if (!response.ok) {
        return NextResponse.json({ completion: null }, { headers: corsHeaders });
      }

      const data = await response.json();
      let completion = data.choices?.[0]?.message?.content?.trim() || null;

      if (completion) {
        // Strip conversational preamble or markdown backticks if any
        completion = completion.replace(/^["'`]+|["'`]+$/g, "").trim();
        if (completion.toLowerCase().startsWith(text.trim().toLowerCase())) {
          completion = completion.substring(text.trim().length).trim();
        }
      }

      return NextResponse.json({ completion }, { headers: corsHeaders });
    } catch (_err) {
      return NextResponse.json({ completion: null }, { headers: corsHeaders });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (_e) {
    return NextResponse.json({ completion: null }, { headers: corsHeaders });
  }
}
