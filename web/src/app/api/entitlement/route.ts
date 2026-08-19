/**
 * PromptPro — /api/entitlement — Extension & UI Entitlement Snapshot
 *
 * Called by the extension service worker and UI components to get the
 * user's current plan tier, credit balance, and allowed optimization modes.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, type PlanTier, type OptimizationMode } from "@/lib/plans";
import { ensureProfile } from "@/lib/entitlement";
import { getRole } from "@/lib/roles";
import { getCorsHeaders, handleOptions } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized", code: "AUTH_REQUIRED" },
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
  } catch (e) {
    console.error("[/api/entitlement] Clerk user error:", e);
  }

  let data: { plan_tier?: string; credits_balance?: number; credits_reset_at?: string | null; plan_status?: string; whop_customer_id?: string | null } | null = null;
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

  return NextResponse.json(snapshot, { headers: corsHeaders });
}
