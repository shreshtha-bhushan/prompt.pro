import * as React from "react"

interface ContributionGridProps {
  streakCount: number
  gridData: { date: string; count: number }[]
}

export function ContributionGrid({ streakCount, gridData }: ContributionGridProps) {
  // Generate a shorter view (20 columns x 7 rows = 140 cells) for larger blocks
  const cells = React.useMemo(() => {
    if (gridData.length === 140) return gridData

    const newCells = []
    const today = new Date()
    for (let i = 139; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const existing = gridData.find(g => g.date === dateStr)
      newCells.push({
        date: dateStr,
        count: existing ? existing.count : 0,
      })
    }
    return newCells
  }, [gridData])

  const getCellColor = (count: number) => {
    if (count === 0) return "var(--layer-3)"
    if (count === 1) return "rgba(74, 222, 128, 0.15)"
    if (count <= 4) return "rgba(74, 222, 128, 0.35)"
    if (count <= 9) return "rgba(74, 222, 128, 0.60)"
    return "rgba(74, 222, 128, 0.90)"
  }

  const todayStr = new Date().toISOString().split("T")[0]

  return (
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
          gridAutoFlow: "column"
        }}
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            title={`${cell.date}: ${cell.count} upgrades`}
            className="w-[14px] h-[14px] rounded-[3px]"
            style={{
              backgroundColor: getCellColor(cell.count),
              outline: cell.date === todayStr ? "1px solid rgba(255,255,255,0.20)" : "none",
              outlineOffset: cell.date === todayStr ? "1px" : "0"
            }}
          />
        ))}
      </div>
    </div>
  )
}
