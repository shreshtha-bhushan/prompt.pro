import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveAuthUserId } from "@/lib/auth-resolver";
import { rateLimit, buildRateLimitResponse } from "@/lib/ratelimit";
import { getCorsHeaders, handleOptions } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    // 1. Authentication Check
    const userId = await resolveAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "unauthorized", code: "AUTH_REQUIRED" },
        { status: 401, headers: corsHeaders }
      );
    }

    // 2. Rate Limiting Check (60 req / 60s per user)
    const rateLimitResult = await rateLimit("autocomplete", userId);
    if (!rateLimitResult.success) {
      return buildRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // 3. Input Validation
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

