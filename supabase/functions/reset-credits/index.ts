/**
 * PromptPro — Monthly Credit Reset Edge Function
 *
 * Scans all profiles where credits_reset_at <= now() and resets their
 * credit balance to the plan allotment. Does NOT roll over unused credits.
 *
 * Schedule: Run hourly via Supabase Edge Function scheduler:
 *   supabase functions schedule reset-credits --cron "0 * * * *"
 *
 * Or configure via pg_cron in Supabase:
 *   SELECT cron.schedule(
 *     'reset-credits-hourly',
 *     '0 * * * *',
 *     $$SELECT net.http_post(url:='<YOUR_SUPABASE_FUNCTIONS_URL>/reset-credits',
 *              headers:='{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb)$$
 *   );
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { PLAN_LIMITS_MONTHLY } from "./plan-limits.ts";

Deno.serve(async (req: Request) => {
  // Basic auth check — the function should only be called by the scheduler
  // or an admin with the service role key
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey && authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch all profiles with a reset date in the past
  const { data: due, error: fetchErr } = await supabase
    .from("profiles")
    .select("clerk_id, plan_tier")
    .not("clerk_id", "is", null)
    .lte("credits_reset_at", new Date().toISOString());

  if (fetchErr) {
    console.error("[reset-credits] Fetch error:", fetchErr);
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!due || due.length === 0) {
    return new Response(JSON.stringify({ reset: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const resetAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  let resetCount = 0;
  const errors: string[] = [];

  for (const profile of due) {
    const tier = (profile.plan_tier ?? "free") as "free" | "plus" | "max";
    const allotment = PLAN_LIMITS_MONTHLY[tier] ?? 50;
    const clerkId = profile.clerk_id as string;
    if (!clerkId) continue;

    // Update balance — overwrite (no rollover), per product decision
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        credits_balance: allotment,
        credits_reset_at: resetAt,
      })
      .eq("clerk_id", clerkId);

    if (updateErr) {
      errors.push(`${clerkId}: ${updateErr.message}`);
      continue;
    }

    // Insert audit ledger row
    const { error: ledgerErr } = await supabase
      .from("credit_ledger")
      .insert({
        profile_clerk_id: clerkId,
        delta: allotment,
        reason: "monthly_reset",
      });

    if (ledgerErr) {
      // Log but don't fail the reset — balance update already succeeded
      console.warn(`[reset-credits] Ledger insert failed for ${clerkId}:`, ledgerErr);
    }

    resetCount++;
  }

  console.log(`[reset-credits] Reset ${resetCount}/${due.length} profiles`);
  if (errors.length > 0) {
    console.error("[reset-credits] Errors:", errors);
  }

  return new Response(
    JSON.stringify({ reset: resetCount, total: due.length, errors }),
    { headers: { "Content-Type": "application/json" } }
  );
});
