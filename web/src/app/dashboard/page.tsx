import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/server"
import { ArrowRightIcon, ZapIcon, TrendingUpIcon, GlobeIcon, BookOpenIcon } from "lucide-react"
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { clerkToUuid } from "@/lib/utils"

// Format date relative (e.g., "2m ago", "1h ago")
function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default async function DashboardHome() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/login")
  }
  
  const user = await currentUser()
  const supabase = await createClient()
  const uuid = userId
  
  // 1. Prompts Upgraded
  const { count: promptsUpgraded } = await supabase
    .from('optimization_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', uuid)

  // 2. Avg Score Lift
  const { data: scores } = await supabase
    .from('optimization_logs')
    .select('score_before, score_after')
    .eq('user_id', uuid)

  let avgScoreLift = 0
  if (scores && scores.length > 0) {
    const totalLift = scores.reduce((acc, curr) => acc + ((curr.score_after || 0) - (curr.score_before || 0)), 0)
    avgScoreLift = Math.round(totalLift / scores.length)
  }

  // 3. Active Sites
  const { data: sites } = await supabase
    .from('optimization_logs')
    .select('site')
    .eq('user_id', uuid)
  
  const activeSites = new Set(sites?.map(s => s.site)).size

  // 4. Library Items
  const { count: libraryItems } = await supabase
    .from('snippets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', uuid)

  // Recent Activity
  const { data: recentActivity } = await supabase
    .from('optimization_logs')
    .select('*')
    .eq('user_id', uuid)
    .order('created_at', { ascending: false })
    .limit(10)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  
  const firstName = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "User"

  return (
    <div className="flex-1 p-6 md:p-10 space-y-10">
      {/* Greeting Block */}
      <div className="space-y-1">
        <h2 className="text-[11px] tracking-[0.1em] uppercase text-[--text-muted]">
          {greeting},
        </h2>
        <h1 className="text-[clamp(36px,5vw,64px)] font-semibold tracking-[-0.03em] leading-[1.1] text-[--text-primary]">
          {firstName}.
        </h1>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <Card className="glass border-[--border-subtle] bg-transparent text-[--text-primary] rounded-xl overflow-hidden">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ZapIcon className="w-4 h-4 text-[--text-muted]" />
              <span className="text-xs uppercase tracking-wide text-[--text-muted] font-medium">Prompts Upgraded</span>
            </div>
            <div>
              <div className="text-[28px] font-semibold tracking-tight leading-none">{promptsUpgraded || 0}</div>
              <div className="text-xs text-[--text-secondary] mt-1">Total optimizations</div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card className="glass border-[--border-subtle] bg-transparent text-[--text-primary] rounded-xl overflow-hidden">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="w-4 h-4 text-[--text-muted]" />
              <span className="text-xs uppercase tracking-wide text-[--text-muted] font-medium">Avg Score Lift</span>
            </div>
            <div>
              <div className="text-[28px] font-semibold tracking-tight leading-none">+{avgScoreLift} pts</div>
              <div className="text-xs text-[--text-secondary] mt-1">Across all sites</div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card className="glass border-[--border-subtle] bg-transparent text-[--text-primary] rounded-xl overflow-hidden">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <GlobeIcon className="w-4 h-4 text-[--text-muted]" />
              <span className="text-xs uppercase tracking-wide text-[--text-muted] font-medium">Active Sites</span>
            </div>
            <div>
              <div className="text-[28px] font-semibold tracking-tight leading-none">{activeSites || 0}</div>
              <div className="text-xs text-[--text-secondary] mt-1">Domains with usage</div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4 */}
        <Card className="glass border-[--border-subtle] bg-transparent text-[--text-primary] rounded-xl overflow-hidden">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <BookOpenIcon className="w-4 h-4 text-[--text-muted]" />
              <span className="text-xs uppercase tracking-wide text-[--text-muted] font-medium">Library Items</span>
            </div>
            <div>
              <div className="text-[28px] font-semibold tracking-tight leading-none">{libraryItems || 0}</div>
              <div className="text-xs text-[--text-secondary] mt-1">Saved snippets</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-[--text-primary]">Recent Activity</h3>
        <ScrollArea className="h-[400px] pr-4">
          <div className="flex flex-col gap-2">
            {!recentActivity || recentActivity.length === 0 ? (
              <div className="text-sm text-[--text-muted] py-4">No recent activity found. Upgrade some prompts!</div>
            ) : (
              recentActivity.map((log: any) => {
                const originalPrompt = log.original_prompt || ""
                const truncatedPrompt = originalPrompt.length > 60 ? originalPrompt.substring(0, 60) + '...' : originalPrompt

                return (
                  <div key={log.id} className="flex items-center gap-4 py-3 px-4 glass rounded-lg border border-[--border-subtle]">
                    <div className="flex items-center gap-3 w-[200px] shrink-0">
                      <span className="text-xs border border-[--border-subtle] rounded-full px-2 py-0.5 text-[--text-primary]">{log.site}</span>
                      <span className="text-xs text-[--text-muted] uppercase tracking-wide">{log.strategy}</span>
                    </div>
                    <div className="flex-1 truncate text-sm text-[--text-secondary]">
                      {truncatedPrompt}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[--text-muted]">{log.score_before}</span>
                        <ArrowRightIcon className="w-3 h-3 text-[--text-muted]" />
                        <span className="text-[--text-primary] font-medium">{log.score_after}</span>
                      </div>
                      <span className="text-xs text-[--text-muted] w-16 text-right">
                        {log.created_at ? timeAgo(log.created_at) : ''}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
