import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex-1 p-6 md:p-10 space-y-10">
      {/* Greeting Block Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-32 bg-[--border-mid]" />
        <Skeleton className="h-[48px] md:h-[64px] w-64 md:w-96 bg-[--border-mid]" />
      </div>

      {/* Stats Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="glass border-[--border-subtle] bg-transparent rounded-xl overflow-hidden">
            <CardContent className="p-5 flex flex-col gap-4">
              <Skeleton className="h-4 w-32 bg-[--border-mid]" />
              <div>
                <Skeleton className="h-8 w-16 mb-2 bg-[--border-mid]" />
                <Skeleton className="h-3 w-24 bg-[--border-mid]" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Skeleton */}
      <div className="space-y-4 mt-6">
        <Skeleton className="h-4 w-32 bg-[--border-mid]" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3 px-4 glass rounded-lg border border-[--border-subtle]">
              <div className="flex items-center gap-3 w-[200px] shrink-0">
                <Skeleton className="h-5 w-20 rounded-full bg-[--border-mid]" />
                <Skeleton className="h-4 w-16 bg-[--border-mid]" />
              </div>
              <Skeleton className="flex-1 h-4 bg-[--border-mid]" />
              <div className="flex items-center gap-3 shrink-0">
                <Skeleton className="h-4 w-16 bg-[--border-mid]" />
                <Skeleton className="h-3 w-10 bg-[--border-mid]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
