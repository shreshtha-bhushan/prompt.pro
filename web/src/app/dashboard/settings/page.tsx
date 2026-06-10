import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const { userId, getToken } = await auth()

  if (!userId) {
    redirect("/login")
  }
  
  const token = await getToken({ template: 'supabase' })

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full p-6 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-[800] tracking-tight bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">Settings</h1>
          <p className="text-sm text-[--text-secondary]">Manage your account and extension preferences.</p>
        </div>
      </div>
      
      <SettingsClient userId={userId} clerkToken={token} />
    </div>
  )
}
