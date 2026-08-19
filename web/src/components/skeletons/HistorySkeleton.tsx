import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export function HistorySkeleton() {
  return (
    <div className="space-y-8 animate-fade-up">
      {/* Day Group 1 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-20 bg-white/[0.06] rounded" />
          <div className="h-px flex-1 bg-white/[0.04]" />
          <Skeleton className="h-3 w-16 bg-white/[0.04] rounded" />
        </div>

        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-white/[0.05] bg-[#1A1A1C] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="h-[26px] w-24 bg-white/[0.06] rounded-lg shrink-0" />
                <Skeleton className="h-[26px] w-20 bg-white/[0.05] rounded-lg shrink-0" />
                <Skeleton className="h-4 w-2/3 bg-white/[0.05] rounded" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="h-6 w-12 bg-white/[0.05] rounded-full" />
                <Skeleton className="h-4 w-12 bg-white/[0.04] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Day Group 2 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-24 bg-white/[0.06] rounded" />
          <div className="h-px flex-1 bg-white/[0.04]" />
          <Skeleton className="h-3 w-16 bg-white/[0.04] rounded" />
        </div>

        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-white/[0.05] bg-[#1A1A1C] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="h-[26px] w-20 bg-white/[0.06] rounded-lg shrink-0" />
                <Skeleton className="h-[26px] w-24 bg-white/[0.05] rounded-lg shrink-0" />
                <Skeleton className="h-4 w-1/2 bg-white/[0.05] rounded" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="h-6 w-12 bg-white/[0.05] rounded-full" />
                <Skeleton className="h-4 w-12 bg-white/[0.04] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
