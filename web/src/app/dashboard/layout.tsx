import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { auth } from "@clerk/nextjs/server"
import { DashboardSync } from "@/components/dashboard-sync"
import { createClient } from "@/lib/supabase/server"
import { TopCommandBar } from "@/components/layout/TopCommandBar"
import { HeatmapLoadingScreen } from "@/components/shared/HeatmapLoadingScreen"
import * as React from "react"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  let historyCount = 0
  let libraryCount = 0
  let streakCount = 0

  if (userId) {
    const supabase = await createClient()
    const [{ count: hc }, { count: lc }, { data: streakLogs }] = await Promise.all([
      supabase.from('optimization_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('snippets').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('optimization_logs').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(365)
    ])
    historyCount = hc || 0
    libraryCount = lc || 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const gridMap = new Map<string, number>()
    if (streakLogs) {
      streakLogs.forEach(u => {
        if (!u.created_at) return
        const dateStr = u.created_at.split("T")[0]
        gridMap.set(dateStr, (gridMap.get(dateStr) || 0) + 1)
      })
    }

    for (let i = 0; i < 365; i++) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const ds = d.toISOString().split("T")[0]
      if (gridMap.get(ds)) {
        streakCount++
      } else {
        if (i === 0) continue
        break
      }
    }
  }

  return (
    <SidebarProvider>
      {/* ─── Surface 0 Deep Background (#111111) ─── */}
      <div
        className="fixed inset-0 z-0"
        style={{ background: '#111111' }}
      />

      {/* ─── Native macOS Application Workspace Shell with Heatmap BG Loader ─── */}
      <HeatmapLoadingScreen>
        <div className="relative z-10 flex h-screen w-full p-3 gap-3 overflow-hidden">
          {/* ─── Sidebar Panel (#151515 / Surface 1) ─── */}
          <div
            className="flex-shrink-0 h-full flex flex-col overflow-hidden"
            style={{
              borderRadius: "24px",
              background: "#151515",
              border: "1px solid rgba(255,255,255,0.05)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <AppSidebar historyCount={historyCount} libraryCount={libraryCount} streakCount={streakCount} />
          </div>

          {/* ─── Primary Workspace Window (#151515 / Surface 1) ─── */}
          <div
            className="flex-1 min-w-0 flex flex-col overflow-hidden relative"
            style={{
              borderRadius: "24px",
              background: "#151515",
              border: "1px solid rgba(255,255,255,0.05)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {/* Subtle White Glow from Top Bar downwards gradient mix with bg */}
            <div
              className="absolute inset-x-0 top-0 h-[320px] pointer-events-none z-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 45%, rgba(21,21,21,0) 100%)",
              }}
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[160px] pointer-events-none z-0 opacity-40 blur-[90px]"
              style={{
                background:
                  "radial-gradient(ellipse at top, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)",
              }}
            />

            <div className="relative z-10 flex flex-col flex-1 min-h-0">
              <TopCommandBar />

              <div className="flex-1 overflow-y-auto">
                {userId && <DashboardSync userId={userId} />}
                {children}
              </div>
            </div>
          </div>
        </div>
      </HeatmapLoadingScreen>
    </SidebarProvider>
  )
}
