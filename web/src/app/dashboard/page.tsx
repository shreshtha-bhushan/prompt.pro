import { createClient } from "@/lib/supabase/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { DayCard } from "@/components/home/DayCard"
import { StatCards } from "@/components/home/StatCards"
import { ContributionGrid } from "@/components/home/ContributionGrid"
import { EmptyState } from "@/components/home/EmptyState"
import { PageTransition } from "@/components/shared/PageTransition"
import { WeatherWidget } from "@/components/home/WeatherWidget"
import * as React from "react"

export default async function DashboardHome() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/login")
  }
  
  const user = await currentUser()
  const supabase = await createClient()
  
  const displayName = user?.username || user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "User"
  
  // Fetch everything needed
  const { data: history } = await supabase
    .from('optimization_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: snippets } = await supabase
    .from('snippets')
    .select('id, title')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(2)

  const upgrades = history || []
  const libraryItems = snippets || []

  // If completely empty:
  if (upgrades.length === 0) {
    return (
      <PageTransition>
        <div className="flex-1 pt-[40px] px-[48px] pb-[40px]">
          <div className="mb-[48px]">
            <h2 className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[--text-secondary] mb-2">
              {getGreetingWord()},
            </h2>
            <h1 className="text-[64px] font-[800] tracking-[-0.04em] leading-[1] bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent mb-2">
              {displayName}
            </h1>
            <p className="text-[13px] text-[--text-secondary]">
              No upgrades yet today. Head to ChatGPT or Claude to get started.
            </p>
          </div>
          <EmptyState />
        </div>
      </PageTransition>
    )
  }

  // Compute stats server-side
  const totalUpgrades = upgrades.length
  let totalLift = 0
  let totalBefore = 0
  let totalAfter = 0

  upgrades.forEach(u => {
    totalLift += (u.score_after || 0) - (u.score_before || 0)
    totalBefore += (u.score_before || 0)
    totalAfter += (u.score_after || 0)
  })

  const avgScoreLift = Math.round(totalLift / (totalUpgrades || 1))
  const avgBeforeScore = Math.round(totalBefore / (totalUpgrades || 1))
  const avgAfterScore = Math.round(totalAfter / (totalUpgrades || 1))

  const todayStr = new Date().toISOString().split("T")[0]
  const todayItems = upgrades.filter(u => u.created_at && u.created_at.startsWith(todayStr))
    .map(u => ({
      id: u.id,
      source: u.site || "Unknown",
      upgraded_prompt: u.upgraded_prompt || u.original_prompt || "Upgraded prompt",
      score_before: u.score_before || 0,
      score_after: u.score_after || 0,
      created_at: u.created_at
    }))

  // Site Breakdown
  const siteMap = new Map<string, { count: number; lift: number }>()
  upgrades.forEach(u => {
    const s = u.site ? u.site.toUpperCase() : "UNKNOWN"
    const entry = siteMap.get(s) || { count: 0, lift: 0 }
    entry.count++
    entry.lift += (u.score_after || 0) - (u.score_before || 0)
    siteMap.set(s, entry)
  })

  const siteBreakdown = Array.from(siteMap.entries()).map(([source, data]) => ({
    source,
    count: data.count,
    avgLift: Math.round(data.lift / data.count)
  })).sort((a, b) => b.count - a.count).slice(0, 3)

  if (siteBreakdown.length < 3) {
    const fill = ["CHATGPT", "CLAUDE", "GEMINI"].filter(s => !siteMap.has(s))
    while (siteBreakdown.length < 3 && fill.length > 0) {
      siteBreakdown.push({ source: fill.shift()!, count: 0, avgLift: 0 })
    }
  }

  // Daily counts for sparkline
  const dailyCounts7Days = Array(7).fill(0)
  const today = new Date()
  today.setHours(0,0,0,0)
  upgrades.forEach(u => {
    if (!u.created_at) return
    const d = new Date(u.created_at)
    d.setHours(0,0,0,0)
    const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24))
    if (diff >= 0 && diff < 7) {
      dailyCounts7Days[6 - diff]++ // index 6 is today
    }
  })

  // Contribution grid data
  const gridMap = new Map<string, number>()
  upgrades.forEach(u => {
    if (!u.created_at) return
    const dateStr = u.created_at.split("T")[0]
    gridMap.set(dateStr, (gridMap.get(dateStr) || 0) + 1)
  })
  
  const gridData = Array.from(gridMap.entries()).map(([date, count]) => ({ date, count }))
  
  // Streak
  let streakCount = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date()
    d.setDate(today.getDate() - i)
    const ds = d.toISOString().split("T")[0]
    if (gridMap.get(ds)) {
      streakCount++
    } else {
      if (i === 0) continue // if today is 0, we check yesterday before breaking
      break
    }
  }

  return (
    <PageTransition>
      <div className="flex-1 pt-[40px] px-[48px] pb-[40px] min-h-screen">
        {/* Greeting Block & Date/Weather */}
        <div className="mb-[48px] flex items-end justify-between">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[0.15em] uppercase text-[--text-secondary] mb-2">
              {getGreetingWord()},
            </h2>
            <h1 className="text-[80px] font-[800] tracking-[-0.04em] leading-[1] bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent mb-3">
              {displayName}
            </h1>
            <p className="text-[14px] text-[--text-secondary] mt-2">
              {todayItems.length === 0 
                ? "No upgrades yet today. Head to ChatGPT or Claude to get started." 
                : todayItems.length < 5 
                  ? `You've upgraded ${todayItems.length} prompt${todayItems.length > 1 ? 's' : ''} today.` 
                  : `Strong day — ${todayItems.length} upgrades and counting.`}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2 pb-2">
            <div className="text-[16px] font-medium text-[--text-primary] tracking-[0.05em] uppercase">
              {new Date().toLocaleDateString("en-US", { weekday: "long" })}
            </div>
            <div className="text-[14px] text-[--text-secondary]">
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
            {/* Note: Weather is handled in DayCard currently, but the user wanted it moved here. 
                I'll add a Weather block here directly using the API. Wait, I should fetch weather here or in a client component. 
                Let's create a Client Component for Weather so it fetches correctly on the client side. */}
            <WeatherWidget />
          </div>
        </div>

        <DayCard items={todayItems} />

        <StatCards 
          totalUpgrades={totalUpgrades}
          avgScoreLift={avgScoreLift}
          avgBeforeScore={avgBeforeScore}
          avgAfterScore={avgAfterScore}
          dailyCounts7Days={dailyCounts7Days}
          siteBreakdown={siteBreakdown}
          recentLibraryItems={libraryItems}
        />

        <ContributionGrid 
          streakCount={streakCount}
          gridData={gridData}
        />
      </div>
    </PageTransition>
  )
}

function getGreetingWord() {
  const hour = new Date().getHours()
  if (hour < 12) return 'GOOD MORNING'
  if (hour < 18) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}
