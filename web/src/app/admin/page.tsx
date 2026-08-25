/**
 * PromptPro — Admin Dashboard
 *
 * Minimum admin tooling for this pass:
 *   - Searchable table of all user profiles (plan tier, credits, status)
 *   - Manual credit grant action (inserts admin_grant ledger row)
 *
 * Access: admin role only (enforced in admin/layout.tsx)
 */

import { getAdminClient } from "@/lib/supabase/admin";
import { AdminTable } from "@/components/admin/AdminTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = getAdminClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("clerk_id, plan_tier, plan_status, credits_balance, credits_reset_at, plan_updated_at")
    .not("clerk_id", "is", null)
    .order("plan_updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="text-[13px] text-red-400 font-mono">
        Error loading profiles: {error.message}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">
          User Management
        </div>
        <h1 className="text-[22px] font-semibold text-white">
          Profiles ({profiles?.length ?? 0})
        </h1>
      </div>

      <AdminTable profiles={profiles ?? []} />
    </div>
  );
}
