import { createClient } from "@/lib/supabase/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { DayCard } from "@/components/home/DayCard"
import { StatCards } from "@/components/home/StatCards"
import { ContributionGrid } from "@/components/home/ContributionGrid"
import { EmptyState } from "@/components/home/EmptyState"
import { PageTransition } from "@/components/shared/PageTransition"
import { WorkspaceHero } from "@/components/home/WorkspaceHero"
import * as React from "react"
import { BookOpen, Clock, ArrowRight } from "lucide-react"
import { PromptSparkleIcon } from "@/components/shared/PromptSparkleIcon"

export default async function DashboardHome() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/login")
  }

  const user = await currentUser()
  const supabase = await createClient()

  const displayName =
    user?.username ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Bhushan"

  // Fetch optimization logs and snippets
  const { data: history } = await supabase
    .from("optimization_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100)

  const { data: snippets } = await supabase
    .from("snippets")
    .select("id, title")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10)

  const upgrades = history || []
  const libraryItems = snippets || []

  // If completely empty, render our Apple-Grade Empty Workspace
  if (upgrades.length === 0) {
    return (
      <PageTransition>
        <div className="flex-1 pt-6 px-8 pb-12 max-w-[1440px] mx-auto">
          <WorkspaceHero
            displayName={displayName}
            totalUpgrades={0}
            avgScoreLift={31}
          />
          <EmptyState />
        </div>
      </PageTransition>
    )
  }

  // Compute metrics
  const totalUpgrades = upgrades.length
  let totalLift = 0
  let totalBefore = 0
  let totalAfter = 0

  upgrades.forEach((u) => {
    totalLift += (u.score_after || 0) - (u.score_before || 0)
    totalBefore += u.score_before || 0
    totalAfter += u.score_after || 0
  })

  const avgScoreLift = Math.round(totalLift / (totalUpgrades || 1))
  const avgAfterScore = Math.round(totalAfter / (totalUpgrades || 1))

  const todayStr = new Date().toISOString().split("T")[0]
  const todayItems = upgrades
    .filter((u) => u.created_at && u.created_at.startsWith(todayStr))
    .map((u) => ({
      id: u.id,
      source: u.site || "Unknown",
      upgraded_prompt: u.upgraded_prompt || u.original_prompt || "Upgraded prompt",
      score_before: u.score_before || 0,
      score_after: u.score_after || 0,
      created_at: u.created_at,
    }))

  // Contribution grid data
  const gridMap = new Map<string, number>()
  upgrades.forEach((u) => {
    if (!u.created_at) return
    const dateStr = u.created_at.split("T")[0]
    gridMap.set(dateStr, (gridMap.get(dateStr) || 0) + 1)
  })

  const gridData = Array.from(gridMap.entries()).map(([date, count]) => ({
    date,
    count,
  }))

  // Streak calculation
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streakCount = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date()
    d.setDate(today.getDate() - i)
    const ds = d.toISOString().split("T")[0]
    if (gridMap.get(ds)) {
      streakCount++
    } else {
      if (i === 0) continue
      break
    }
  }

  const latestPrompt = upgrades[0]

  return (
    <PageTransition>
      <div className="flex-1 pt-6 px-8 pb-12 max-w-[1440px] mx-auto">
        {/* 1. Workspace Hero */}
        <WorkspaceHero
          displayName={displayName}
          totalUpgrades={totalUpgrades}
          avgScoreLift={avgScoreLift}
          latestPrompt={latestPrompt}
        />

        {/* 2. Purpose-Driven Stat Cards ("Why should I care?") */}
        <StatCards
          todayCount={todayItems.length}
          totalUpgrades={totalUpgrades}
          avgScoreLift={avgScoreLift}
          avgAfterScore={avgAfterScore}
          libraryCount={libraryItems.length}
        />

        {/* 3. Asymmetrical Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Main Column (7/12): Activity Timeline */}
          <div className="lg:col-span-7">
            <DayCard items={todayItems.length > 0 ? todayItems : upgrades.slice(0, 6)} />
          </div>

          {/* Right Column (5/12): Secondary Insights & Suggested Actions */}
          <div className="lg:col-span-5 space-y-8">
            <ContributionGrid streakCount={streakCount} gridData={gridData} />

            {/* Suggested Actions Card */}
            <div className="card p-6 border border-white/[0.05] bg-[#1A1A1C]">
              <div className="text-[12px] font-mono uppercase tracking-wider text-white/40 mb-4">
                Suggested Actions
              </div>
              <div className="space-y-3">
                <a
                  href="/dashboard/optimization"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white shrink-0">
                      <PromptSparkleIcon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-white group-hover:text-white truncate">
                        Experiment with Prompt Strategies
                      </div>
                      <div className="text-[11px] text-white/50 truncate">
                        Try Few-Shot &amp; Chain-of-Thought live
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </a>

                <a
                  href="/dashboard/library"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-white group-hover:text-white truncate">
                        Save Reusable System Context
                      </div>
                      <div className="text-[11px] text-white/50 truncate">
                        Organize brand voices &amp; domain rules
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
