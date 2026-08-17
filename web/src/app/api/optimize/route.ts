/**
 * PromptPro — /api/optimize — The Paywall Route
 *
 * ALL optimization calls that consume credits must go through here.
 * Free-tier ("Basic") enhancements are handled locally in the extension
 * service worker and never call this endpoint.
 *
 * Gate order:
 *   1. Clerk authentication (401 if not signed in)
 *   2. Request validation
 *   3. Admin bypass (admins skip tier + credit checks)
 *   4. Tier check — canUseMode() (403 if plan doesn't include the mode)
 *   5. Credit spend — transactional RPC (402 if insufficient credits)
 *   6. Run optimization
 *
 * Response always includes creditsBalance so the extension can update
 * its cached snapshot without issuing a second /api/entitlement call.
 */

import type { NextRequest } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import {
  CREDIT_COSTS,
  canUseMode,
  type OptimizationMode,
  type PlanTier,
} from "@/lib/plans";
import { getRole } from "@/lib/roles";
import { ensureProfile, checkWhopAccess } from "@/lib/entitlement";
import { getPostHogClient, shutdownPosthog } from "@/lib/posthog-server";

// Service-role client — bypasses RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map optimization mode → credit ledger reason
const REASON_BY_MODE: Record<
  OptimizationMode,
  "quick_optimize" | "advanced_optimize" | "max_optimize"
> = {
  quick: "quick_optimize",
  advanced: "advanced_optimize",
  max: "max_optimize",
};

const VALID_MODES: OptimizationMode[] = ["quick", "advanced", "max"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  // ── 1. Authentication ─────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  // ── 2. Request validation ─────────────────────────────────
  let body: { mode?: unknown; prompt?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_json" },
      { status: 400, headers: corsHeaders }
    );
  }

  const mode = body.mode as OptimizationMode;
  const prompt = body.prompt as string;

  if (!VALID_MODES.includes(mode) || !prompt || typeof prompt !== "string") {
    return Response.json(
      { error: "invalid_request", detail: "mode must be quick|advanced|max and prompt must be a non-empty string" },
      { status: 400, headers: corsHeaders }
    );
  }

  if (prompt.trim().length === 0 || prompt.length > 10000) {
    return Response.json(
      { error: "invalid_request", detail: "prompt must be 1–10000 characters" },
      { status: 400, headers: corsHeaders }
    );
  }

  // ── 3. Admin check ────────────────────────────────────────
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const isAdmin = getRole(user) === "admin";

  // ── 4. Profile fetch + tier check ─────────────────────────
  // Ensure the profile row exists (creates it with free-tier defaults if missing)
  await ensureProfile(userId);

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("plan_tier, credits_balance, whop_customer_id")
    .eq("clerk_id", userId)
    .single();

  if (profileErr || !profile) {
    return Response.json(
      { error: "profile_not_found" },
      { status: 404, headers: corsHeaders }
    );
  }

  // DB-level tier gate (fast, cached)
  if (!isAdmin && !canUseMode(profile.plan_tier as PlanTier, mode)) {
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: userId,
      event: "optimization_failed",
      properties: { mode, error_type: "MODE_NOT_AVAILABLE", required_tier: mode === "max" ? "max" : "plus" }
    });
    await shutdownPosthog();
    return Response.json(
      {
        error: "mode_not_available",
        requiredTier: mode === "max" ? "max" : "plus",
        currentTier: profile.plan_tier,
      },
      { status: 403, headers: corsHeaders }
    );
  }

  // ── 4b. Live Whop access check (secondary guard) ───────────
  // For paid tiers, verify the Whop subscription is still active in real time.
  // This catches cancellations the webhook may not have delivered yet.
  // Free-tier users (no whop_customer_id) are skipped — they're gated by plan_tier above.
  if (!isAdmin && profile.whop_customer_id) {
    const hasAccess = await checkWhopAccess(profile.whop_customer_id);
    if (!hasAccess) {
      // Subscription was revoked — downgrade the profile to free in DB
      await supabase
        .from("profiles")
        .update({ plan_tier: "free", plan_status: "canceled", plan_updated_at: new Date().toISOString() })
        .eq("clerk_id", userId);

      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: userId,
        event: "optimization_failed",
        properties: { mode, error_type: "SUBSCRIPTION_INACTIVE" }
      });
      await shutdownPosthog();

      return Response.json(
        { error: "subscription_inactive", message: "Your subscription is no longer active." },
        { status: 403, headers: corsHeaders }
      );
    }
  }

  // ── 5. Credit spend ───────────────────────────────────────
  const cost = CREDIT_COSTS[mode];
  let newBalance = profile.credits_balance;

  if (!isAdmin) {
    const { data: balanceAfter, error: spendErr } = await supabase.rpc(
      "spend_credits",
      {
        p_clerk_id: userId,
        p_amount: cost,
        p_reason: REASON_BY_MODE[mode],
      }
    );

    if (spendErr) {
      const posthog = getPostHogClient();
      if (spendErr.message?.includes("insufficient_credits")) {
        posthog.capture({
          distinctId: userId,
          event: "optimization_failed",
          properties: { mode, error_type: "INSUFFICIENT_CREDITS" }
        });
        await shutdownPosthog();
        return Response.json(
          {
            error: "insufficient_credits",
            balance: profile.credits_balance,
            required: cost,
          },
          { status: 402, headers: corsHeaders }
        );
      }
      console.error("[/api/optimize] spend_credits error:", spendErr);
      posthog.capture({
        distinctId: userId,
        event: "optimization_failed",
        properties: { mode, error_type: "SPEND_FAILED" }
      });
      await shutdownPosthog();
      return Response.json(
        { error: "spend_failed" },
        { status: 500, headers: corsHeaders }
      );
    }

    newBalance = balanceAfter as number;
  }

  // ── 6. Run optimization ───────────────────────────────────
  // NOTE: runOptimization() is a stub. Wire to the Anthropic-backed
  // optimization service when ready. Credits have already been deducted
  // at this point — ensure the actual LLM call is reliable before launch,
  // or implement a refund path on failure.
  let result: string;
  try {
    result = await runOptimization(prompt, mode);
  } catch (err: unknown) {
    // If the optimization itself fails after credits were deducted,
    // refund the credits to maintain trust
    if (!isAdmin) {
      try {
        await supabase.rpc("spend_credits", {
          p_clerk_id: userId,
          p_amount: -cost, // negative = credit back
          p_reason: REASON_BY_MODE[mode],
        });
      } catch {
        // best-effort refund, don't fail the response
      }
    }
    const message = err instanceof Error ? err.message : "Optimization failed";
    
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: userId,
      event: "optimization_failed",
      properties: { mode, error_type: "OPTIMIZATION_FAILED", detail: message }
    });
    await shutdownPosthog();
    
    return Response.json(
      { error: "optimization_failed", detail: message },
      { status: 502, headers: corsHeaders }
    );
  }

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: userId,
    event: "optimization_run",
    properties: { mode, credits_balance: newBalance, cost, source: "api" }
  });
  await shutdownPosthog();

  return Response.json(
    { result, creditsBalance: newBalance },
    { headers: corsHeaders }
  );
}

/**
 * Run prompt optimization via OpenRouter API based on mode:
 *   quick    → openai/gpt-4o-mini
 *   advanced → anthropic/claude-3.5-sonnet
 *   max      → openai/gpt-4o
 */
async function runOptimization(
  prompt: string,
  mode: OptimizationMode
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    // If no OpenRouter key is configured, return a structured fallback response for testing
    return `[${mode.toUpperCase()} OPTIMIZED PROMPT]

**Role:** Senior Domain Expert & Systems Architect

**Task:** ${prompt}

**Context:** High-density, professional contextual requirements applied via PromptPro ${mode.toUpperCase()} engine.

**Format:** Provide a clear, step-by-step response with concrete examples and no generic preambles.

**Constraints:** Avoid filler phrases, redundant introductions, or conversational meta-text.`;
  }

  const modelMap: Record<OptimizationMode, string> = {
    quick: "openai/gpt-4o-mini",
    advanced: "anthropic/claude-3.5-sonnet",
    max: "openai/gpt-4o",
  };

  const selectedModel = modelMap[mode] || "openai/gpt-4o-mini";

  const systemPrompt = `You are PromptPro, an elite prompt engineering AI. Your job is to rewrite and optimize the user's input prompt into a high-performance prompt.

Mode [${mode.toUpperCase()}]:
- Provide a structured 5-component decomposition prompt.
- Output MUST start directly with "**Role:**"
- Format required:
**Role:** [Expert role definition]
**Task:** [Clarified core task]
**Context:** [Preserved and expanded context]
**Format:** [Clear output format specification]
**Constraints:** [Established quality constraints]

CRITICAL CONSTRAINTS:
1. Output ONLY the raw, enhanced prompt that the user will copy and paste.
2. Do NOT include any greetings, preambles, introductory remarks (e.g. "Here is the prompt:"), explanations, or code block backticks.
3. Start directly with "**Role:**".`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/shreshtha-bhushan/prompt.pro",
      "X-Title": "PromptPro Optimize API"
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("OpenRouter returned an empty response.");
  }

  let cleaned = content.trim();
  if (cleaned.startsWith("```") && cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trim();
  }

  return cleaned;
}

