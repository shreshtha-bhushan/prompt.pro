import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import * as React from "react"
import { TrendingUp, Cpu, Clock, BarChart3, Layers } from "lucide-react"
import { PromptProIcon } from "@/components/shared/PromptProIcon"
import { AnalyticsCharts } from "./analytics-charts"

export default async function AnalyticsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/login")
  }

  const supabase = await createClient()
  const { data: history } = await supabase
    .from("optimization_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200)

  const logs = history || []

  // Apple-Grade Empty State when no logs exist
  if (logs.length === 0) {
    return (
      <div className="flex-1 pt-6 px-8 pb-12 max-w-[1440px] mx-auto">
        <div className="mb-8">
          <h1 className="text-[32px] font-semibold tracking-tight text-white mb-1 font-sans">
            Personal Prompt Intelligence
          </h1>
          <p className="text-[14px] text-white/50 font-sans">
            Personalized performance telemetry, AI-generated quality insights, and tangible developer productivity metrics.
          </p>
        </div>

        <div className="card p-14 border border-white/[0.06] bg-[#1A1A1C] text-center max-w-lg mx-auto rounded-[28px] shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-white/60">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-[20px] font-semibold text-white mb-2 font-sans">
            No prompt performance data yet
          </h3>
          <p className="text-[14px] text-white/50 mb-6 font-sans">
            Optimize your first prompt to unlock personalized quality breakdowns, rewrite reduction curves, and AI recommendations.
          </p>
          <a
            href="/dashboard/optimization"
            className="inline-flex items-center gap-2 h-[40px] px-6 rounded-xl bg-white text-[#111111] text-[13px] font-semibold hover:bg-white/90 transition-all font-sans shadow-lg"
          >
            <PromptProIcon size={16} variant="transparent" className="text-[#111111]" />
            <span>Optimize Your First Prompt</span>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 pt-6 px-8 pb-14 max-w-[1440px] mx-auto">
      {/* Comprehensive Unified Dashboard Suite with Single Header & Filters */}
      <AnalyticsCharts logs={logs} />
    </div>
  )
}
