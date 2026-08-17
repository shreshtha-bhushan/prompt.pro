"use client"

import * as React from "react"
import { UsageMeter } from "@/components/shared/UsageMeter"
import type { EntitlementSnapshot } from "@/lib/entitlement"
import { PLAN_CONFIG, type PlanTier } from "@/lib/plans"
import { Check, Sparkles, Zap, Rocket, Crown, ExternalLink, ShieldCheck, Lock } from "lucide-react"

interface BillingClientProps {
  entitlement: EntitlementSnapshot | null
}

const MODE_ICONS = {
  quick: Zap,
  advanced: Rocket,
  max: Crown,
}

const MODE_EMOJIS = {
  quick: "⚡",
  advanced: "🚀",
  max: "👑",
}

export function BillingClient({ entitlement }: BillingClientProps) {
  const currentTier = entitlement?.tier || "free"
  const isAdmin = entitlement?.isAdmin || false
  const planStatus = entitlement?.planStatus || "none"

  const handleManageBilling = () => {
    window.open("https://whop.com/hub", "_blank", "noopener,noreferrer")
  }

  const plans = (["free", "plus", "max"] as PlanTier[]).map((tierKey) => {
    const p = PLAN_CONFIG[tierKey]
    return {
      id: p.id,
      name: p.name,
      price: p.price === 0 ? "$0" : `$${p.price}`,
      period: p.period,
      badge: (p as any).badge,
      description: p.description,
      credits: `${p.monthlyCredits.toLocaleString()} optimization credits / mo`,
      modes: (["quick", "advanced", "max"] as const).map((mKey) => {
        const m = p.modes[mKey]
        return {
          id: mKey,
          name: mKey.charAt(0).toUpperCase() + mKey.slice(1),
          icon: MODE_ICONS[mKey],
          emoji: MODE_EMOJIS[mKey],
          cost: `${m.credits} cr`,
          enabled: m.enabled,
          requiredTier: (m as any).requiredTier,
        }
      }),
      features: p.features,
    }
  })

  return (
    <div className="space-y-8">
      {/* Header with Title and Current Plan */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-white mb-1">
            Billing &amp; Subscription
          </h1>
          <p className="text-[14px] text-white/50">
            Manage your PromptPro plan, view credit consumption, and configure invoices.
          </p>
        </div>

        {/* Current Plan Badge & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <span className="text-[12px] text-white/50">Current Plan:</span>
            {isAdmin ? (
              <span className="px-2 py-0.5 rounded-[4px] bg-white/20 text-white text-[10px] font-bold tracking-wider uppercase font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                ADMIN (ALL ACCESS)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-[4px] bg-white text-black text-[10px] font-bold tracking-wider uppercase font-mono">
                {currentTier}
              </span>
            )}
          </div>

          {currentTier !== "free" && !isAdmin && (
            <button
              type="button"
              onClick={handleManageBilling}
              className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-[12px] font-medium text-white transition-all"
            >
              <span>Manage Billing</span>
              <ExternalLink className="w-3.5 h-3.5 text-white/60" />
            </button>
          )}
        </div>
      </div>

      {/* Usage Meter Card — Full Width */}
      <div className="card p-6 border border-white/[0.06] bg-[#1A1A1C]">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] mb-5">
          <div>
            <h2 className="text-[16px] font-semibold text-white">Monthly Credit Usage</h2>
            <p className="text-[12px] text-white/40">
              Credits reset every 30 days based on your active billing cycle.
            </p>
          </div>
          {!isAdmin && currentTier === "free" && (
            <a
              href="/upgrade"
              className="inline-flex items-center gap-1.5 h-[32px] px-4 rounded-xl bg-white text-[#111111] text-[12px] font-semibold hover:bg-white/90 transition-all"
            >
              <span>Upgrade Plan</span>
            </a>
          )}
        </div>

        <UsageMeter
          balance={entitlement?.creditsBalance}
          allotment={entitlement?.limits?.monthlyCredits}
          resetAt={entitlement?.creditsResetAt}
          tier={currentTier}
          isAdmin={isAdmin}
          planStatus={planStatus}
          showUpgradeLink={true}
          className="pt-1"
        />
      </div>

      {/* Compact 3-Column Plan Mini-Comparison */}
      <div>
        <div className="mb-4">
          <h2 className="text-[18px] font-semibold text-white mb-1">Available Plans</h2>
          <p className="text-[13px] text-white/50">
            Choose the plan that best fits your workflow requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p) => {
            const isCurrent = currentTier === p.id && !isAdmin
            const isTargetHigher =
              (currentTier === "free" && (p.id === "plus" || p.id === "max")) ||
              (currentTier === "plus" && p.id === "max")

            return (
              <div
                key={p.id}
                className={`card p-6 border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? "border-white/20 bg-white/[0.04] shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                    : "border-white/[0.06] bg-[#1A1A1C] hover:border-white/[0.12]"
                }`}
              >
                <div>
                  {/* Plan Top Label */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[18px] font-semibold text-white">{p.name}</span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-[4px] bg-white text-black text-[9px] font-bold tracking-wider uppercase font-mono">
                          Current
                        </span>
                      )}
                    </div>
                    {p.badge && (
                      <span className="px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/[0.12] text-[10px] font-mono text-white/80 font-medium">
                        {p.badge}
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5 mb-3">
                    <span className="text-[28px] font-bold tracking-tight text-white">
                      {p.price}
                    </span>
                    <span className="text-[12px] font-mono text-white/40">{p.period}</span>
                  </div>

                  <p className="text-[12px] text-white/50 mb-5 leading-relaxed min-h-[36px]">
                    {p.description}
                  </p>

                  <div className="h-px bg-white/[0.06] mb-4" />

                  {/* Modes supported */}
                  <div className="mb-5">
                    <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-white/40 mb-2.5">
                      Optimization Modes
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {p.modes.map((m) => {
                        const Icon = m.icon
                        return (
                          <div
                            key={m.name}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                              m.enabled
                                ? "bg-white/[0.04] border-white/[0.08] text-white/90"
                                : "bg-transparent border-white/[0.03] text-white/30 opacity-40"
                            }`}
                          >
                            <span className="text-[14px] leading-none mb-1 inline-flex items-center justify-center select-none" style={{ filter: m.enabled ? "grayscale(100%) brightness(1.2)" : "grayscale(100%) opacity(0.4)" }}>
                              {m.emoji}
                            </span>
                            <span className="text-[11px] font-medium leading-tight truncate w-full">{m.name}</span>
                            <div className="mt-1 flex items-center justify-center">
                              {m.enabled ? (
                                <span className="font-mono text-[10px] text-white/50 font-medium">
                                  {m.cost}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 font-mono text-[9px] text-white/30 tracking-tight">
                                  <Lock className="w-2.5 h-2.5 shrink-0" />
                                  <span>{m.requiredTier === 'max' ? 'Max' : 'Plus'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Features list */}
                  <div className="space-y-2 mb-6">
                    <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-white/40 mb-1">
                      Included
                    </div>
                    {p.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2 text-[12px] text-white/70">
                        <Check className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Action CTA */}
                <div>
                  {isAdmin ? (
                    <button
                      type="button"
                      disabled
                      className="w-full h-[38px] rounded-xl bg-white/[0.04] text-white/40 text-[12px] font-semibold cursor-default flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Included with Admin</span>
                    </button>
                  ) : isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full h-[38px] rounded-xl bg-white/[0.08] text-white/40 text-[13px] font-semibold cursor-default"
                    >
                      Active Plan
                    </button>
                  ) : isTargetHigher ? (
                    <a
                      href={`/upgrade?tier=${p.id}`}
                      className="w-full h-[38px] rounded-xl bg-white text-[#111111] text-[13px] font-semibold hover:bg-white/90 transition-all flex items-center justify-center"
                    >
                      Upgrade to {p.name} →
                    </a>
                  ) : (
                    <a
                      href="/upgrade"
                      className="w-full h-[38px] rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08] text-[13px] font-semibold transition-all flex items-center justify-center"
                    >
                      Select Plan
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
