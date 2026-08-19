import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-up">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="p-5 rounded-2xl border border-white/[0.06] bg-[#1A1A1C] flex flex-col justify-between h-[200px]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36 bg-white/[0.07] rounded-lg" />
              <Skeleton className="h-5 w-16 bg-white/[0.05] rounded-full" />
            </div>
            <div className="space-y-2 pt-1">
              <Skeleton className="h-3.5 w-full bg-white/[0.04] rounded" />
              <Skeleton className="h-3.5 w-4/5 bg-white/[0.04] rounded" />
              <Skeleton className="h-3.5 w-2/3 bg-white/[0.04] rounded" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
            <Skeleton className="h-3 w-20 bg-white/[0.03] rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 bg-white/[0.04] rounded-lg" />
              <Skeleton className="h-6 w-6 bg-white/[0.04] rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
