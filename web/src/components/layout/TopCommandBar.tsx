"use client"

import * as React from "react"
import { useState } from "react"
import { Search, Bell } from "lucide-react"
import { PromptProIcon } from "@/components/shared/PromptProIcon"

export function TopCommandBar() {
  const [searchFocused, setSearchFocused] = useState(false)
  const [dateStr, setDateStr] = useState("")

  React.useEffect(() => {
    setDateStr(
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(new Date())
    )
  }, [])

  return (
    <header className="h-[52px] w-full shrink-0 flex items-center justify-between px-6 border-b border-white/[0.05] bg-[#111111]/80 backdrop-blur-xl z-20">
      {/* Left: Day and Date */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-medium tracking-tight text-white/85 font-sans">
          {dateStr || "Today"}
        </span>
      </div>

      {/* Center: Search Command Bar (Increased width by ~20% for prominent command surface) */}
      <div className="flex-1 max-w-[540px] mx-6">
        <div
          className={`relative flex items-center h-[34px] w-full rounded-xl border transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] px-3.5 ${
            searchFocused
              ? "bg-white/[0.07] border-[#32D74B]/30 shadow-[0_0_0_3px_rgba(50,215,75,0.12)]"
              : "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.12]"
          }`}
        >
          <Search className="w-3.5 h-3.5 text-white/40 mr-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Search prompts, strategies, or history..."
            className="w-full bg-transparent text-[13px] text-white/90 placeholder:text-white/30 focus:outline-none"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <kbd className="inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-sans font-medium text-white/40 bg-white/[0.06] border border-white/[0.08] rounded">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        <a
          href="/dashboard/optimization"
          className="inline-flex items-center gap-1.5 h-[32px] px-3.5 rounded-xl bg-white text-[#111111] text-[12px] font-semibold transition-all hover:bg-white/90 shadow-[0_1px_8px_rgba(255,255,255,0.15)]"
        >
          <PromptProIcon size={14} variant="transparent" className="text-[#111111]" />
          <span>Upgrade Prompt</span>
        </a>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex items-center justify-center w-[32px] h-[32px] rounded-xl border border-white/[0.06] bg-white/[0.03] text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[--score-positive]" />
        </button>
      </div>
    </header>
  )
}
