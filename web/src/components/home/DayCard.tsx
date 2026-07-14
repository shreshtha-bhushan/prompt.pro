"use client"

import * as React from "react"
import { ArrowRight, Clock } from "lucide-react"
import { ScorePill } from "@/components/shared/ScorePill"
import { ModelIcon } from "@/components/shared/ModelIcon"

interface UpgradeItem {
  id: string
  source: string
  original_prompt?: string
  upgraded_prompt: string
  score_before: number
  score_after: number
  created_at: string
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "just now"
  const d = new Date(dateStr)
  const now = new Date()
  const diffSec = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000))

  if (diffSec < 60) return "just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function DayCard({ items }: { items: UpgradeItem[] }) {
  return (
    <div className="card w-full mb-8 border border-white/[0.05] bg-[#1A1A1C] group">
      <div
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-15 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)" }}
      />
      <div className="p-6 relative z-10">
        {/* Timeline Header Strip */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/40" />
            <h3 className="text-[13px] font-mono uppercase tracking-wider text-white/60">
              Recent Activity Timeline
            </h3>
          </div>
          <a
            href="/dashboard/history"
            className="inline-flex items-center gap-1 text-[12px] text-white/50 hover:text-white transition-colors"
          >
            <span>View Full History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Activity Timeline List */}
        <div className="space-y-4">
          {items && items.length > 0 ? (
            items.slice(0, 6).map((item, index) => {
              const delta = (item.score_after || 0) - (item.score_before || 0)
              const timeStr = formatRelativeTime(item.created_at)

              return (
                <React.Fragment key={item.id}>
                  <div className="flex items-center justify-between gap-4 py-1.5 group">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Model Icon badge */}
                      <span
                        title={item.source || "Extension"}
                        className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0"
                      >
                        <ModelIcon site={item.source} className="w-3.5 h-3.5 text-white/80" />
                      </span>

                      {/* Original Prompt preview text */}
                      <p className="text-[13px] text-white/90 truncate group-hover:text-white transition-colors min-w-0">
                        {item.original_prompt || item.upgraded_prompt}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <ScorePill delta={delta} />
                      <span className="text-[12px] font-mono text-white/40 min-w-[56px] text-right">
                        {timeStr}
                      </span>
                    </div>
                  </div>

                  {index < Math.min(items.length, 6) - 1 && (
                    <div className="h-px bg-white/[0.04]" />
                  )}
                </React.Fragment>
              )
            })
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="text-[13px] text-white/50 mb-1">
                No activity recorded yet today.
              </div>
              <div className="text-[12px] text-white/30">
                Open ChatGPT or Claude and use PromptPro to begin building your timeline.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
