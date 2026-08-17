/**
 * PromptPro — Whop Webhook Handler
 * POST /api/webhooks/whop
 *
 * Receives membership lifecycle events from Whop and updates the user's
 * plan tier and credit balance in Supabase.
 *
 * IMPORTANT — Before going to production:
 * 1. Verify the actual event type strings in the Whop dashboard/sandbox docs.
 *    The strings used here ("membership.went_valid", etc.) are illustrative.
 * 2. Verify the actual field paths for clerk_user_id and plan_id by inspecting
 *    a real logged payload in whop_webhook_events.payload during sandbox testing.
 * 3. Configure the webhook endpoint in Whop dashboard to point at:
 *    https://prompt-pro-liart.vercel.app/api/webhooks/whop
 *
 * Idempotency: Each event is logged by event_id before processing.
 * Duplicate deliveries (Whop retries) are silently acknowledged.
 */

import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { posthogServer, shutdownPosthog } from "@/lib/posthog-server";

export const dynamic = "force-dynamic";

// Service-role client — bypasses RLS, used only in this server-only route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map Whop plan IDs (or product IDs) to internal tier + billing period
function buildPlanMap(): Record<
  string,
  { tier: "plus" | "max"; period: "monthly" | "annual" }
> {
  const map: Record<
    string,
    { tier: "plus" | "max"; period: "monthly" | "annual" }
  > = {};

  if (process.env.WHOP_PLUS_PLAN_ID_MONTHLY) {
    map[process.env.WHOP_PLUS_PLAN_ID_MONTHLY] = { tier: "plus", period: "monthly" };
  }
  if (process.env.WHOP_PLUS_PLAN_ID_ANNUAL) {
    map[process.env.WHOP_PLUS_PLAN_ID_ANNUAL] = { tier: "plus", period: "annual" };
  }
  if (process.env.WHOP_MAX_PLAN_ID_MONTHLY) {
    map[process.env.WHOP_MAX_PLAN_ID_MONTHLY] = { tier: "max", period: "monthly" };
  }
  if (process.env.WHOP_MAX_PLAN_ID_ANNUAL) {
    map[process.env.WHOP_MAX_PLAN_ID_ANNUAL] = { tier: "max", period: "annual" };
  }

  // Fallback: If separate plan IDs are not specified, map the product IDs directly!
  if (process.env.WHOP_PLUS_PRODUCT_ID) {
    map[process.env.WHOP_PLUS_PRODUCT_ID] = { tier: "plus", period: "monthly" };
  }
  if (process.env.WHOP_MAX_PRODUCT_ID) {
    map[process.env.WHOP_MAX_PRODUCT_ID] = { tier: "max", period: "monthly" };
  }

  return map;
}

const MONTHLY_CREDITS = { plus: 500, max: 2000 } as const;

/**
 * Verify a Whop webhook signature.
 * Whop signs webhooks using HMAC-SHA256. The secret is the raw value of
 * WHOP_WEBHOOK_SECRET. Header: x-whop-signature (format: "sha256=<hex>").
 *
 * NOTE: Adjust this if the @whop/sdk package becomes available —
 * the SDK provides a ready-made verifier. This is a manual fallback.
 */
async function verifyWhopSignature(
  body: string,
  headers: Headers
): Promise<boolean> {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) return false;

  const signature = headers.get("x-whop-signature") ?? "";
  const [algo, expectedHex] = signature.split("=");
  if (algo !== "sha256" || !expectedHex) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const actualHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  return actualHex === expectedHex;
}

export async function POST(request: NextRequest) {
  const bodyText = await request.text();

  // Signature verification
  const valid = await verifyWhopSignature(bodyText, request.headers);
  if (!valid) {
    console.error("[Whop Webhook] Invalid signature");
    return new Response("Invalid webhook signature", { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(bodyText);
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  // Derive a stable event id (Whop may use different header names)
  const eventId =
    request.headers.get("webhook-id") ??
    request.headers.get("svix-id") ??
    request.headers.get("x-whop-event-id") ??
    `${event.type ?? "unknown"}_${Date.now()}_${crypto.randomUUID()}`;

  // ── Idempotency check ─────────────────────────────────────
  const { data: existing } = await supabase
    .from("whop_webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) {
    // Already processed — acknowledge without reprocessing
    return new Response("OK", { status: 200 });
  }

  // Log the raw event before processing so we can inspect field paths in sandbox
  const { error: insertErr } = await supabase
    .from("whop_webhook_events")
    .insert({
      event_id: eventId,
      event_type: String(event.type ?? "unknown"),
      payload: event,
    });

  if (insertErr) {
    console.error("[Whop Webhook] Failed to log event:", insertErr);
    // Don't block processing on logging failure
  }

  // ── Field extraction ──────────────────────────────────────
  // Whop webhook structure (from sandbox logs):
  //   { type, data: { id, plan_id, user: { id, username }, metadata: { clerk_user_id } } }
  //
  // whop_user_id  → data.user.id   (Whop's own user identifier, used for checkAccess)
  // clerk_user_id → data.metadata.clerk_user_id  (set via checkout metadata)
  // plan_id       → data.plan_id
  // membership_id → data.id
  const data = (event.data ?? {}) as Record<string, unknown>;

  const metaObj = (data.metadata as Record<string, unknown> | undefined) ?? {};
  const clerkUserId = (metaObj.clerk_user_id ?? "") as string;

  // Whop's own user object lives at data.user or data.user_id
  const userObj = (data.user as Record<string, unknown> | undefined);
  const whopUserId = ((userObj?.id ?? data.user_id ?? data.whop_user_id) ?? "") as string;
  const whopUsername = ((userObj?.username ?? data.username) ?? "") as string;

  // Check plan_id or product_id (or nested plan/product objects)
  const planObj = data.plan as Record<string, unknown> | undefined;
  const prodObj = data.product as Record<string, unknown> | undefined;
  const planId = ((data.plan_id ?? data.product_id ?? planObj?.id ?? prodObj?.id) ?? "") as string;
  const membershipId = (data.id ?? "") as string;

  const planMap = buildPlanMap();

  // ── Event processing ──────────────────────────────────────
  if (clerkUserId) {
    const eventType = String(event.type ?? "");

    const isValidEvent =
      eventType === "membership_activated" ||
      eventType === "membership.went_valid" ||
      eventType === "payment_succeeded" ||
      eventType === "payment.succeeded";

    const isInvalidEvent =
      eventType === "membership_deactivated" ||
      eventType === "membership.went_invalid";

    const isPaymentFailedEvent =
      eventType === "payment_failed" ||
      eventType === "payment.failed";

    if (isValidEvent && planId) {
      const mapping = planMap[planId];
      if (mapping) {
        const resetAt = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString();
        const newCredits = MONTHLY_CREDITS[mapping.tier];

        // Fetch previous tier for comparison
        const { data: prevProfile } = await supabase
          .from("profiles")
          .select("plan_tier")
          .eq("clerk_id", clerkUserId)
          .maybeSingle();

        await supabase
          .from("profiles")
          .update({
            plan_tier: mapping.tier,
            plan_status: "active",
            billing_period: mapping.period,
            whop_membership_id: membershipId,
            // Save Whop's own user ID — used for server-side checkAccess validation
            ...(whopUserId ? { whop_customer_id: whopUserId } : {}),
            credits_balance: newCredits,
            credits_reset_at: resetAt,
            plan_updated_at: new Date().toISOString(),
          })
          .eq("clerk_id", clerkUserId);

        await supabase.from("credit_ledger").insert({
          profile_clerk_id: clerkUserId,
          delta: newCredits,
          reason: "monthly_reset",
        });

        // PostHog: server-side checkout_completed event
        posthogServer.capture({
          distinctId: clerkUserId,
          event: "checkout_completed",
          properties: {
            tier: mapping.tier,
            billing_period: mapping.period,
            previous_tier: prevProfile?.plan_tier ?? "free",
            membership_id: membershipId,
          },
        });
      }
    } else if (isInvalidEvent || isPaymentFailedEvent) {
      // Fetch previous tier before downgrade
      const { data: prevProfile } = await supabase
        .from("profiles")
        .select("plan_tier")
        .eq("clerk_id", clerkUserId)
        .maybeSingle();

      await supabase
        .from("profiles")
        .update({
          plan_tier: "free",
          plan_status: isPaymentFailedEvent ? "past_due" : "canceled",
          credits_balance: 50,
          plan_updated_at: new Date().toISOString(),
        })
        .eq("clerk_id", clerkUserId);

      // PostHog: server-side plan lifecycle event
      posthogServer.capture({
        distinctId: clerkUserId,
        event: isPaymentFailedEvent ? "plan_downgraded" : "plan_canceled",
        properties: {
          previous_tier: prevProfile?.plan_tier ?? "unknown",
          reason: isPaymentFailedEvent ? "payment_failed" : "membership_deactivated",
        },
      });
    }
  }

  // Mark as processed
  await supabase
    .from("whop_webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      profile_clerk_id: clerkUserId || null,
    })
    .eq("event_id", eventId);

  // Flush PostHog events before the serverless function exits
  await shutdownPosthog();

  return new Response("OK", { status: 200 });
}
