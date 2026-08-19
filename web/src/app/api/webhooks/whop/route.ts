/**
 * PromptPro — Whop Webhook Handler
 * POST /api/webhooks/whop
 *
 * Security & Hardening:
 *   1. HMAC-SHA256 signature verification with constant-time comparison (timing-safe)
 *   2. Strict execution order: signature validated BEFORE any database access
 *   3. Deterministic idempotency key derivation (dedupes retries even if webhook headers are omitted)
 *   4. Safe payload extraction with defensive type checks
 *   5. Rate limiting protection for webhook endpoint
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { posthogServer, shutdownPosthog } from "@/lib/posthog-server";
import { rateLimit } from "@/lib/ratelimit";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
 * Constant-time comparison of webhook HMAC signature against computed hash
 */
async function verifyWhopSignature(
  body: string,
  headers: Headers
): Promise<boolean> {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) return false;

  const signatureHeader =
    headers.get("x-whop-signature") ??
    headers.get("webhook-signature") ??
    headers.get("svix-signature") ??
    "";

  if (!signatureHeader) return false;

  // Handle format "sha256=<hex>" or raw hex
  const parts = signatureHeader.split("=");
  const expectedHex = parts.length === 2 ? parts[1] : parts[0];
  if (!expectedHex) return false;

  const enc = new TextEncoder();
  const key = await crypto.webcrypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.webcrypto.subtle.sign("HMAC", key, enc.encode(body));
  const actualHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  try {
    const bufActual = Buffer.from(actualHex, "hex");
    const bufExpected = Buffer.from(expectedHex, "hex");
    if (bufActual.length !== bufExpected.length) return false;
    return crypto.timingSafeEqual(bufActual, bufExpected);
  } catch {
    return false;
  }
}

/**
 * Generate a deterministic hash for deduplicating retried webhooks
 */
function getDeterministicEventId(
  headers: Headers,
  eventType: string,
  data: Record<string, unknown>
): string {
  const explicitId =
    headers.get("webhook-id") ??
    headers.get("svix-id") ??
    headers.get("x-whop-event-id");

  if (explicitId && explicitId.trim().length > 0) {
    return explicitId.trim();
  }

  // Derive stable hash from payload attributes
  const membershipId = String(data.id ?? "");
  const planId = String(data.plan_id ?? data.product_id ?? "");
  const meta = (data.metadata as Record<string, unknown>) || {};
  const clerkUserId = String(meta.clerk_user_id ?? "");

  const fingerprint = `${eventType}:${clerkUserId}:${membershipId}:${planId}`;
  return crypto.createHash("sha256").update(fingerprint).digest("hex").slice(0, 36);
}

export async function POST(request: NextRequest) {
  // ── 1. Rate Limiting for Webhooks ─────────────────────────
  const clientIp = request.headers.get("x-forwarded-for") || "whop-webhook";
  const rateLimitResult = await rateLimit("webhook", clientIp);
  if (!rateLimitResult.success) {
    return new Response("Too many requests", { status: 429 });
  }

  const bodyText = await request.text();

  // ── 2. Signature Verification (Strictly BEFORE DB lookup) ──
  const valid = await verifyWhopSignature(bodyText, request.headers);
  if (!valid) {
    console.error("[Whop Webhook] Invalid webhook signature detected");
    return new Response("Invalid webhook signature", { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(bodyText);
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const data = (event.data ?? {}) as Record<string, unknown>;
  const eventType = String(event.type ?? "unknown");
  const eventId = getDeterministicEventId(request.headers, eventType, data);

  // ── 3. Idempotency Verification ───────────────────────────
  const { data: existing } = await supabase
    .from("whop_webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) {
    // Already processed — return 200 OK without re-running mutations
    return new Response("OK", { status: 200 });
  }

  // Log raw event
  const { error: insertErr } = await supabase
    .from("whop_webhook_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      payload: event,
    });

  if (insertErr) {
    console.error("[Whop Webhook] Failed to log raw webhook event:", insertErr);
  }

  // ── 4. Payload Extraction ─────────────────────────────────
  const metaObj = (data.metadata as Record<string, unknown> | undefined) ?? {};
  const clerkUserId = (metaObj.clerk_user_id ?? "") as string;

  const userObj = data.user as Record<string, unknown> | undefined;
  const whopUserId = ((userObj?.id ?? data.user_id ?? data.whop_user_id) ?? "") as string;

  const planObj = data.plan as Record<string, unknown> | undefined;
  const prodObj = data.product as Record<string, unknown> | undefined;
  const planId = ((data.plan_id ?? data.product_id ?? planObj?.id ?? prodObj?.id) ?? "") as string;
  const membershipId = (data.id ?? "") as string;

  const planMap = buildPlanMap();

  // ── 5. Event Processing ───────────────────────────────────
  if (clerkUserId) {
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
        const resetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const newCredits = MONTHLY_CREDITS[mapping.tier];

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

  // Mark event as processed
  await supabase
    .from("whop_webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      profile_clerk_id: clerkUserId || null,
    })
    .eq("event_id", eventId);

  await shutdownPosthog();

  return new Response("OK", { status: 200 });
}
