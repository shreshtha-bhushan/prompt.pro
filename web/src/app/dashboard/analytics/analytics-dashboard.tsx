"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  Rocket,
  Crown,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Lock,
  RefreshCw,
  Info,
  CheckCircle2,
  Cpu,
  BarChart3,
  ExternalLink,
  Flame,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PromptProIcon } from "@/components/shared/PromptProIcon"
import { AnalyticsSkeleton } from "@/components/skeletons/AnalyticsSkeleton"
import { InlineError } from "@/components/ui/InlineError"

interface AnalyticsData {
  range: string
  tier: string
  isAdmin: boolean
  overview: {
    optimizations: {
      value: number
      prevValue: number
      changePct: number | null
    }
    creditsUsed: {
      value: number
      prevValue: number
      changePct: number | null
      monthlyAllowance: number
      usagePctOfAllowance: number
    }
    averageScore: {
      value: number | null
      prevValue: number | null
      changePct: number | null
      hasScoringData: boolean
    }
    activeDays: {
      value: number
      totalDays: number
      percentage: number
    }
  }
  activity: Array<{ date: string; optimizations: number; credits: number }>
  quality: {
    series: Array<{ date: string; originalScore: number; optimizedScore: number; count: number }>
    hasScoringData: boolean
    averageGain: number | null
  }
  modes: Array<{
    id: string
    label: string
    emoji: string
    creditsCost: number
    count: number
    percentage: number
    enabled: boolean
  }>
  platforms: Array<{
    name: string
    count: number
    percentage: number
  }>
  credits: {
    monthlyAllowance: number
    creditsUsed: number
    creditsRemaining: number
    usagePct: number
    dailyBurnRate: number
    projectedExhaustionDate: string | null
    hasProjectionData: boolean
  }
  heatmap: Array<{ date: string; count: number }>
  insights: string[]
  totalLogsCount: number
  updatedAt: string
}

const DATE_RANGES = [
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "1y", label: "1 Year" },
]

export function AnalyticsDashboard({ initialRange = "30d" }: { initialRange?: string }) {
  const [range, setRange] = useState(initialRange)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async (selectedRange: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analytics?range=${selectedRange}`)
      if (!res.ok) {
        throw new Error(`Failed to load analytics (${res.status})`)
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      console.error("[Analytics] fetch error:", err)
      setError(err.message || "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics(range)
  }, [range, fetchAnalytics])

  // ── 0. Initial Loading Skeleton ──
  if (loading && !data) {
    return <AnalyticsSkeleton />
  }

  // ── 1. Global Empty State (0 optimizations ever) ──
  if (!loading && data && data.totalLogsCount === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
          <div>
            <h1 className="text-[32px] font-semibold tracking-tight text-white mb-1">
              Analytics &amp; Intelligence
            </h1>
            <p className="text-[14px] text-white/50">
              Personalized telemetry, optimization quality curves, and credit efficiency.
            </p>
          </div>
        </div>

        <div className="card p-14 border border-white/[0.06] bg-[#1A1A1C] text-center max-w-lg mx-auto rounded-[28px] shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-white/60">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-[20px] font-semibold text-white mb-2">
            Your analytics will appear here
          </h3>
          <p className="text-[14px] text-white/50 mb-6 leading-relaxed">
            Start optimizing prompts via the Chrome Extension or Web Studio to track your speed, prompt quality, and credit efficiency.
          </p>
          <a
            href="/dashboard/optimization"
            className="inline-flex items-center gap-2 h-[40px] px-6 rounded-xl bg-white text-[#111111] text-[13px] font-semibold hover:bg-white/90 transition-all shadow-lg"
          >
            <PromptProIcon size={16} variant="transparent" className="text-[#111111]" />
            <span>Optimize Your First Prompt</span>
          </a>
        </div>
      </div>
    )
  }

  // ── 2. Error State ──
  if (error && !loading) {
    return (
      <div className="space-y-6 pt-4 max-w-xl mx-auto">
        <InlineError
          title="Analytics temporarily unavailable"
          message={error}
          onRetry={() => fetchAnalytics(range)}
        />
      </div>
    )
  }

  const overview = data?.overview
  const isFree = data?.tier === "free" && !data?.isAdmin

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-8">
        {/* ── Page Header + Date Range Selector ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[32px] font-semibold tracking-tight text-white mb-1">
                Analytics &amp; Intelligence
              </h1>
              {data?.isAdmin && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wider uppercase font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-[14px] text-white/50">
              Usage intelligence, prompt quality lift, platform distribution, and credit telemetry.
            </p>
          </div>

          {/* Date Range Selector Pill */}
          <div className="flex items-center gap-3">
            <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
              {DATE_RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-[12px] font-mono transition-all select-none ${
                    range === r.id
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-white/50 hover:text-white/90"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchAnalytics(range)}
              disabled={loading}
              title="Refresh analytics"
              className="w-[36px] h-[36px] flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 hover:text-white transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-white" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Overview 4-Column KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Optimizations */}
          <div className="card p-5 border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40 mb-3">
              <span className="text-[12px] font-mono uppercase tracking-wider">Optimizations</span>
              <Layers className="w-4 h-4 text-white/30" />
            </div>
            <div>
              <div className="text-[28px] font-bold text-white tracking-tight">
                {loading ? "..." : overview?.optimizations.value.toLocaleString() || "0"}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono">
                {overview?.optimizations.changePct !== null && overview?.optimizations.changePct !== undefined ? (
                  overview.optimizations.changePct >= 0 ? (
                    <span className="inline-flex items-center text-emerald-400 font-medium">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +{overview.optimizations.changePct.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-red-400 font-medium">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      {overview.optimizations.changePct.toFixed(1)}%
                    </span>
                  )
                ) : (
                  <span className="text-white/40">Baseline period</span>
                )}
                <span className="text-white/40">vs prior period</span>
              </div>
            </div>
          </div>

          {/* Card 2: Credits Used */}
          <div className="card p-5 border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40 mb-3">
              <span className="text-[12px] font-mono uppercase tracking-wider">Credits Used</span>
              <Zap className="w-4 h-4 text-white/30" />
            </div>
            <div>
              <div className="text-[28px] font-bold text-white tracking-tight">
                {loading ? "..." : overview?.creditsUsed.value.toLocaleString() || "0"}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                {data?.isAdmin ? (
                  <span className="text-white/60">Unlimited (Admin)</span>
                ) : (
                  <span className="text-white/50">
                    {overview?.creditsUsed.usagePctOfAllowance}% of monthly quota
                  </span>
                )}
                {overview?.creditsUsed.changePct !== null && overview?.creditsUsed.changePct !== undefined && (
                  <span className={overview.creditsUsed.changePct <= 0 ? "text-emerald-400" : "text-white/40"}>
                    {overview.creditsUsed.changePct > 0 ? `+${overview.creditsUsed.changePct.toFixed(1)}%` : `${overview.creditsUsed.changePct.toFixed(1)}%`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Avg Prompt Score */}
          <div className="card p-5 border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40 mb-3">
              <span className="text-[12px] font-mono uppercase tracking-wider">Avg. Prompt Score</span>
              <Sparkles className="w-4 h-4 text-white/30" />
            </div>
            <div>
              <div className="text-[28px] font-bold text-white tracking-tight">
                {loading
                  ? "..."
                  : overview?.averageScore.value !== null
                  ? `${overview?.averageScore.value}`
                  : "—"}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono">
                {overview?.averageScore.hasScoringData && overview.averageScore.changePct !== null ? (
                  <span className={overview.averageScore.changePct >= 0 ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
                    {overview.averageScore.changePct >= 0 ? `+${overview.averageScore.changePct}%` : `${overview.averageScore.changePct}%`}
                  </span>
                ) : (
                  <span className="text-white/40">
                    {overview?.averageScore.hasScoringData ? "Benchmark active" : "No scoring records"}
                  </span>
                )}
                {overview?.averageScore.hasScoringData && <span className="text-white/40">quality score</span>}
              </div>
            </div>
          </div>

          {/* Card 4: Active Days */}
          <div className="card p-5 border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40 mb-3">
              <span className="text-[12px] font-mono uppercase tracking-wider">Active Days</span>
              <Calendar className="w-4 h-4 text-white/30" />
            </div>
            <div>
              <div className="text-[28px] font-bold text-white tracking-tight">
                {loading ? "..." : `${overview?.activeDays.value} / ${overview?.activeDays.totalDays}`}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${overview?.activeDays.percentage || 0}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-white/50">{overview?.activeDays.percentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 1: Optimization Activity (Time Series) ── */}
        <div className="card p-6 border border-white/[0.06] bg-[#1A1A1C]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.05] mb-5 gap-2">
            <div>
              <h2 className="text-[16px] font-semibold text-white">Optimization Activity</h2>
              <p className="text-[12px] text-white/40">
                Your PromptPro usage and compute spend over time.
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono text-white/60">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
                <span>Optimizations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                <span>Credits Spent</span>
              </div>
            </div>
          </div>

          <div className="h-[260px] w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-white/30 font-mono text-[12px]">
                Loading activity series...
              </div>
            ) : data?.activity && data.activity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="optGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="credGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#888888" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#888888" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "monospace" }}
                    tickFormatter={(val) => {
                      const d = new Date(val)
                      return `${d.getMonth() + 1}/${d.getDate()}`
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "monospace" }}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null
                      return (
                        <div className="p-3 bg-[#111111] border border-white/[0.12] rounded-xl shadow-2xl text-[12px] font-mono space-y-1">
                          <div className="text-white/40 pb-1 border-b border-white/[0.08]">{label}</div>
                          <div className="flex items-center justify-between gap-4 text-white">
                            <span>Optimizations:</span>
                            <span className="font-bold">{payload[0]?.value}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-white/60">
                            <span>Credits Spent:</span>
                            <span className="font-bold">{payload[1]?.value} cr</span>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="optimizations"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#optGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="credits"
                    stroke="#71717A"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#credGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/30 font-mono text-[12px]">
                No activity recorded in this date range.
              </div>
            )}
          </div>
        </div>

        {/* ── Row 2: Prompt Quality & Optimization Modes ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prompt Quality Chart */}
          <div className="card p-6 border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] mb-5">
              <div>
                <h2 className="text-[16px] font-semibold text-white">Prompt Quality Curve</h2>
                <p className="text-[12px] text-white/40">
                  Before vs. After benchmark scoring evolution.
                </p>
              </div>
              {data?.quality.averageGain !== null && data?.quality.averageGain !== undefined && (
                <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-medium">
                  +{data.quality.averageGain} avg quality lift
                </span>
              )}
            </div>

            {isFree ? (
              <div className="p-8 text-center border border-white/[0.04] bg-white/[0.02] rounded-2xl my-auto">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center mx-auto mb-3 text-white/60">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-1">
                  Quality Scoring Analytics
                </h3>
                <p className="text-[12px] text-white/50 mb-4 max-w-xs mx-auto">
                  Available with Plus and Max plans. Unlock multi-pass scoring metrics, benchmark comparison, and prompt evolution curves.
                </p>
                <a
                  href="/upgrade"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all"
                >
                  <span>Upgrade to Plus</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : data?.quality.hasScoringData && data.quality.series.length > 0 ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.quality.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "monospace" }}
                      tickFormatter={(val) => {
                        const d = new Date(val)
                        return `${d.getMonth() + 1}/${d.getDate()}`
                      }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "monospace" }}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null
                        return (
                          <div className="p-3 bg-[#111111] border border-white/[0.12] rounded-xl shadow-2xl text-[12px] font-mono space-y-1">
                            <div className="text-white/40 pb-1 border-b border-white/[0.08]">{label}</div>
                            <div className="flex items-center justify-between gap-4 text-emerald-400">
                              <span>Optimized Score:</span>
                              <span className="font-bold">{payload[1]?.value}/100</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-white/50">
                              <span>Original Score:</span>
                              <span className="font-bold">{payload[0]?.value}/100</span>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="originalScore"
                      stroke="#52525B"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={{ r: 2, fill: "#52525B" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="optimizedScore"
                      stroke="#FFFFFF"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#FFFFFF" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-white/40 font-mono text-[12px]">
                No scoring records yet in this timeframe.
              </div>
            )}
          </div>

          {/* Optimization Modes Breakdown */}
          <div className="card p-6 border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] mb-5">
              <div>
                <h2 className="text-[16px] font-semibold text-white">Optimization Modes</h2>
                <p className="text-[12px] text-white/40">
                  Compute breakdown across Quick, Advanced, and Max.
                </p>
              </div>
            </div>

            <div className="space-y-4 my-auto">
              {data?.modes.map((m) => (
                <div key={m.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="grayscale inline-flex items-center justify-center text-[13px]">
                        {m.emoji}
                      </span>
                      <span className="font-semibold text-white">{m.label}</span>
                      <span className="font-mono text-[10px] text-white/40">({m.creditsCost} cr)</span>
                      {!m.enabled && (
                        <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-[9px] font-mono text-white/40">
                          Locked
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[12px] text-white/70">
                      {m.count} ({m.percentage}%)
                    </div>
                  </div>

                  <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        m.enabled ? "bg-white" : "bg-white/20"
                      }`}
                      style={{ width: `${m.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.05] text-[11px] font-mono text-white/40 flex items-center justify-between">
              <span>Total operations: {overview?.optimizations.value || 0}</span>
              <span>Modes respect active plan tier</span>
            </div>
          </div>
        </div>

        {/* ── Row 3: Platform Usage & Credit Telemetry ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Platform Usage */}
          <div className="card p-6 border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] mb-5">
              <div>
                <h2 className="text-[16px] font-semibold text-white">Platform Usage</h2>
                <p className="text-[12px] text-white/40">
                  Where you optimize prompts most frequently.
                </p>
              </div>
            </div>

            {data?.platforms && data.platforms.length > 0 ? (
              <div className="space-y-4 my-auto">
                {data.platforms.map((p) => (
                  <div key={p.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-medium text-white">{p.name}</span>
                      <span className="font-mono text-[12px] text-white/60">
                        {p.count} ops ({p.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/80 rounded-full transition-all duration-500"
                        style={{ width: `${p.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-white/40 font-mono text-[12px]">
                No platform activity recorded yet.
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/[0.05] text-[11px] font-mono text-white/40">
              Integrations: ChatGPT, Claude, Gemini, Perplexity &amp; Dashboard
            </div>
          </div>

          {/* Credit Telemetry & Burn Rate */}
          <div className="card p-6 border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] mb-5">
              <div>
                <h2 className="text-[16px] font-semibold text-white">Credit Intelligence</h2>
                <p className="text-[12px] text-white/40">
                  Allowance consumption and run-rate forecast.
                </p>
              </div>
              <Zap className="w-4 h-4 text-white/40" />
            </div>

            <div className="space-y-5 my-auto">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-[28px] font-bold text-white tracking-tight">
                    {data?.credits.creditsRemaining.toLocaleString() || "0"}
                  </div>
                  <div className="text-[12px] font-mono text-white/40">Credits remaining</div>
                </div>

                <div className="text-right">
                  <div className="text-[18px] font-semibold text-white/80">
                    {data?.credits.creditsUsed.toLocaleString()} used
                  </div>
                  <div className="text-[12px] font-mono text-white/40">
                    {data?.isAdmin ? "Unlimited quota" : `of ${data?.credits.monthlyAllowance} monthly`}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {!data?.isAdmin && (
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${data?.credits.usagePct || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/40">
                    <span>0%</span>
                    <span>{data?.credits.usagePct}% utilized</span>
                    <span>100%</span>
                  </div>
                </div>
              )}

              {/* Burn Rate & Projection */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1 text-[12px] font-mono">
                <div className="flex items-center justify-between text-white/70">
                  <span>Daily burn rate:</span>
                  <span className="font-semibold text-white">~{data?.credits.dailyBurnRate} cr / active day</span>
                </div>
                {data?.credits.hasProjectionData && data.credits.projectedExhaustionDate ? (
                  <div className="flex items-center justify-between text-white/70">
                    <span>Estimated exhaustion:</span>
                    <span className="font-semibold text-amber-400">{data.credits.projectedExhaustionDate}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-white/40 pt-1">
                    {data?.isAdmin ? "Admin role has unrestricted credit allocation." : "Insufficient history to forecast credit exhaustion."}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono">
              <span className="text-white/40">Billing reset: Every 30 days</span>
              {isFree && (
                <a href="/upgrade" className="text-white hover:underline flex items-center gap-1">
                  <span>Get 500 cr with Plus</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 4: Prompt Activity Heatmap (365 Days) ── */}
        <div className="card p-6 border border-white/[0.06] bg-[#1A1A1C]">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] mb-5">
            <div>
              <h2 className="text-[16px] font-semibold text-white">Activity Heatmap</h2>
              <p className="text-[12px] text-white/40">
                Annual PromptPro interaction density.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-white/40">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded-[2px] bg-white/[0.05]" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-white/20" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-white/50" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-white" />
              <span>More</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div
              className="inline-grid gap-[3px] min-w-[700px]"
              style={{
                gridTemplateColumns: "repeat(52, 11px)",
                gridTemplateRows: "repeat(7, 11px)",
                gridAutoFlow: "column",
              }}
            >
              {(() => {
                const today = new Date()
                const heatmapMap = new Map(data?.heatmap.map((h) => [h.date, h.count]) || [])
                const cells = []
                for (let i = 363; i >= 0; i--) {
                  const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
                  const dateStr = d.toISOString().split("T")[0]
                  const count = heatmapMap.get(dateStr) || 0
                  
                  let bg = "rgba(255,255,255,0.05)"
                  if (count === 1) bg = "rgba(255,255,255,0.25)"
                  else if (count <= 3) bg = "rgba(255,255,255,0.50)"
                  else if (count <= 7) bg = "rgba(255,255,255,0.75)"
                  else if (count > 7) bg = "#FFFFFF"

                  cells.push(
                    <Tooltip key={dateStr}>
                      <TooltipTrigger asChild>
                        <div
                          className="w-[11px] h-[11px] rounded-[2px] transition-transform hover:scale-125"
                          style={{ backgroundColor: bg }}
                        />
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-[#111111] border border-white/[0.1] text-white text-[11px] font-mono shadow-xl rounded-lg px-2.5 py-1"
                      >
                        {dateStr}: <span className="font-semibold text-white">{count} optimizations</span>
                      </TooltipContent>
                    </Tooltip>
                  )
                }
                return cells
              })()}
            </div>
          </div>
        </div>

        {/* ── Row 5: Dynamic Takeaways & Insights ── */}
        {data?.insights && data.insights.length > 0 && (
          <div className="card p-6 border border-white/[0.06] bg-[#1A1A1C]">
            <div className="flex items-center gap-2 pb-4 border-b border-white/[0.05] mb-4">
              <Sparkles className="w-4 h-4 text-white/70" />
              <h2 className="text-[16px] font-semibold text-white">Dynamic Insights</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[13px] text-white/80 leading-relaxed"
                >
                  <CheckCircle2 className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
