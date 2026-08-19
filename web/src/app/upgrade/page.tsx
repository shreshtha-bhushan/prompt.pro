/**
 * PromptPro — Upgrade / Checkout Page
 *
 * Renders the Whop checkout embed for a specific plan tier + billing period.
 * The Clerk user id is passed as checkout metadata so the Whop webhook can
 * resolve which PromptPro profile to update when the membership goes valid.
 *
 * Usage:
 *   /upgrade                     → Plus monthly (default)
 *   /upgrade?tier=max&period=annual
 *
 * Note: This page is not the landing-page pricing display. It is only
 * reached when the user has decided to upgrade and clicks a CTA that
 * navigates here with the tier/period already resolved.
 */

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CheckoutEmbed } from "@/components/CheckoutEmbed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Upgrade Plan — PromptPro Plus & Max",
  description:
    "Upgrade your PromptPro workspace with Plus or Max plans to unlock deep reasoning prompt modes and expanded monthly credit limits.",
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; period?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const { tier = "plus", period = "monthly" } = await searchParams;

  const planIdMap: Record<string, string | undefined> = {
    "plus:monthly": process.env.WHOP_PLUS_PLAN_ID_MONTHLY || process.env.WHOP_PLUS_PRODUCT_ID,
    "plus:annual": process.env.WHOP_PLUS_PLAN_ID_ANNUAL || process.env.WHOP_PLUS_PRODUCT_ID,
    "max:monthly": process.env.WHOP_MAX_PLAN_ID_MONTHLY || process.env.WHOP_MAX_PRODUCT_ID,
    "max:annual": process.env.WHOP_MAX_PLAN_ID_ANNUAL || process.env.WHOP_MAX_PRODUCT_ID,
  };

  const planId = planIdMap[`${tier}:${period}`];

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#111111" }}>
      <div className="w-full max-w-lg">
        {/* Breadcrumb */}
        <div className="mb-6">
          <a
            href="/dashboard"
            className="text-[12px] font-mono text-white/40 hover:text-white/70 transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Card wrapper matching the "Precision Instrument" glass surface */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "#151515",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">
              Upgrade Plan
            </div>
            <div className="text-[20px] font-semibold text-white capitalize">
              {tier} · {period === "annual" ? "Annual" : "Monthly"}
            </div>
          </div>

          <div className="h-px bg-white/[0.05]" />

          {/* Checkout embed */}
          <div className="p-4">
            {planId ? (
              <CheckoutEmbed
                planId={planId}
                metadata={{ clerk_user_id: userId }}
              />
            ) : (
              <div className="py-8 text-center">
                <p className="text-[13px] text-white/40 mb-4">
                  This plan configuration is not available yet.
                </p>
                <a
                  href="/dashboard"
                  className="text-[13px] text-white/60 hover:text-white transition-colors underline"
                >
                  Return to Dashboard
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-4 flex items-center justify-center gap-6 text-[11px] text-white/30">
          <span>Secure checkout via Whop</span>
          <span>·</span>
          <span>Cancel anytime</span>
        </div>
      </div>
    </div>
  );
}
