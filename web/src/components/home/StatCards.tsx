"use client"

import * as React from "react"
import { ArrowUpRight, Clock, BookOpen, TrendingUp } from "lucide-react"
import { PromptProIcon } from "@/components/shared/PromptProIcon"

interface StatCardsProps {
  todayCount: number
  totalUpgrades: number
  avgScoreLift: number
  avgAfterScore: number
  libraryCount: number
}

export function StatCards({
  todayCount = 0,
  totalUpgrades = 0,
  avgScoreLift = 0,
  avgAfterScore = 89,
  libraryCount = 0
}: StatCardsProps) {
  // Calculate time saved: ~4.5 minutes saved per prompt improved
  const totalMinutesSaved = Math.round(totalUpgrades * 4.5)
  const hoursSaved = Math.floor(totalMinutesSaved / 60)
  const remainingMinutes = totalMinutesSaved % 60
  const timeSavedLabel = hoursSaved > 0
    ? `${hoursSaved}h ${remainingMinutes}m`
    : `${totalMinutesSaved}m`

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Card 1: Today's Improvements */}
      <div className="card p-6 flex flex-col justify-between h-[150px] border border-white/[0.06] bg-[#1A1A1C] group">
        <div
          className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)" }}
        />
        <div className="flex items-center justify-between text-[13px] font-medium text-white/60 relative z-10">
          <span>Today&apos;s Improvements</span>
          <PromptProIcon size={16} variant="transparent" className="text-white/40" />
        </div>
        <div className="my-2 flex items-baseline gap-3 relative z-10">
          <span className="text-[40px] font-semibold tracking-tight text-white font-sans leading-none">
            {todayCount}
          </span>
          {avgScoreLift > 0 && (
            <span className="inline-flex items-center text-[13px] font-medium text-[--score-positive]">
              ↑+{avgScoreLift} avg lift
            </span>
          )}
        </div>
        <div className="text-[13px] text-white/50 truncate relative z-10">
          {todayCount > 0
            ? "Faster AI outputs generated today"
            : "Improve a prompt in ChatGPT or Claude to track"}
        </div>
      </div>

      {/* Card 2: Prompt Library */}
      <div className="card p-6 flex flex-col justify-between h-[150px] border border-white/[0.06] bg-[#1A1A1C] group">
        <div
          className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)" }}
        />
        <div className="flex items-center justify-between text-[13px] font-medium text-white/60 relative z-10">
          <span>Prompt Library</span>
          <BookOpen className="w-4 h-4 text-white/40" />
        </div>
        <div className="my-2 flex items-baseline gap-3 relative z-10">
          <span className="text-[40px] font-semibold tracking-tight text-white font-sans leading-none">
            {libraryCount}
          </span>
          <span className="text-[13px] text-white/50">Saved</span>
        </div>
        <a
          href="/dashboard/library"
          className="inline-flex items-center gap-1 text-[13px] text-white/70 hover:text-white transition-colors truncate relative z-10"
        >
          <span>Reusable context &amp; templates</span>
          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
        </a>
      </div>

      {/* Card 3: Average Prompt Quality Score */}
      <div className="card p-6 flex flex-col justify-between h-[150px] border border-white/[0.06] bg-[#1A1A1C] group">
        <div
          className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)" }}
        />
        <div className="flex items-center justify-between text-[13px] font-medium text-white/60 relative z-10">
          <span>Average Score</span>
          <TrendingUp className="w-4 h-4 text-white/40" />
        </div>
        <div className="my-2 flex items-baseline gap-3 relative z-10">
          <span className="text-[40px] font-semibold tracking-tight text-white font-sans leading-none">
            {avgAfterScore || 89}
          </span>
          <span className="text-[13px] font-medium text-[--score-positive]">/ 100</span>
        </div>
        <div className="text-[13px] text-white/50 truncate relative z-10">
          Consistent clarity across all LLMs
        </div>
      </div>

      {/* Card 4: Estimated Time Saved */}
      <div className="card p-6 flex flex-col justify-between h-[150px] border border-white/[0.06] bg-[#1A1A1C] group">
        <div
          className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)" }}
        />
        <div className="flex items-center justify-between text-[13px] font-medium text-white/60 relative z-10">
          <span>Time Saved</span>
          <Clock className="w-4 h-4 text-white/40" />
        </div>
        <div className="my-2 flex items-baseline gap-3 relative z-10">
          <span className="text-[40px] font-semibold tracking-tight text-white font-sans leading-none">
            {timeSavedLabel}
          </span>
        </div>
        <div className="text-[13px] text-white/50 truncate relative z-10">
          Saved from manual iteration &amp; retries
        </div>
      </div>
    </div>
  )
}
