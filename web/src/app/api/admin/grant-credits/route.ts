/**
 * PromptPro — Admin credit grant API route
 * POST /api/admin/grant-credits
 *
 * Adds credits to a user's balance by calling spend_credits with a negative amount.
 * Inserts an admin_grant ledger row for audit trail.
 *
 * Access: admin role only (verified server-side on every request).
 */

import type { NextRequest } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { getRole } from "@/lib/roles";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // Auth + admin check
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const adminUser = await client.users.getUser(userId);
  if (getRole(adminUser) !== "admin") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  // Parse request
  const { profileId, amount } = await request.json();
  if (
    typeof profileId !== "string" ||
    typeof amount !== "number" ||
    amount <= 0 ||
    amount > 10000 ||
    !Number.isInteger(amount)
  ) {
    return Response.json(
      { error: "invalid_request", detail: "profileId (string) and amount (1–10000 integer) are required" },
      { status: 400 }
    );
  }

  // Grant credits: spend_credits with negative amount = credit addition
  const { data: newBalance, error } = await supabase.rpc("spend_credits", {
    p_clerk_id: profileId,  // profileId here is the Clerk user id
    p_amount: -amount,       // negative → increases the balance
    p_reason: "admin_grant",
  });

  if (error) {
    if (error.message?.includes("profile_not_found")) {
      return Response.json({ error: "profile_not_found" }, { status: 404 });
    }
    console.error("[admin/grant-credits] Error:", error);
    return Response.json({ error: "grant_failed" }, { status: 500 });
  }

  return Response.json({ success: true, newBalance, granted: amount });
}
