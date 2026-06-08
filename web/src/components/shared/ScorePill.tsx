import * as React from "react"

export function ScorePill({ delta }: { delta: number }) {
  const isHigh = delta >= 30
  const sign = delta > 0 ? "+" : ""
  
  return (
    <div className={`score-pill ${!isHigh ? "low" : ""}`}>
      {sign}{delta}
    </div>
  )
}
