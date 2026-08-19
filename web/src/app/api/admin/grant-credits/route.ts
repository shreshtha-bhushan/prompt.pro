/**
 * PromptPro — Admin Credit Grant API Route
 * POST /api/admin/grant-credits
 *
 * Security:
 *   1. Clerk authentication required
 *   2. Strict server-side RBAC verification (publicMetadata.role === "admin")
 *   3. Rate limiting (10 requests / 60s)
 *   4. Zod schema validation
 *   5. Atomic credit addition via spend_credits() Postgres RPC with negative delta
 *   6. Sanitized error messages
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { getRole } from "@/lib/roles";
import { rateLimit, buildRateLimitResponse } from "@/lib/ratelimit";
import { adminGrantCreditsSchema } from "@/lib/validations/api";
import { getCorsHeaders, handleOptions } from "@/lib/cors";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  // ── 1. Authentication ─────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized", code: "AUTH_REQUIRED" },
      { status: 401, headers: corsHeaders }
    );
  }

  // ── 2. Rate Limiting ──────────────────────────────────────
  const rateLimitResult = await rateLimit("admin", userId);
  if (!rateLimitResult.success) {
    return buildRateLimitResponse(rateLimitResult, corsHeaders);
  }

  // ── 3. Strict Server-Side Admin Authorization ─────────────
  let isAdmin = false;
  try {
    const client = await clerkClient();
    const adminUser = await client.users.getUser(userId);
    isAdmin = getRole(adminUser) === "admin";
  } catch (err) {
    console.error("[admin/grant-credits] Failed to verify user metadata:", err);
  }

  if (!isAdmin) {
    return NextResponse.json(
      { error: "forbidden", message: "Admin access required.", code: "FORBIDDEN" },
      { status: 403, headers: corsHeaders }
    );
  }

  // ── 4. Input Validation via Zod ───────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", detail: "Request body must be valid JSON", code: "INVALID_JSON" },
      { status: 400, headers: corsHeaders }
    );
  }

  const parseResult = adminGrantCreditsSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "invalid_request",
        detail: parseResult.error.issues[0]?.message || "Validation failed",
        code: "VALIDATION_FAILED",
      },
      { status: 400, headers: corsHeaders }
    );
  }

  const { profileId, amount } = parseResult.data;

  // ── 5. Transactional Credit Grant RPC ─────────────────────
  const { data: newBalance, error } = await supabase.rpc("spend_credits", {
    p_clerk_id: profileId,
    p_amount: -amount, // negative delta = grant addition
    p_reason: "admin_grant",
  });

  if (error) {
    if (error.message?.includes("profile_not_found")) {
      return NextResponse.json(
        { error: "profile_not_found", message: "Target profile was not found.", code: "PROFILE_NOT_FOUND" },
        { status: 404, headers: corsHeaders }
      );
    }

    console.error("[admin/grant-credits] Error executing grant RPC:", error);
    return NextResponse.json(
      { error: "grant_failed", message: "Failed to update credits balance.", code: "GRANT_FAILED" },
      { status: 500, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    { success: true, newBalance, granted: amount },
    { headers: corsHeaders }
  );
}
