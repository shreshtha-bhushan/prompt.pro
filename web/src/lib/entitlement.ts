/**
 * PromptPro — Server-side entitlement fetch
 *
 * Used by Server Components and API routes that need the user's current
 * plan tier, credit balance, and feature limits.
 *
 * Uses the service-role Supabase client so it bypasses RLS — this is safe
 * because it only exposes data for the currently authenticated Clerk user.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { getAdminClient } from "./supabase/admin";
import { PLAN_LIMITS, type PlanTier, type OptimizationMode } from "./plans";
import { getRole } from "./roles";

/** The shape returned to both Server Components and the /api/entitlement route */
export type EntitlementSnapshot = {
  tier: PlanTier;
  isAdmin: boolean;
  creditsBalance: number;
  creditsResetAt: string | null;
  planStatus: string;
  whopCustomerId?: string | null;
  allowedModes: OptimizationMode[];
  limits: (typeof PLAN_LIMITS)[PlanTier];
  checkedAt: string;
};

/**
 * Fetch the current user's entitlement from Supabase.
 * Returns null if the user is not authenticated or has no profile row.
 *
 * Call this in Server Components:
 *   const entitlement = await getEntitlement()
 */
export async function getEntitlement(): Promise<EntitlementSnapshot | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser().catch(() => null);
  const isAdmin = getRole(user) === "admin";

  await ensureProfile(userId).catch(() => {});

  // Service-role client — bypasses RLS, safe for server-only use
  const supabase = getAdminClient();

  const { data } = await supabase
    .from("profiles")
    .select("plan_tier, credits_balance, credits_reset_at, plan_status, whop_customer_id")
    .eq("clerk_id", userId)
    .single();

  const tier = (data?.plan_tier ?? "free") as PlanTier;
  const limits = PLAN_LIMITS[tier] || PLAN_LIMITS.free;

  return {
    tier,
    isAdmin,
    creditsBalance: isAdmin ? 999999 : (data?.credits_balance ?? 50),
    creditsResetAt: data?.credits_reset_at ?? null,
    planStatus: data?.plan_status ?? "none",
    whopCustomerId: data?.whop_customer_id ?? null,
    allowedModes: (isAdmin ? ["quick", "advanced", "max"] : limits.allowedModes) as OptimizationMode[],
    limits,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Ensure a profile row exists for the given Clerk user id.
 * Called on first sign-in / sync — creates a row with free-tier defaults
 * if none exists. Safe to call repeatedly (upsert with no-op on conflict).
 */
export async function ensureProfile(userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id, clerk_id")
      .eq("clerk_id", userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("profiles").upsert(
        {
          clerk_id: userId,
          plan_tier: "free",
          plan_status: "none",
          credits_balance: 50,
        },
        { onConflict: "clerk_id", ignoreDuplicates: true }
      );
    }
  } catch (err) {
    console.error("[ensureProfile] Error:", err);
  }
}

/**
 * Live Whop access check via the official SDK `users.checkAccess` method.
 *
 * Used as a secondary guard in /api/optimize to catch membership revocations
 * that arrived after our webhook was processed, or in cases where the webhook
 * was missed / delayed.
 *
 * Returns true if the user currently has an active subscription to ANY of
 * the PromptPro paid product IDs configured via env vars. Returns false if
 * whop_customer_id is not set (free-tier users who never subscribed are skipped
 * gracefully — they are gated by plan_tier in the DB, not by Whop access).
 *
 * @param whopUserId  — the value stored in profiles.whop_customer_id
 * @param productId   — a WHOP_*_PRODUCT_ID env var (optional; checks all if omitted)
 */
export async function checkWhopAccess(
  whopUserId: string,
  productId?: string
): Promise<boolean> {
  if (!whopUserId) return false;

  // Only attempt if the SDK key is configured
  if (!process.env.WHOP_API_KEY) {
    console.warn("[checkWhopAccess] WHOP_API_KEY not set — skipping live check");
    return true; // fail-open during development
  }

  try {
    // Dynamic import avoids build errors before @whop/sdk is installed
    const { whop } = await import("./whop");

    // Check against all product IDs defined in env, or a specific one
    const productIds = productId
      ? [productId]
      : [
          process.env.WHOP_PLUS_PRODUCT_ID,
          process.env.WHOP_MAX_PRODUCT_ID,
        ].filter(Boolean) as string[];

    for (const pid of productIds) {
      const result = await whop.users.checkAccess(pid, { id: whopUserId });
      if (result.has_access) return true;
    }

    return false;
  } catch (err) {
    // Fail-open: if the SDK call throws (network error, invalid key, etc.),
    // fall back to the database plan_tier value rather than blocking the user
    console.error("[checkWhopAccess] SDK error — falling back to DB tier:", err);
    return true;
  }
}

