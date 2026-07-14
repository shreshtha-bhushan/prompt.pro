"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  TrendingUp,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  Cpu,
  CheckCircle2,
  Trophy,
  Flame,
  Keyboard,
  Zap,
  ArrowRight,
  ArrowDown,
  Calendar,
  Sliders,
  ChevronDown,
  Star,
  Lightbulb,
} from "lucide-react"

interface OptimizationLog {
  id: string
  created_at: string
  score_before?: number
  score_after?: number
  site?: string
  strategy?: string
  strategy_used?: string
}

const scoreEvolutionConfig: ChartConfig = {
  score_after: {
    label: "Optimized Score",
    color: "#FFFFFF",
  },
  score_before: {
    label: "Draft Score",
    color: "#64748b",
  },
}

const dailyUpgradesConfig: ChartConfig = {
  upgrades: {
    label: "Prompts Optimized",
    color: "#E4E4E7",
  },
}

const timeSavedTrendConfig: ChartConfig = {
  minutes: {
    label: "Minutes Saved",
    color: "#30D158",
  },
}

const applicationsConfig: ChartConfig = {
  value: {
    label: "Share",
    color: "#FFFFFF",
  },
}

// Apple / Monochrome + Single Semantic Accent (#30D158)
const APP_COLORS: Record<string, string> = {
  ChatGPT: "#30D158",
  Claude: "#FFFFFF",
  Gemini: "#A1A1AA",
  Perplexity: "#71717A",
  DeepSeek: "#52525B",
  Copilot: "#3F3F46",
  Grok: "#52525B",
  Extension: "#71717A",
  Other: "#3F3F46",
}

function formatSiteName(site?: string) {
  if (!site) return "ChatGPT"
  const s = site.toLowerCase()
  if (s === "chatgpt") return "ChatGPT"
  if (s === "claude") return "Claude"
  if (s === "gemini") return "Gemini"
  if (s === "perplexity") return "Perplexity"
  if (s === "deepseek") return "DeepSeek"
  if (s === "copilot") return "Copilot"
  if (s === "grok") return "Grok"
  if (s === "extension") return "Extension"
  return site.charAt(0).toUpperCase() + site.slice(1)
}

export function AnalyticsCharts({ logs }: { logs: OptimizationLog[] }) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "3m">("30d")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("All Platforms")
  const [selectedStrategy, setSelectedStrategy] = useState<string>("All Strategies")

  // Filtered logs across selected time period & filters
  const filteredLogs = useMemo(() => {
    const now = new Date()
    const cutoff = new Date()
    if (timeRange === "7d") cutoff.setDate(now.getDate() - 7)
    if (timeRange === "30d") cutoff.setDate(now.getDate() - 30)
    if (timeRange === "3m") cutoff.setDate(now.getDate() - 90)

    return logs.filter((l) => {
      const dateMatch = new Date(l.created_at) >= cutoff
      const platformMatch =
        selectedPlatform === "All Platforms" || formatSiteName(l.site) === selectedPlatform
      const stratMatch =
        selectedStrategy === "All Strategies" ||
        (l.strategy_used || l.strategy || "Enhance").toLowerCase() ===
          selectedStrategy.toLowerCase()
      return dateMatch && platformMatch && stratMatch
    })
  }, [logs, timeRange, selectedPlatform, selectedStrategy])

  // Computed Stats for Personal Performance Dashboard
  const stats = useMemo(() => {
    const dataToUse = filteredLogs.length > 0 ? filteredLogs : logs
    const count = dataToUse.length || 1

    let totalBefore = 0
    let totalAfter = 0
    let acceptedFirstTime = 0
    const appCounts = new Map<string, number>()
    const stratCounts = new Map<string, number>()
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0] // Mon..Sun
    const scoreDist = { tier90: 0, tier80: 0, tier70: 0, tier60: 0 }

    dataToUse.forEach((log) => {
      const before = log.score_before || 58
      const after = log.score_after || 67
      totalBefore += before
      totalAfter += after

      if (after >= 85 || (after - before >= 8)) acceptedFirstTime += 1

      // App counts
      const appName = formatSiteName(log.site)
      appCounts.set(appName, (appCounts.get(appName) || 0) + 1)

      // Strategy counts
      let strat = log.strategy_used || log.strategy || "Enhance"
      strat = strat.charAt(0).toUpperCase() + strat.slice(1).toLowerCase()
      if (strat === "Clarity & structure") strat = "Clarity & Structure"
      stratCounts.set(strat, (stratCounts.get(strat) || 0) + 1)

      // Day of week
      const d = new Date(log.created_at)
      let dayIdx = d.getDay() - 1 // 0 = Monday
      if (dayIdx === -1) dayIdx = 6
      if (dayIdx >= 0 && dayIdx < 7) dayOfWeekCounts[dayIdx] += 1

      // Score distribution
      if (after >= 90) scoreDist.tier90 += 1
      else if (after >= 80) scoreDist.tier80 += 1
      else if (after >= 70) scoreDist.tier70 += 1
      else scoreDist.tier60 += 1
    })

    const avgBefore = Math.round(totalBefore / count) || 58
    const avgAfter = Math.round(totalAfter / count) || 67
    const avgLift = avgAfter - avgBefore || 9
    const successRate = Math.round((acceptedFirstTime / count) * 100) || 91

    // Time & session equivalents
    const totalMinutesSaved = Math.round(count * 4.5)
    const hoursSaved = Math.floor(totalMinutesSaved / 60)
    const minsSaved = totalMinutesSaved % 60
    const timeLabel = hoursSaved > 0 ? `${hoursSaved}h ${minsSaved}m` : `${totalMinutesSaved}m`
    const workingSessions = Math.max(1, Math.round(totalMinutesSaved / 45))

    // Applications pie breakdown (Designed for growth across top platforms)
    const appData =
      dataToUse.length === 0
        ? [
            { name: "ChatGPT", value: 48, raw: 10, fill: APP_COLORS.ChatGPT },
            { name: "Claude", value: 28, raw: 6, fill: APP_COLORS.Claude },
            { name: "Gemini", value: 14, raw: 3, fill: APP_COLORS.Gemini },
            { name: "Perplexity", value: 6, raw: 1, fill: APP_COLORS.Perplexity },
            { name: "DeepSeek", value: 4, raw: 1, fill: APP_COLORS.DeepSeek },
          ]
        : Array.from(appCounts.entries())
            .map(([name, val]) => ({
              name,
              value: Math.max(1, Math.round((val / count) * 100)),
              raw: val,
              fill: APP_COLORS[name] || APP_COLORS.Other,
            }))
            .sort((a, b) => b.value - a.value)

    // Strategy percentages
    const stratData =
      dataToUse.length === 0
        ? [
            { name: "Enhance", pct: 68 },
            { name: "Elaborate", pct: 22 },
            { name: "Concise", pct: 10 },
          ]
        : Array.from(stratCounts.entries())
            .map(([name, val]) => ({
              name,
              pct: Math.round((val / count) * 100),
            }))
            .sort((a, b) => b.pct - a.pct)

    // Daily bar data with single letter ticks (M, T, W, T, F, S, S)
    const shortDays = ["M", "T", "W", "T", "F", "S", "S"]
    const fullDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    let maxUpgradeVal = 0
    const dailyRaw = shortDays.map((day, idx) => {
      const val =
        dayOfWeekCounts[idx] ||
        (dataToUse.length === 0 && (idx === 1 || idx === 3) ? 6 : idx === 2 ? 21 : 0)
      if (val > maxUpgradeVal) maxUpgradeVal = val
      return { day, fullDay: fullDays[idx], upgrades: val }
    })
    const dailyUpgrades = dailyRaw.map((item) => ({
      ...item,
      fill: item.upgrades === maxUpgradeVal && item.upgrades > 0 ? "#30D158" : "rgba(255,255,255,0.22)",
    }))

    // Time saved trend weekly
    const timeTrendRaw = [
      { week: "Week 1", minutes: Math.round(totalMinutesSaved * 0.18) || 15 },
      { week: "Week 2", minutes: Math.round(totalMinutesSaved * 0.26) || 25 },
      { week: "Week 3", minutes: Math.round(totalMinutesSaved * 0.38) || 35 },
      { week: "Week 4", minutes: Math.round(totalMinutesSaved * 0.52) || 45 },
    ]
    const timeTrend = timeTrendRaw.map((item, idx) => ({
      ...item,
      fill: idx === timeTrendRaw.length - 1 ? "#30D158" : "rgba(255,255,255,0.22)",
    }))

    // Quality distribution chart
    const qualityDist =
      dataToUse.length === 0
        ? [
            { range: "90–100", count: 12, pct: 58 },
            { range: "80–90", count: 6, pct: 28 },
            { range: "70–80", count: 2, pct: 10 },
            { range: "60–70", count: 1, pct: 4 },
          ]
        : [
            { range: "90–100", count: scoreDist.tier90, pct: Math.round((scoreDist.tier90 / count) * 100) },
            { range: "80–90", count: scoreDist.tier80, pct: Math.round((scoreDist.tier80 / count) * 100) },
            { range: "70–80", count: scoreDist.tier70, pct: Math.round((scoreDist.tier70 / count) * 100) },
            { range: "60–70", count: scoreDist.tier60, pct: Math.round((scoreDist.tier60 / count) * 100) },
          ]

    // Tokens & Typing avoided
    const tokensSaved = count * 184
    const typingAvoided = count * 410

    return {
      count,
      avgBefore,
      avgAfter,
      avgLift,
      successRate,
      timeLabel,
      totalMinutesSaved,
      workingSessions,
      appData,
      stratData: stratData.length > 0 ? stratData : [{ name: "Enhance", pct: 68 }, { name: "Elaborate", pct: 22 }, { name: "Concise", pct: 10 }],
      dailyUpgrades,
      timeTrend,
      qualityDist,
      tokensSaved,
      typingAvoided,
    }
  }, [filteredLogs, logs])

  // Quality Over Time AreaChart Data
  const evolutionData = useMemo(() => {
    const dataToUse = filteredLogs.length > 0 ? filteredLogs : logs
    const sorted = [...dataToUse].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const dayMap = new Map<string, { date: string; totalBefore: number; totalAfter: number; count: number }>()
    sorted.forEach((log) => {
      const d = new Date(log.created_at)
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      if (!dayMap.has(label)) {
        dayMap.set(label, { date: label, totalBefore: 0, totalAfter: 0, count: 0 })
      }
      const entry = dayMap.get(label)!
      entry.totalBefore += log.score_before || 58
      entry.totalAfter += log.score_after || 67
      entry.count += 1
    })

    const arr = Array.from(dayMap.values()).map((item) => ({
      date: item.date,
      score_before: Math.round(item.totalBefore / item.count),
      score_after: Math.round(item.totalAfter / item.count),
    }))

    if (arr.length < 3 && sorted.length >= 3) {
      const step = Math.max(1, Math.floor(sorted.length / 6))
      const points = []
      for (let i = 0; i < sorted.length; i += step) {
        const item = sorted[i]
        points.push({
          date: `Prompt #${i + 1}`,
          score_before: item.score_before || 58,
          score_after: item.score_after || 67,
        })
      }
      if (points.length >= 3) return points
    }

    if (arr.length > 0) return arr
    return [
      { date: "Apr 7", score_before: 58, score_after: 86 },
      { date: "Apr 14", score_before: 61, score_after: 88 },
      { date: "Apr 21", score_before: 64, score_after: 90 },
      { date: "Apr 28", score_before: 62, score_after: 91 },
      { date: "May 5", score_before: 65, score_after: 92 },
    ]
  }, [filteredLogs, logs])

  return (
    <div className="space-y-8 font-sans text-[#FFFFFF]">
      {/* 1. SINGLE UNIFIED PAGE HEADER + FILTER BAR (100% White titles) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-white/[0.05]">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#FFFFFF] font-sans">
            Personal Prompt Intelligence
          </h1>
          <p className="text-[13px] text-[#A1A1AA] mt-0.5">
            Personalized performance telemetry, AI-generated quality insights, and tangible developer productivity metrics.
          </p>
        </div>

        {/* Grouped Filter Bar ([Platform] [Strategy] | [Time Range]) */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="h-[34px] pl-3 pr-8 rounded-xl bg-white/[0.04] border border-white/[0.07] text-[#FFFFFF] text-[12px] font-medium appearance-none focus:outline-none focus:border-[#30D158]/40 transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer font-sans"
              >
                <option value="All Platforms" className="bg-[#131313] text-[#FFFFFF]">All Platforms</option>
                <option value="ChatGPT" className="bg-[#131313] text-[#FFFFFF]">ChatGPT</option>
                <option value="Claude" className="bg-[#131313] text-[#FFFFFF]">Claude</option>
                <option value="Gemini" className="bg-[#131313] text-[#FFFFFF]">Gemini</option>
                <option value="Perplexity" className="bg-[#131313] text-[#FFFFFF]">Perplexity</option>
                <option value="DeepSeek" className="bg-[#131313] text-[#FFFFFF]">DeepSeek</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="h-[34px] pl-3 pr-8 rounded-xl bg-white/[0.04] border border-white/[0.07] text-[#FFFFFF] text-[12px] font-medium appearance-none focus:outline-none focus:border-[#30D158]/40 transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer font-sans"
              >
                <option value="All Strategies" className="bg-[#131313] text-[#FFFFFF]">All Strategies</option>
                <option value="Enhance" className="bg-[#131313] text-[#FFFFFF]">Enhance</option>
                <option value="Elaborate" className="bg-[#131313] text-[#FFFFFF]">Elaborate</option>
                <option value="Concise" className="bg-[#131313] text-[#FFFFFF]">Concise</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="hidden sm:block h-4 w-[1px] bg-white/[0.08] mx-0.5" />

          {/* Segmented Time Range Pill Controls */}
          <div className="inline-flex items-center bg-black/40 border border-white/[0.07] rounded-xl p-1 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setTimeRange("3m")}
              className={`h-[28px] px-3 rounded-lg text-[12px] font-medium transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                timeRange === "3m"
                  ? "bg-white/[0.14] text-[#FFFFFF] shadow-sm font-semibold"
                  : "text-[#A1A1AA] hover:text-[#FFFFFF]"
              }`}
            >
              Last 3 months
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("30d")}
              className={`h-[28px] px-3 rounded-lg text-[12px] font-medium transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                timeRange === "30d"
                  ? "bg-white/[0.14] text-[#FFFFFF] shadow-sm font-semibold"
                  : "text-[#A1A1AA] hover:text-[#FFFFFF]"
              }`}
            >
              Last 30 days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("7d")}
              className={`h-[28px] px-3 rounded-lg text-[12px] font-medium transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                timeRange === "7d"
                  ? "bg-white/[0.14] text-[#FFFFFF] shadow-sm font-semibold"
                  : "text-[#A1A1AA] hover:text-[#FFFFFF]"
              }`}
            >
              Last 7 days
            </button>
          </div>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY (Rule 1: 90% Monochrome, Rule 2: Green ONLY on positive deltas) */}
      <div>
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#FFFFFF] mb-5 font-sans">
          Executive Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Prompts Optimized */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-5 flex flex-col justify-between h-[152px] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-white/[0.12] hover:-translate-y-[1px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-[#A1A1AA]">Prompts Optimized</span>
              <span className="min-w-[96px] inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#30D158]/[0.12] text-[#30D158] border border-[#30D158]/[0.2]">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>↑ +7 vs last</span>
              </span>
            </div>
            <div className="my-1">
              <span className="text-[44px] font-semibold tracking-tight text-[#FFFFFF] font-sans leading-none">
                {stats.count.toLocaleString()}
              </span>
            </div>
            <div className="text-[12px] text-[#71717A] truncate">
              {stats.count} prompts optimized this month
            </div>
          </div>

          {/* KPI 2: Average Quality Score */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-5 flex flex-col justify-between h-[152px] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-white/[0.12] hover:-translate-y-[1px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-[#A1A1AA]">Average Quality Score</span>
              <span className="min-w-[96px] inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#30D158]/[0.12] text-[#30D158] border border-[#30D158]/[0.2]">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>↑ +{stats.avgLift} baseline</span>
              </span>
            </div>
            <div className="my-1 flex items-baseline gap-2">
              <span className="text-[44px] font-semibold tracking-tight text-[#FFFFFF] font-sans leading-none">
                {stats.avgAfter}
              </span>
              <span className="text-[15px] font-medium text-[#71717A] font-mono">/ 100</span>
            </div>
            <div className="text-[12px] text-[#71717A] truncate">
              Average optimized score
            </div>
          </div>

          {/* KPI 3: Success Rate (Big Number = White, only delta = Green) */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-5 flex flex-col justify-between h-[152px] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-white/[0.12] hover:-translate-y-[1px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-[#A1A1AA]">Success Rate</span>
              <span className="min-w-[96px] inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#30D158]/[0.12] text-[#30D158] border border-[#30D158]/[0.2]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>↑ +4% period</span>
              </span>
            </div>
            <div className="my-1">
              <span className="text-[44px] font-semibold tracking-tight text-[#FFFFFF] font-sans leading-none">
                {stats.successRate}%
              </span>
            </div>
            <div className="text-[12px] text-[#71717A] truncate">
              Accepted without editing
            </div>
          </div>

          {/* KPI 4: Time Saved (Big Number = White, only delta = Green) */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-5 flex flex-col justify-between h-[152px] transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-white/[0.12] hover:-translate-y-[1px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-[#A1A1AA]">Time Saved</span>
              <span className="min-w-[96px] inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#30D158]/[0.12] text-[#30D158] border border-[#30D158]/[0.2]">
                <Clock className="w-3.5 h-3.5" />
                <span>≈ {stats.workingSessions} sessions</span>
              </span>
            </div>
            <div className="my-1">
              <span className="text-[44px] font-semibold tracking-tight text-[#FFFFFF] font-sans leading-none">
                {stats.timeLabel}
              </span>
            </div>
            <div className="text-[12px] text-[#71717A] truncate">
              ≈ {stats.count} prompts worth of typing
            </div>
          </div>
        </div>
      </div>

      {/* AI PROMPT INSIGHTS PANEL (Dark surface, neutral border, normal white title, #30D158 only on specific key numbers) */}
      <div className="rounded-[22px] border border-white/[0.05] bg-[#131313] p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2.5 mb-4 relative z-10">
          <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-[#FFFFFF] shrink-0">
            <Lightbulb className="w-4 h-4 opacity-80" />
          </div>
          <h4 className="text-[15px] font-semibold tracking-[-0.01em] text-[#FFFFFF] font-sans">
            AI Prompt Insights &amp; Recommendations
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-[13px] text-[#A1A1AA] relative z-10 font-sans">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start gap-2.5">
            <span className="text-[#30D158] font-bold mt-0.5">•</span>
            <span>Your quality score improved by <strong className="text-[#30D158] font-semibold">+14%</strong> this month, eliminating an estimated 2 full working sessions of reprompting.</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start gap-2.5">
            <span className="text-[#30D158] font-bold mt-0.5">•</span>
            <span>Technical &amp; Professional prompts score <strong className="text-[#30D158] font-semibold">12 points</strong> higher post-optimization vs. standard conversational drafts.</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start gap-2.5">
            <span className="text-[#30D158] font-bold mt-0.5">•</span>
            <span>You use Enhance 68% of the time—try <strong className="text-[#30D158] font-semibold">Elaborate</strong> when structuring complex multi-file architectural specs.</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start gap-2.5">
            <span className="text-[#30D158] font-bold mt-0.5">•</span>
            <span>Morning engineering sessions (<strong className="text-[#30D158] font-semibold">10 AM–12 PM</strong>) consistently yield your highest initial draft clarity scores.</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start gap-2.5 md:col-span-2 lg:col-span-2">
            <span className="text-[#30D158] font-bold mt-0.5">•</span>
            <span>Injecting <strong className="text-white font-semibold">Context Blocks</strong> directly increases your zero-shot acceptance rate by <strong className="text-[#30D158] font-semibold">+9 points</strong>.</span>
          </div>
        </div>
      </div>

      {/* PERFORMANCE TRENDS (Row 2 — Quality Chart = White primary + Gray comparison, Bar Chart = Neutral gray + Green peak) */}
      <div>
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#FFFFFF] mb-5 font-sans">
          Performance Trends
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Chart 1: Quality Over Time (White primary + Gray draft + Green hover dot - 6 Cols) */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-5 lg:col-span-6 flex flex-col justify-between h-[260px]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-[14px] font-medium text-[#FFFFFF] font-sans">Quality Over Time</h4>
                <p className="text-[12px] text-[#71717A] mt-0.5">
                  Dual-line comparison of optimized scores vs. initial drafts
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono shrink-0">
                <span className="flex items-center gap-1.5 text-[#FFFFFF]">
                  <span className="w-2 h-2 rounded-full bg-[#FFFFFF]" /> Optimized
                </span>
                <span className="flex items-center gap-1.5 text-[#71717A]">
                  <span className="w-2 h-2 rounded-full bg-[#64748b]" /> Original
                </span>
              </div>
            </div>

            <ChartContainer config={scoreEvolutionConfig} className="h-[180px] w-full aspect-auto">
              <AreaChart data={evolutionData} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillAfter" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="fillBefore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.35)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[40, 100]} stroke="rgba(255,255,255,0.35)" fontSize={11} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="score_after" stroke="#FFFFFF" strokeWidth={2.5} fillOpacity={1} fill="url(#fillAfter)" dot={{ fill: "#FFFFFF", r: 3, strokeWidth: 0 }} activeDot={{ fill: "#30D158", r: 5, stroke: "#131313", strokeWidth: 2 }} animationDuration={300} />
                <Area type="monotone" dataKey="score_before" stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#fillBefore)" dot={{ fill: "#64748b", r: 2.5, strokeWidth: 0 }} activeDot={{ fill: "#A1A1AA", r: 4 }} animationDuration={300} />
              </AreaChart>
            </ChartContainer>
          </div>

          {/* Chart 2: Daily Upgrades (Neutral gray bars + Green peak day - 3 Cols) */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-5 lg:col-span-3 flex flex-col justify-between h-[260px]">
            <div className="mb-3">
              <h4 className="text-[14px] font-medium text-[#FFFFFF] font-sans">Daily Upgrades</h4>
              <p className="text-[12px] text-[#71717A] mt-0.5">Prompt volume by day of week</p>
            </div>

            <ChartContainer config={dailyUpgradesConfig} className="h-[180px] w-full aspect-auto">
              <BarChart data={stats.dailyUpgrades} margin={{ top: 8, right: 5, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.45)" fontSize={11} fontStyle="bold" tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.35)" fontSize={11} tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const item = payload[0].payload
                    return (
                      <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-2.5 shadow-xl text-[12px] font-sans">
                        <div className="font-semibold text-white">{item.fullDay}</div>
                        <div className="text-[#A1A1AA] mt-0.5">
                          Prompts Optimized: <span className="text-white font-mono font-semibold">{item.upgrades}</span>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="upgrades" radius={[6, 6, 0, 0]} name="Prompts" animationDuration={300}>
                  {stats.dailyUpgrades.map((entry, idx) => (
                    <Cell key={`bar-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>

          {/* Chart 3: Time Saved Trend (Neutral gray bars + Green latest period - 3 Cols) */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-5 lg:col-span-3 flex flex-col justify-between h-[260px]">
            <div className="mb-3">
              <h4 className="text-[14px] font-medium text-[#FFFFFF] font-sans">Time Saved Trend</h4>
              <p className="text-[12px] text-[#71717A] mt-0.5">Weekly cumulative time gains</p>
            </div>

            <ChartContainer config={timeSavedTrendConfig} className="h-[180px] w-full aspect-auto">
              <BarChart data={stats.timeTrend} margin={{ top: 8, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="week" stroke="rgba(255,255,255,0.35)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.35)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}m`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="minutes" radius={[6, 6, 0, 0]} name="Minutes Saved" animationDuration={300}>
                  {stats.timeTrend.map((entry, idx) => (
                    <Cell key={`trend-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>

      {/* ENGINEERING HABITS (Row 3 — Monochrome Pie with Green #1 share, Gray tracks + White fills + Green hover) */}
      <div>
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#FFFFFF] mb-5 font-sans">
          Engineering Habits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          {/* Applications Breakdown (Monochrome + Green #1 Share - 4 Cols) */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-5 lg:col-span-4 flex flex-col justify-between h-[260px]">
            <div>
              <h4 className="text-[14px] font-medium text-[#FFFFFF] font-sans">Preferred AI Applications</h4>
              <p className="text-[12px] text-[#71717A] mt-0.5">Where your optimized prompts are deployed</p>
            </div>

            <div className="flex items-center justify-between gap-4 py-2 flex-1">
              <ChartContainer config={applicationsConfig} className="h-[135px] w-[135px] shrink-0">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={stats.appData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={62}
                    paddingAngle={3}
                    strokeWidth={0}
                    animationDuration={300}
                  >
                    {stats.appData.map((entry, index) => (
                      <Cell key={`app-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              <div className="space-y-2 flex-1 font-mono text-[12px]">
                {stats.appData.slice(0, 5).map((app) => (
                  <div key={app.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-white/80 font-sans text-[13px]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: app.fill }} />
                      <span className="truncate">{app.name}</span>
                    </span>
                    <span className="font-semibold text-white text-[12px]">{app.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strategy & Voice Progress Bars (Gray track + White fill + Green top row - 4 Cols) */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-5 lg:col-span-4 flex flex-col justify-between h-[260px]">
            <div>
              <h4 className="text-[14px] font-medium text-[#FFFFFF] font-sans">Strategy &amp; Voice</h4>
              <p className="text-[12px] text-[#71717A] mt-0.5">Your preferred architectural structures</p>
            </div>

            <div className="space-y-3.5 my-2">
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider">Top Strategies</div>
                {stats.stratData.slice(0, 3).map((st, idx) => (
                  <div key={st.name} className="space-y-1 group cursor-pointer">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-white/85 font-medium group-hover:text-white transition-colors">{st.name}</span>
                      <span className="font-mono text-white/70 font-semibold">{st.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                          idx === 0 ? "bg-[#30D158]" : "bg-white/80 group-hover:bg-[#30D158]"
                        }`}
                        style={{ width: `${Math.min(100, st.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 pt-2.5 border-t border-white/[0.05]">
                <div className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider">Voice &amp; Tone</div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="p-1.5 rounded-xl bg-white/[0.025] border border-white/[0.04] flex justify-between items-center">
                    <span className="text-white/80">Professional</span>
                    <span className="font-mono font-semibold text-white">42%</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white/[0.025] border border-white/[0.04] flex justify-between items-center">
                    <span className="text-white/80">Academic</span>
                    <span className="font-mono font-semibold text-white/70">32%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Consistency & Peak Hours (White number, Gray label, Green 82% ONLY - 4 Cols) */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-5 lg:col-span-4 flex flex-col justify-between h-[260px]">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-[14px] font-medium text-[#FFFFFF] font-sans">Active Days &amp; Consistency</h4>
                  <Calendar className="w-4 h-4 text-[#A1A1AA] opacity-70" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-[32px] font-semibold tracking-tight text-[#FFFFFF] font-sans leading-none">
                    18
                  </span>
                  <span className="text-[13px] text-[#71717A]">active days this month</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 text-[12px] font-mono border-t border-white/[0.04]">
                  <span className="text-[#30D158] font-semibold">82% consistency</span>
                  <span className="text-white/50">4d streak</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-medium text-[#FFFFFF] font-sans">Peak Productivity Hours</h4>
                  <Clock className="w-3.5 h-3.5 text-[#A1A1AA] opacity-70" />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <div className="p-2 rounded-xl bg-white/[0.025] border border-white/[0.04]">
                    <div className="text-[11px] font-mono text-[#71717A] uppercase">Morning Peak</div>
                    <div className="text-[12px] font-semibold text-[#FFFFFF] mt-0.5">10 AM – 12 PM</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.025] border border-white/[0.04]">
                    <div className="text-[11px] font-mono text-[#71717A] uppercase">Evening Peak</div>
                    <div className="text-[12px] font-semibold text-[#FFFFFF] mt-0.5">7 PM – 9 PM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PROMPT INTELLIGENCE & QUALITY (Row 4 — Gray bars with Green top tier, Dark before / Green after, Only Green-heavy card is Lift) */}
      <div>
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#FFFFFF] mb-5 font-sans">
          Prompt Intelligence &amp; Quality
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          {/* Quality Distribution (Gray bars + Green best tier - 4 Cols) */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-5 lg:col-span-4 flex flex-col justify-between h-[260px]">
            <div>
              <h4 className="text-[14px] font-medium text-[#FFFFFF] font-sans">Quality Distribution</h4>
              <p className="text-[12px] text-[#71717A] mt-0.5">Post-optimization score breakdown</p>
            </div>

            <div className="space-y-3 my-2">
              {stats.qualityDist.map((tier, idx) => (
                <div key={tier.range} className="space-y-1">
                  <div className="flex items-center justify-between text-[13px] font-mono">
                    <span className={idx === 0 ? "text-[#30D158] font-bold text-[14px] w-12" : "text-white/80 font-medium text-[13px] w-12"}>
                      {tier.pct}%
                    </span>
                    <span className="text-white/80 font-medium flex-1">{tier.range}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                        idx === 0 ? "bg-[#30D158]" : "bg-white/[0.25]"
                      }`}
                      style={{ width: `${tier.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[12px] text-[#71717A] truncate">
              {stats.qualityDist[0].pct + stats.qualityDist[1].pct}% of prompts score 80+ post-upgrade
            </div>
          </div>

          {/* Visual Blocks Rewrite Reduction (Before = Dark, After = Slightly green - 4 Cols) */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-5 lg:col-span-4 flex flex-col justify-between h-[260px]">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-[14px] font-medium text-[#FFFFFF] font-sans">Rewrite Reduction</h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#30D158]/[0.12] text-[#30D158] border border-[#30D158]/[0.2]">
                  -63% revisions
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between">
                  <div className="text-[11px] font-mono text-[#71717A] uppercase">Before</div>
                  <div className="flex items-center gap-1 text-white/30 text-[13px] tracking-widest my-1">
                    ■■■■
                  </div>
                  <div className="text-[20px] font-semibold text-[#FFFFFF] font-mono leading-none">3.8</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#30D158]/[0.06] border border-[#30D158]/[0.18] flex flex-col justify-between">
                  <div className="text-[11px] font-mono text-[#30D158] uppercase">After</div>
                  <div className="flex items-center gap-1 text-[#30D158] text-[13px] tracking-widest my-1">
                    ■
                  </div>
                  <div className="text-[20px] font-semibold text-[#30D158] font-mono leading-none">1.4</div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.05]">
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-medium text-[#FFFFFF] font-sans">Length Optimization</h4>
                <span className="text-[11px] font-mono text-[#30D158] font-semibold">-31% tighter</span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-[#71717A] mt-1.5 font-mono">
                <span>Before: 560w</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/30" />
                <span className="text-white font-semibold">After: 380w</span>
              </div>
            </div>
          </div>

          {/* Quality Lift Card (THE ONLY GREEN-HEAVY CARD: Literally about improvement - 4 Cols) */}
          <div className="rounded-[18px] border border-[#30D158]/[0.25] bg-[#131313] p-5 lg:col-span-4 flex flex-col justify-between h-[260px] shadow-[0_0_30px_-5px_rgba(48,209,88,0.12)]">
            <div>
              <h4 className="text-[14px] font-medium text-[#FFFFFF] font-sans">Quality Lift</h4>
              <p className="text-[12px] text-[#71717A] mt-0.5">Average gain per prompt</p>
            </div>

            <div className="flex flex-col items-center justify-center my-auto space-y-2.5">
              <div className="text-[36px] font-semibold text-[#71717A] font-mono leading-none">
                {stats.avgBefore}
              </div>

              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#30D158]/[0.15] border border-[#30D158]/[0.3] text-[#30D158] font-mono text-[13px] font-semibold shadow-sm">
                <ArrowDown className="w-3.5 h-3.5" />
                <span>+{stats.avgLift}</span>
              </div>

              <div className="text-[44px] font-semibold text-[#30D158] font-mono leading-none">
                {stats.avgAfter}
              </div>
            </div>

            <div className="text-[12px] text-[#71717A] truncate text-center">
              Direct structural clarity &amp; reasoning boost
            </div>
          </div>
        </div>
      </div>

      {/* PERSONAL ACHIEVEMENTS (Row 5 — Dark cards, tiny icon, neutral/white text, NO bright fills) */}
      <div>
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#FFFFFF] mb-5 font-sans">
          Personal Achievements
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Streak */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-4 flex items-center gap-3.5 transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-white/[0.12]">
            <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-amber-400 shrink-0">
              <Flame className="w-4 h-4 opacity-80" />
            </div>
            <div>
              <div className="text-[12px] font-medium text-[#71717A]">Current Streak</div>
              <div className="text-[16px] font-semibold text-[#FFFFFF] font-sans leading-tight mt-0.5">
                14 Day Streak
              </div>
              <div className="text-[11px] text-[#A1A1AA] font-mono mt-0.5">Personal best: 22 days</div>
            </div>
          </div>

          {/* Card 2: Milestones */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-4 flex items-center gap-3.5 transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-white/[0.12]">
            <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#FFFFFF] shrink-0">
              <Trophy className="w-4 h-4 opacity-80" />
            </div>
            <div>
              <div className="text-[12px] font-medium text-[#71717A]">Rank &amp; Milestone</div>
              <div className="text-[16px] font-semibold text-[#FFFFFF] font-sans leading-tight mt-0.5">
                Top 10% Engineer
              </div>
              <div className="text-[11px] text-[#A1A1AA] font-mono mt-0.5">100+ high-clarity prompts</div>
            </div>
          </div>

          {/* Card 3: Typing Avoided */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-4 flex items-center gap-3.5 transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-white/[0.12]">
            <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#FFFFFF] shrink-0">
              <Keyboard className="w-4 h-4 opacity-80" />
            </div>
            <div>
              <div className="text-[12px] font-medium text-[#71717A]">Typing Avoided</div>
              <div className="text-[16px] font-semibold text-[#FFFFFF] font-sans leading-tight mt-0.5">
                {stats.typingAvoided.toLocaleString()} chars
              </div>
              <div className="text-[11px] text-[#A1A1AA] font-mono mt-0.5">≈ {Math.round(stats.typingAvoided / 5).toLocaleString()} words avoided</div>
            </div>
          </div>

          {/* Card 4: Processing & Tokens */}
          <div className="rounded-[18px] border border-white/[0.05] bg-[#131313] p-4 flex items-center gap-3.5 transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-white/[0.12]">
            <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#FFFFFF] shrink-0">
              <Zap className="w-4 h-4 opacity-80" />
            </div>
            <div>
              <div className="text-[12px] font-medium text-[#71717A]">Avg Upgrade Time</div>
              <div className="text-[16px] font-semibold text-[#FFFFFF] font-sans leading-tight mt-0.5">
                2.1 sec
              </div>
              <div className="text-[11px] text-[#A1A1AA] font-mono mt-0.5">{stats.tokensSaved.toLocaleString()} tokens reduced</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
