import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex-1 p-6 md:p-8 max-w-[1440px] mx-auto space-y-8 animate-fade-up">
      {/* Top Workspace Greeting Skeleton */}
      <div className="p-8 rounded-[24px] border border-white/[0.06] bg-[#1A1A1C] space-y-4">
        <Skeleton className="h-4 w-32 bg-white/[0.05] rounded-md" />
        <Skeleton className="h-8 w-64 bg-white/[0.08] rounded-xl" />
        <Skeleton className="h-4 w-96 bg-white/[0.04] rounded-lg" />
      </div>

      {/* Grid of Sub-Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-6 rounded-2xl border border-white/[0.06] bg-[#1A1A1C] space-y-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 bg-white/[0.06] rounded" />
              <Skeleton className="h-6 w-6 bg-white/[0.04] rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20 bg-white/[0.08] rounded-lg" />
            <Skeleton className="h-3 w-40 bg-white/[0.04] rounded" />
          </div>
        ))}
      </div>

      {/* Large Content Block Skeleton */}
      <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#1A1A1C] space-y-4">
        <Skeleton className="h-5 w-44 bg-white/[0.06] rounded-lg" />
        <div className="space-y-3 pt-2">
          <Skeleton className="h-14 w-full bg-white/[0.03] rounded-xl" />
          <Skeleton className="h-14 w-full bg-white/[0.03] rounded-xl" />
          <Skeleton className="h-14 w-full bg-white/[0.03] rounded-xl" />
        </div>
      </div>
    </div>
  )
}
