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
          <h1 className="text-2xl font-semibold tracking-tight text-[--text-primary]">Settings</h1>
          <p className="text-sm text-[--text-secondary]">Manage your account and extension preferences.</p>
        </div>
      </div>
      
      <SettingsClient userId={userId} clerkToken={token} />
    </div>
  )
}
