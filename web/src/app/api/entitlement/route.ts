/**
 * PromptPro — /api/entitlement — Extension-facing entitlement snapshot
 *
 * Called by the extension service worker to get the current user's plan tier,
 * credit balance, and allowed optimization modes.
 *
 * Auth: Bearer token (Clerk JWT) in Authorization header.
 * The extension sends the token it already has from the authSession cache.
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, type PlanTier, type OptimizationMode } from "@/lib/plans";
import { ensureProfile } from "@/lib/entitlement";
import { getRole } from "@/lib/roles";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  // Ensure a profile row exists for new users
  await ensureProfile(userId);

  let isAdmin = false;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    isAdmin = getRole(user) === "admin";
  } catch (e) {}

  let data: any = null;
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_tier, credits_balance, credits_reset_at, plan_status, whop_customer_id")
      .eq("clerk_id", userId)
      .maybeSingle();

    data = profile;
  } catch (err) {
    console.error("[/api/entitlement] DB query error:", err);
  }

  const tier = (isAdmin ? "admin" : (data?.plan_tier ?? "free")) as PlanTier;
  const limits = PLAN_LIMITS[tier] || PLAN_LIMITS.free;

  const snapshot = {
    tier,
    isAdmin,
    creditsBalance: isAdmin ? 999999 : (data?.credits_balance ?? 50),
    creditsResetAt: data?.credits_reset_at ?? null,
    planStatus: isAdmin ? "active" : (data?.plan_status ?? "none"),
    whopCustomerId: data?.whop_customer_id ?? null,
    allowedModes: (isAdmin ? ["quick", "advanced", "max"] : limits.allowedModes) as OptimizationMode[],
    monthlyCredits: isAdmin ? 999999 : limits.monthlyCredits,
    checkedAt: new Date().toISOString(),
  };

  return Response.json(snapshot, { headers: corsHeaders });
}
