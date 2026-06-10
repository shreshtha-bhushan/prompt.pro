import { HistoryClient } from "./history-client"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function HistoryPage() {
  const { userId, getToken } = await auth()

  if (!userId) {
    redirect("/login")
  }
  
  const token = await getToken({ template: 'supabase' })

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full p-6 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-[800] tracking-tight bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">Optimization History</h1>
          <p className="text-sm text-[--text-secondary]">View and compare your past prompt upgrades.</p>
        </div>
      </div>
      
      <HistoryClient userId={userId} clerkToken={token} />
    </div>
  )
}
