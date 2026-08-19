import type { Metadata } from "next"
import { LibraryClient } from "./library-client"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Snippet Library | PromptPro",
  description:
    "Organize, manage, and synchronize reusable prompt templates, role personas, and modular context blocks.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function LibraryPage() {
  const { userId, getToken } = await auth()

  if (!userId) {
    redirect("/login")
  }
  
  const token = await getToken({ template: 'supabase' })

  return (
    <div className="w-full p-6 md:p-8 max-w-full overflow-x-hidden">
      <LibraryClient userId={userId} clerkToken={token} />
    </div>
  )
}
