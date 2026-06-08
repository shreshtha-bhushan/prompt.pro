"use client"

import * as React from "react"
import { Cloud, Sun, CloudRain, ArrowRight } from "lucide-react"
import { ScorePill } from "@/components/shared/ScorePill"
import { useEffect, useState } from "react"
import { getWeather } from "@/lib/weather"

interface UpgradeItem {
  id: string
  source: string
  upgraded_prompt: string
  score_before: number
  score_after: number
  created_at: string
}

export function DayCard({ items }: { items: UpgradeItem[] }) {
  return (
    <div className="card w-full mb-12">
      <div className="p-5 px-[22px]">
        {/* Top Info Strip */}
        <div className="flex justify-between items-center">
          <div className="text-[13px] font-medium text-[--text-primary] tracking-[0.08em] uppercase">
            {new Date().toLocaleDateString("en-US", { weekday: "long" })}
          </div>
          
          <div className="text-[12px] text-[--text-secondary]">
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>

        <div className="h-px bg-white/[0.06] my-[14px]" />

        <div className="section-head mb-3">TODAY</div>
        
        {/* Activity List */}
        <div className="flex flex-col gap-1">
          {items.length > 0 ? (
            <>
              {items.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-4 h-[40px] min-w-0">
                  <div className="px-2 h-[22px] rounded flex items-center justify-center bg-white/10 shrink-0 overflow-hidden">
                    <span className="text-[10px] uppercase font-bold text-[--text-primary]">
                      {item.source}
                    </span>
                  </div>
                  <div className="text-[13px] text-[--text-primary] truncate flex-1 min-w-0">
                    {item.upgraded_prompt}
                  </div>
                  <div className="ml-auto flex items-center gap-4 shrink-0">
                    <ScorePill delta={item.score_after - item.score_before} />
                    <span className="text-[12px] text-[--text-secondary] min-w-[64px] text-right whitespace-nowrap">
                      {new Date(item.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              {items.length > 5 && (
                <div className="mt-2 text-[12px] text-[--text-secondary] flex items-center gap-1 hover:text-[--text-primary] cursor-pointer w-max transition-colors">
                  <ArrowRight className="w-3 h-3" /> {items.length - 5} more in History
                </div>
              )}
            </>
          ) : (
            <div className="h-[40px] flex items-center gap-3 text-[13px] text-[--text-secondary]">
              <div className="w-5 h-5 rounded-full border border-[--text-secondary] flex items-center justify-center opacity-50 shrink-0" />
              <span>No upgrades yet today. Open ChatGPT, Claude, or Gemini and click ✦ Upgrade</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
