import type { Metadata } from "next"
import { HistoryClient } from "./history-client"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Prompt History | PromptPro",
  description:
    "Searchable log of all optimized prompts with quality benchmark metrics, before-and-after comparisons, and platform breakdowns.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function HistoryPage() {
  const { userId, getToken } = await auth()

  if (!userId) {
    redirect("/login")
  }
  
  const token = await getToken({ template: 'supabase' })

  return (
    <div className="w-full p-6 md:p-8 max-w-full overflow-x-hidden">
      <HistoryClient userId={userId} clerkToken={token} />
    </div>
  )
}
