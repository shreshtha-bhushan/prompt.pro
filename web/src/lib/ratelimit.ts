/**
 * PromptPro — Serverless Rate Limiting via Upstash Redis
 *
 * Tiered limits:
 *   - /api/optimize & /api/upgrade : 20 requests / 60s per user
 *   - /api/extension/sync          : 60 requests / 60s per user
 *   - /api/admin/grant-credits     : 10 requests / 60s per user
 *   - /api/webhooks/whop           : 120 requests / 60s per origin/source
 *
 * FAIL-OPEN BEHAVIOR:
 * If UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN are missing from environment,
 * this module logs a prominent warning and allows requests through to avoid crashing the app.
 */

import { NextResponse } from "next/server";

export type RateLimitType = "optimize" | "sync" | "admin" | "webhook";

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

let warnedMissingEnv = false;

// In-memory fallback sliding window for basic local protection if Upstash is unconfigured
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function checkInMemoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const record = inMemoryStore.get(key);

  if (!record || now > record.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  if (record.count >= limit) {
    return { success: false, limit, remaining: 0, reset: record.resetAt };
  }

  record.count += 1;
  return { success: true, limit, remaining: limit - record.count, reset: record.resetAt };
}

export async function rateLimit(
  type: RateLimitType,
  identifier: string
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!warnedMissingEnv) {
      console.warn(
        "\n===================================================================\n" +
        "[CRITICAL WARNING] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing!\n" +
        "Serverless rate limiting is operating in fallback mode.\n" +
        "Please provision an Upstash Redis database and set these environment variables.\n" +
        "===================================================================\n"
      );
      warnedMissingEnv = true;
    }

    // Fallback: apply local in-memory limits to prevent runaway loops in development
    const limits: Record<RateLimitType, { max: number; windowMs: number }> = {
      optimize: { max: 20, windowMs: 60_000 },
      sync: { max: 60, windowMs: 60_000 },
      admin: { max: 10, windowMs: 60_000 },
      webhook: { max: 120, windowMs: 60_000 },
    };

    const cfg = limits[type] || { max: 30, windowMs: 60_000 };
    return checkInMemoryLimit(`${type}:${identifier}`, cfg.max, cfg.windowMs);
  }

  try {
    // Dynamic import to support environments without node_modules compiled at startup
    const { Redis } = await import("@upstash/redis");
    const { Ratelimit } = await import("@upstash/ratelimit");

    const redis = new Redis({ url, token });

    const configs: Record<RateLimitType, { max: number; window: `${number} s` | `${number} m` }> = {
      optimize: { max: 20, window: "60 s" },
      sync: { max: 60, window: "60 s" },
      admin: { max: 10, window: "60 s" },
      webhook: { max: 120, window: "60 s" },
    };

    const selected = configs[type];
    const ratelimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(selected.max, selected.window),
      prefix: `promptpro:ratelimit:${type}`,
      analytics: false,
    });

    const res = await ratelimiter.limit(identifier);
    return {
      success: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
    };
  } catch (err) {
    console.error("[RateLimit] Upstash execution error (failing open):", err);
    return {
      success: true,
      limit: 100,
      remaining: 100,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Returns a standardized 429 Too Many Requests response with RFC-compliant headers.
 */
export function buildRateLimitResponse(
  result: RateLimitResult,
  extraHeaders: Record<string, string> = {}
) {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));

  return NextResponse.json(
    {
      error: "too_many_requests",
      message: `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
      code: "RATE_LIMITED",
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
        ...extraHeaders,
      },
    }
  );
}
