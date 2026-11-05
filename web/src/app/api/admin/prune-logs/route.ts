/**
 * PromptPro — 180-Day Log Retention Prune Endpoint
 * POST /api/admin/prune-logs
 * GET  /api/admin/prune-logs (for Vercel Cron invocation)
 *
 * Security & Compliance:
 *   1. Protected by CRON_SECRET header OR Clerk Admin RBAC
 *   2. Enforces strict 180-day data retention policy
 *   3. Calls PostgreSQL cleanup_old_optimization_logs() RPC with fallback to direct deletion
 *   4. Zero user data leakage
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getRole } from "@/lib/roles";
import { getCorsHeaders, handleOptions } from "@/lib/cors";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

async function authorizeRequest(request: NextRequest): Promise<{ authorized: boolean; reason?: string }> {
  // 1. Check CRON_SECRET (Vercel Cron / Automated Jobs)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") || "";
  if (cronSecret && authHeader.trim() === `Bearer ${cronSecret}`) {
    return { authorized: true };
  }

  // 2. Check Clerk Admin RBAC
  try {
    const { userId } = await auth();
    if (userId) {
      const client = await clerkClient();
      const adminUser = await client.users.getUser(userId);
      if (getRole(adminUser) === "admin") {
        return { authorized: true };
      }
    }
  } catch (_e) {
    // Auth failed
  }

  return { authorized: false, reason: "Admin role or valid CRON_SECRET required." };
}

async function handlePrune(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  const authCheck = await authorizeRequest(request);

  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: "forbidden", message: authCheck.reason, code: "FORBIDDEN" },
      { status: 403, headers: corsHeaders }
    );
  }

  const daysThreshold = 180;
  const cutoff = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000).toISOString();
  const supabase = getAdminClient();

  let prunedCount = 0;

  // 1. Attempt stored procedure RPC first
  const { data: rpcCount, error: rpcError } = await supabase.rpc(
    "cleanup_old_optimization_logs",
    { days_threshold: daysThreshold }
  );

  if (!rpcError && typeof rpcCount === "number") {
    prunedCount = rpcCount;
  } else {
    // 2. Fallback to direct time-window range deletion via service_role client
    const { count, error: deleteError } = await supabase
      .from("optimization_logs")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);

    if (deleteError) {
      console.error("[prune-logs] Direct deletion failed:", deleteError);
      return NextResponse.json(
        { error: "db_error", message: "Failed to prune optimization logs", code: "DB_ERROR" },
        { status: 500, headers: corsHeaders }
      );
    }
    prunedCount = count ?? 0;
  }

  console.log(`[prune-logs] Successfully pruned ${prunedCount} records older than ${cutoff} (180 days)`);

  return NextResponse.json(
    {
      success: true,
      prunedCount,
      retentionDays: daysThreshold,
      cutoffDate: cutoff,
      executedAt: new Date().toISOString(),
    },
    { status: 200, headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  return handlePrune(request);
}

export async function GET(request: NextRequest) {
  return handlePrune(request);
}
