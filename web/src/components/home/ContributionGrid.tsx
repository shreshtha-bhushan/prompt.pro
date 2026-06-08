import * as React from "react"

interface ContributionGridProps {
  streakCount: number
  gridData: { date: string; count: number }[]
}

export function ContributionGrid({ streakCount, gridData }: ContributionGridProps) {
  // Generate a full year of empty data if gridData is empty or short
  // For the exact look, we need 52 cols x 7 rows = 364 cells
  // We'll just build an array of 364 cells. Real data mapping would go here.
  
  // Fake the grid to match the spec:
  // 0 upgrades:  #1a1a1a (var(--layer-3))
  // 1 upgrade:   rgba(74, 222, 128, 0.15)
  // 2–4:         rgba(74, 222, 128, 0.35)
  // 5–9:         rgba(74, 222, 128, 0.60)
  // 10+:         rgba(74, 222, 128, 0.90)
  
  const cells = React.useMemo(() => {
    if (gridData.length === 364) return gridData

    const newCells = []
    const today = new Date()
    for (let i = 363; i >= 0; i--) {
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
    <div className="w-full min-w-0 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 mb-3">
        <span className="section-head mb-0">UPGRADE ACTIVITY</span>
        {streakCount > 0 && (
          <span className="text-[11px] text-[--accent-amber] font-medium">
            {streakCount} day streak
          </span>
        )}
      </div>

      <div 
        className="inline-grid gap-[2px]" 
        style={{ 
          gridTemplateColumns: "repeat(52, 10px)",
          gridTemplateRows: "repeat(7, 10px)",
          gridAutoFlow: "column"
        }}
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            title={`${cell.date}: ${cell.count} upgrades`}
            className="w-[10px] h-[10px] rounded-[2px]"
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
