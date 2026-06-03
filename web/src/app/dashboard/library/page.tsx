import { LibraryClient } from "./library-client"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function LibraryPage() {
  const { userId, getToken } = await auth()

  if (!userId) {
    redirect("/login")
  }
  
  const token = await getToken({ template: 'supabase' })

  return (
    <div className="flex flex-1 flex-col h-full min-h-0">
      <LibraryClient userId={userId} clerkToken={token} />
    </div>
  )
}
