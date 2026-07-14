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
    <div className="w-full p-6 md:p-8 max-w-full overflow-x-hidden">
      <SettingsClient userId={userId} clerkToken={token} />
    </div>
  )
}
