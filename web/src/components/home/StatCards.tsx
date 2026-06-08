import * as React from "react"
import { ArrowRight } from "lucide-react"

interface SiteBreakdown {
  source: string
  count: number
  avgLift: number
}

interface SavedPrompt {
  id: string
  title: string
}

interface StatCardsProps {
  totalUpgrades: number
  avgScoreLift: number
  dailyCounts7Days: number[]
  avgBeforeScore: number
  avgAfterScore: number
  siteBreakdown: SiteBreakdown[]
  recentLibraryItems: SavedPrompt[]
}

export function StatCards({ 
  totalUpgrades, 
  avgScoreLift, 
  dailyCounts7Days,
  avgBeforeScore,
  avgAfterScore,
  siteBreakdown,
  recentLibraryItems
}: StatCardsProps) {
  
  // Calculate max for sparkline normalization
  const maxCount = Math.max(...dailyCounts7Days, 1)

  // Calculate max for site breakdown normalization
  const maxSiteCount = Math.max(...siteBreakdown.map(s => s.count), 1)

  return (
    <div className="grid grid-cols-4 gap-3 mb-12">
      {/* Card 1: Prompts Upgraded */}
      <div className="card px-[22px] py-[20px] min-h-[110px] flex flex-col justify-between">
        <div>
          <div className="hero-num">{totalUpgrades}</div>
          <div className="stat-label mt-1">PROMPTS UPGRADED</div>
        </div>
        <div className="sparkline">
          {dailyCounts7Days.map((count, i) => (
            <div 
              key={i} 
              className="bar" 
              style={{ "--h": `${(count / maxCount) * 100}%` } as React.CSSProperties} 
            />
          ))}
        </div>
      </div>

      {/* Card 2: Avg Score Lift */}
      <div className="card px-[22px] py-[20px] min-h-[110px] flex flex-col justify-between">
        <div>
          <div className="hero-num text-[--accent-green]">{avgScoreLift > 0 ? "+" : ""}{avgScoreLift} pts</div>
          <div className="stat-label mt-1">AVG SCORE LIFT</div>
        </div>
        <div className="mt-3 flex flex-col gap-1.5 w-full max-w-[120px]">
          <div className="flex items-center justify-between text-[10px] text-[--text-secondary] w-full">
            <span className="w-10">Before</span>
            <div className="flex-1 h-1 rounded-[2px] bg-white/[0.12] mx-2 relative overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-white/30" 
                style={{ width: `${avgBeforeScore}%` }}
              />
            </div>
            <span className="w-5 text-right font-medium">{avgBeforeScore}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[--text-secondary] w-full">
            <span className="w-10">After</span>
            <div className="flex-1 h-1 rounded-[2px] bg-white/[0.12] mx-2 relative overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[--accent-green] to-[--accent-cyan]" 
                style={{ width: `${avgAfterScore}%` }}
              />
            </div>
            <span className="w-5 text-right font-medium text-[--text-primary]">{avgAfterScore}</span>
          </div>
        </div>
      </div>

      {/* Card 3: Site Breakdown */}
      <div className="card px-[22px] py-[20px] min-h-[140px] flex flex-col">
        <div className="section-head mb-4">SITES</div>
        <div className="flex flex-col gap-2.5">
          {siteBreakdown.map(site => (
            <div key={site.source} className="flex items-center text-[11px] w-full">
              <div className="text-[--text-secondary] min-w-[60px] uppercase truncate">
                {site.source}
              </div>
              <div className="flex-1 h-[3px] rounded-[2px] bg-white/[0.12] mx-2 relative overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-white" 
                  style={{ width: site.count > 0 ? `${(site.count / maxSiteCount) * 100}%` : "0%" }}
                />
              </div>
              <div className="text-[12px] font-medium text-[--text-primary] font-variant-tabular-nums min-w-[20px] text-right">
                {site.count}
              </div>
              <div className="text-[10px] text-[--text-tertiary] ml-2 w-10 text-right">
                {site.count > 0 ? `avg +${site.avgLift}` : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card 4: Library Items */}
      <div className="card px-[22px] py-[20px] min-h-[140px] flex flex-col justify-between">
        <div>
          <div className="hero-num">{recentLibraryItems.length > 0 ? "4" : "0"}</div>
          <div className="stat-label mt-1">LIBRARY ITEMS</div>
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          {recentLibraryItems.slice(0, 2).map((item, i) => (
            <div key={i} className="text-[11px] text-[--text-secondary] truncate">
              {item.title}
            </div>
          ))}
          <a href="/dashboard/library" className="text-[10px] text-[--text-secondary] hover:text-[--text-primary] transition-colors mt-1 inline-flex items-center">
            <ArrowRight className="w-3 h-3 mr-1" /> View Library
          </a>
        </div>
      </div>
    </div>
  )
}
