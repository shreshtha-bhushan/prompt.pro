import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-white/[0.06] rounded-xl" />
          <Skeleton className="h-4 w-96 bg-white/[0.04] rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-60 bg-white/[0.05] rounded-xl" />
          <Skeleton className="h-9 w-9 bg-white/[0.05] rounded-xl" />
        </div>
      </div>

      {/* 4-Column KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-white/[0.06] bg-[#1A1A1C] space-y-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 bg-white/[0.06] rounded" />
              <Skeleton className="h-7 w-7 bg-white/[0.05] rounded-lg" />
            </div>
            <Skeleton className="h-9 w-28 bg-white/[0.08] rounded-lg" />
            <Skeleton className="h-3 w-36 bg-white/[0.04] rounded" />
          </div>
        ))}
      </div>

      {/* Main Chart Card Skeleton */}
      <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#1A1A1C] space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48 bg-white/[0.06] rounded" />
            <Skeleton className="h-3 w-64 bg-white/[0.04] rounded" />
          </div>
          <Skeleton className="h-7 w-32 bg-white/[0.05] rounded-lg" />
        </div>
        <div className="h-64 w-full flex items-end gap-3 pt-6 px-2">
          {[40, 65, 30, 85, 50, 90, 75, 45, 80, 60, 95, 70].map((height, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2">
              <div
                style={{ height: `${height}%` }}
                className="w-full rounded-t-lg bg-white/[0.04] animate-pulse"
              />
              <Skeleton className="h-2.5 w-6 bg-white/[0.03] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Secondary 2-Column Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#1A1A1C] space-y-4">
          <Skeleton className="h-5 w-40 bg-white/[0.06] rounded" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-24 bg-white/[0.05] rounded" />
                  <Skeleton className="h-3.5 w-12 bg-white/[0.05] rounded" />
                </div>
                <Skeleton className="h-2 w-full bg-white/[0.04] rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#1A1A1C] space-y-4">
          <Skeleton className="h-5 w-40 bg-white/[0.06] rounded" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-28 bg-white/[0.05] rounded" />
                  <Skeleton className="h-3.5 w-10 bg-white/[0.05] rounded" />
                </div>
                <Skeleton className="h-2 w-full bg-white/[0.04] rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
