'use client'

import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ContributionGridProps {
  streakCount: number
  gridData: { date: string; count: number }[]
}

export function ContributionGrid({ streakCount, gridData }: ContributionGridProps) {
  // Use state so the date is only resolved on the client, preventing
  // server/client mismatch when the server timezone differs from the browser.
  const [todayStr, setTodayStr] = React.useState<string>("")

  React.useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0])
  }, [])

  // Build the full 140-cell grid, resolving dates on the client only
  const [cells, setCells] = React.useState<{ date: string; count: number }[]>([])

  React.useEffect(() => {
    if (gridData.length === 140) {
      setCells(gridData)
      return
    }

    const newCells = []
    const today = new Date()
    for (let i = 139; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const existing = gridData.find((g) => g.date === dateStr)
      newCells.push({ date: dateStr, count: existing ? existing.count : 0 })
    }
    setCells(newCells)
  }, [gridData])

  const getCellColor = (count: number) => {
    if (count === 0) return "var(--layer-3)"
    if (count === 1) return "rgba(74, 222, 128, 0.15)"
    if (count <= 4) return "rgba(74, 222, 128, 0.35)"
    if (count <= 9) return "rgba(74, 222, 128, 0.60)"
    return "rgba(74, 222, 128, 0.90)"
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="card w-full p-6 border border-white/[0.05] bg-[#1A1A1C] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
          <span className="text-[12px] font-mono uppercase tracking-wider text-white/40">Prompt Activity Grid</span>
          {streakCount > 0 && (
            <span className="text-[11px] font-mono font-semibold text-[--warning]">
              {streakCount}d streak 🔥
            </span>
          )}
        </div>

        <div
          className="inline-grid gap-[4px]"
          style={{
            gridTemplateColumns: "repeat(20, 14px)",
            gridTemplateRows: "repeat(7, 14px)",
            gridAutoFlow: "column",
          }}
        >
          {cells.map((cell, i) => {
            const isToday = todayStr !== "" && cell.date === todayStr
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    className="w-[14px] h-[14px] rounded-[3px] transition-transform hover:scale-110"
                    style={{
                      backgroundColor: getCellColor(cell.count),
                      outline: isToday ? "1px solid rgba(255,255,255,0.20)" : "none",
                      outlineOffset: isToday ? "1px" : "0",
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-[#111111] border border-white/[0.1] text-white/90 text-[12px] font-mono shadow-xl rounded-lg px-3 py-1.5"
                >
                  {cell.date}: <span className="font-semibold">{cell.count} upgrades</span>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
