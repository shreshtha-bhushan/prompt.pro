"use client";

/**
 * PromptPro — Admin Table with credit grant action
 *
 * Renders a searchable table of user profiles.
 * The "Grant Credits" action calls /api/admin/grant-credits which
 * uses spend_credits with a negative delta (i.e. adds credits).
 */

import { useState, useMemo } from "react";
import { Search, Gift } from "lucide-react";

interface Profile {
  clerk_id: string;
  plan_tier: string;
  plan_status: string;
  credits_balance: number;
  credits_reset_at: string;
  plan_updated_at: string;
}

interface AdminTableProps {
  profiles: Profile[];
}

const TIER_COLORS: Record<string, string> = {
  free: "rgba(255,255,255,0.3)",
  plus: "rgba(52,199,89,0.9)",
  max: "rgba(255,159,10,0.9)",
};

const STATUS_COLORS: Record<string, string> = {
  active: "rgba(52,199,89,0.9)",
  past_due: "rgba(255,159,10,0.9)",
  canceled: "rgba(255,69,58,0.85)",
  none: "rgba(255,255,255,0.25)",
};

export function AdminTable({ profiles }: AdminTableProps) {
  const [query, setQuery] = useState("");
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [grantAmounts, setGrantAmounts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      profiles.filter(
        (p) =>
          p.clerk_id.toLowerCase().includes(query.toLowerCase()) ||
          p.plan_tier.includes(query.toLowerCase()) ||
          p.plan_status.includes(query.toLowerCase())
      ),
    [profiles, query]
  );

  async function handleGrant(profileId: string) {
    const amount = parseInt(grantAmounts[profileId] ?? "0", 10);
    if (!amount || amount <= 0 || amount > 10000) {
      setFeedback((f) => ({ ...f, [profileId]: "Enter 1–10000 credits" }));
      return;
    }

    setGrantingId(profileId);
    try {
      const res = await fetch("/api/admin/grant-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, amount }),
      });
      const json = await res.json();
      if (res.ok) {
        setFeedback((f) => ({
          ...f,
          [profileId]: `✓ Granted ${amount} credits (new balance: ${json.newBalance})`,
        }));
        setGrantAmounts((a) => ({ ...a, [profileId]: "" }));
      } else {
        setFeedback((f) => ({ ...f, [profileId]: json.error ?? "Failed" }));
      }
    } catch {
      setFeedback((f) => ({ ...f, [profileId]: "Network error" }));
    } finally {
      setGrantingId(null);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#151515",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Search bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <Search className="w-4 h-4 text-white/30 shrink-0" />
        <input
          type="text"
          placeholder="Search by user id, tier, or status…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-[13px] text-white placeholder-white/25 outline-none"
        />
        <span className="text-[11px] font-mono text-white/25">
          {filtered.length} / {profiles.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {["User ID", "Tier", "Status", "Credits", "Reset At", "Grant Credits"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left font-mono text-white/30 uppercase tracking-wider text-[10px]"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.clerk_id}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 font-mono text-white/50 text-[11px] max-w-[200px] truncate">
                  {p.clerk_id}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase"
                    style={{
                      color: TIER_COLORS[p.plan_tier] ?? "rgba(255,255,255,0.4)",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    {p.plan_tier}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: STATUS_COLORS[p.plan_status] ?? "rgba(255,255,255,0.3)" }}
                  >
                    {p.plan_status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-white/70">
                  {p.credits_balance}
                </td>
                <td className="px-4 py-3 font-mono text-white/30 text-[11px]">
                  {p.credits_reset_at
                    ? new Date(p.credits_reset_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      placeholder="Amount"
                      value={grantAmounts[p.clerk_id] ?? ""}
                      onChange={(e) =>
                        setGrantAmounts((a) => ({ ...a, [p.clerk_id]: e.target.value }))
                      }
                      className="w-20 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1 text-[12px] text-white outline-none focus:border-white/20 transition-colors"
                    />
                    <button
                      onClick={() => handleGrant(p.clerk_id)}
                      disabled={grantingId === p.clerk_id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                      style={{
                        background: "rgba(52,199,89,0.10)",
                        border: "1px solid rgba(52,199,89,0.2)",
                        color: "rgba(52,199,89,0.9)",
                        opacity: grantingId === p.clerk_id ? 0.5 : 1,
                      }}
                    >
                      <Gift className="w-3 h-3" />
                      {grantingId === p.clerk_id ? "…" : "Grant"}
                    </button>
                  </div>
                  {feedback[p.clerk_id] && (
                    <div className="mt-1 text-[10px] font-mono text-white/40">
                      {feedback[p.clerk_id]}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-white/25">
                  No profiles match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
