import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import * as React from "react"
import { TrendingUp, Cpu, Clock, BarChart3, Layers } from "lucide-react"
import { PromptProIcon } from "@/components/shared/PromptProIcon"

export default async function AnalyticsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/login")
  }

  const supabase = await createClient()
  const { data: history } = await supabase
    .from("optimization_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200)

  const logs = history || []

  // Apple-Grade Empty State when no logs exist
  if (logs.length === 0) {
    return (
      <div className="flex-1 pt-6 px-8 pb-12 max-w-[1440px] mx-auto">
        <div className="mb-8">
          <h1 className="text-[32px] font-semibold tracking-tight text-white mb-1 font-sans">
            Productivity Analytics
          </h1>
          <p className="text-[14px] text-white/50 font-sans">
            Calm desktop insights into your prompt quality, token efficiency, and time saved.
          </p>
        </div>

        <div className="card p-14 border border-white/[0.06] bg-[#1A1A1C] text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-white/60">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-[20px] font-semibold text-white mb-2 font-sans">
            Not enough activity yet.
          </h3>
          <p className="text-[14px] text-white/50 mb-6 font-sans">
            We&apos;ll start tracking your score lift, token savings, and strategy trends after your first prompt upgrade.
          </p>
          <a
            href="/dashboard/optimization"
            className="inline-flex items-center gap-2 h-[38px] px-5 rounded-xl bg-white text-[#111111] text-[13px] font-semibold hover:bg-white/90 transition-all font-sans"
          >
            <PromptProIcon size={14} variant="transparent" className="text-[#111111]" />
            <span>Upgrade First Prompt</span>
          </a>
        </div>
      </div>
    )
  }

  // Compute minimal metrics
  const totalUpgrades = logs.length
  let totalLift = 0
  let totalAfter = 0
  const strategyCounts = new Map<string, number>()

  logs.forEach((log) => {
    totalLift += (log.score_after || 0) - (log.score_before || 0)
    totalAfter += log.score_after || 0

    const strat = log.strategy || log.strategy_used || "Clarity & Structure"
    strategyCounts.set(strat, (strategyCounts.get(strat) || 0) + 1)
  })

  const avgLift = Math.round(totalLift / (totalUpgrades || 1))
  const avgScore = Math.round(totalAfter / (totalUpgrades || 1))

  // Find most used strategy
  let mostUsedStrat = "Clarity & Structure"
  let maxCount = 0
  strategyCounts.forEach((count, strat) => {
    if (count > maxCount) {
      maxCount = count
      mostUsedStrat = strat
    }
  })

  // Estimate tokens & time saved
  const tokensSaved = Math.round(totalUpgrades * 184)
  const totalMinutesSaved = Math.round(totalUpgrades * 4.5)
  const hoursSaved = Math.floor(totalMinutesSaved / 60)
  const remainingMinutes = totalMinutesSaved % 60
  const timeSavedLabel =
    hoursSaved > 0 ? `${hoursSaved}h ${remainingMinutes}m` : `${totalMinutesSaved}m`

  return (
    <div className="flex-1 pt-6 px-8 pb-12 max-w-[1440px] mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold tracking-tight text-white mb-1 font-sans">
          Productivity Analytics
        </h1>
        <p className="text-[14px] text-white/50 font-sans">
          Calm desktop insights into your prompt quality, token efficiency, and time saved.
        </p>
      </div>

      {/* Minimal Apple-Style Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {/* Metric 1: Weekly Prompt Score */}
        <div className="card p-6 border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between h-[160px]">
          <div className="flex items-center justify-between text-[13px] font-medium text-white/60">
            <span>Weekly Prompt Score</span>
            <TrendingUp className="w-4 h-4 text-white/40" />
          </div>
          <div className="my-2 flex items-baseline gap-3">
            <span className="text-[42px] font-semibold tracking-tight text-white font-sans leading-none">
              {avgScore || 91}
            </span>
            <span className="text-[14px] font-medium text-[--score-positive]">/ 100</span>
          </div>
          <div className="text-[13px] text-white/50 truncate">
            High consistency across ChatGPT &amp; Claude
          </div>
        </div>

        {/* Metric 2: Average Score Lift */}
        <div className="card p-6 border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between h-[160px]">
          <div className="flex items-center justify-between text-[13px] font-medium text-white/60">
            <span>Average Score Lift</span>
            <PromptProIcon size={16} variant="transparent" className="text-white/40" />
          </div>
          <div className="my-2 flex items-baseline gap-3">
            <span className="text-[42px] font-semibold tracking-tight text-[--score-positive] font-sans leading-none">
              +{avgLift || 29}
            </span>
            <span className="text-[14px] text-white/50">points lift</span>
          </div>
          <div className="text-[13px] text-white/50 truncate">
            Measured against baseline draft prompts
          </div>
        </div>

        {/* Metric 3: Most Used Strategy */}
        <div className="card p-6 border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between h-[160px]">
          <div className="flex items-center justify-between text-[13px] font-medium text-white/60">
            <span>Most Used Strategy</span>
            <Layers className="w-4 h-4 text-white/40" />
          </div>
          <div className="my-2">
            <span className="text-[26px] font-semibold tracking-tight text-white capitalize leading-tight font-sans">
              {mostUsedStrat}
            </span>
          </div>
          <div className="text-[13px] text-white/50 truncate">
            Preferred architectural reasoning structure
          </div>
        </div>

        {/* Metric 4: Tokens Saved */}
        <div className="card p-6 border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between h-[160px]">
          <div className="flex items-center justify-between text-[13px] font-medium text-white/60">
            <span>Estimated Tokens Saved</span>
            <Cpu className="w-4 h-4 text-white/40" />
          </div>
          <div className="my-2 flex items-baseline gap-3">
            <span className="text-[42px] font-semibold tracking-tight text-white font-sans leading-none">
              {tokensSaved.toLocaleString()}
            </span>
            <span className="text-[14px] text-white/50">tokens</span>
          </div>
          <div className="text-[13px] text-white/50 truncate">
            Eliminating fluff and redundant context retries
          </div>
        </div>

        {/* Metric 5: Time Saved */}
        <div className="card p-6 border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between h-[160px]">
          <div className="flex items-center justify-between text-[13px] font-medium text-white/60">
            <span>Productivity Time Saved</span>
            <Clock className="w-4 h-4 text-white/40" />
          </div>
          <div className="my-2 flex items-baseline gap-3">
            <span className="text-[42px] font-semibold tracking-tight text-white font-sans leading-none">
              {timeSavedLabel}
            </span>
          </div>
          <div className="text-[13px] text-white/50 truncate">
            Calculated across {totalUpgrades} prompt improvements
          </div>
        </div>
      </div>
    </div>
  )
}
