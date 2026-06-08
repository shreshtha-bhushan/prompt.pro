import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { auth } from "@clerk/nextjs/server"
import { DashboardSync } from "@/components/dashboard-sync"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  
  let historyCount = 0
  let libraryCount = 0

  if (userId) {
    const supabase = await createClient()
    const [{ count: hc }, { count: lc }] = await Promise.all([
      supabase.from('optimization_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('snippets').select('*', { count: 'exact', head: true }).eq('user_id', userId)
    ])
    historyCount = hc || 0
    libraryCount = lc || 0
  }

  return (
    <SidebarProvider>
      <AppSidebar historyCount={historyCount} libraryCount={libraryCount} />
      <SidebarInset className="h-screen overflow-y-auto">
        <div className="flex flex-1 flex-col bg-background">
          {userId && <DashboardSync userId={userId} />}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
