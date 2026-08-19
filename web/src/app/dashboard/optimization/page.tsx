import type { Metadata } from "next"
import { OptimizationClient } from "./optimization-client"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Prompt Optimizer | PromptPro",
  description:
    "Interactive prompt optimization workspace with multi-strategy decomposition, chain-of-thought, and token minimization.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function OptimizationPage() {
  const { userId, getToken } = await auth()

  if (!userId) {
    redirect("/login")
  }

  const token = await getToken({ template: 'supabase' })

  return (
    <div className="flex flex-1 flex-col h-full min-h-0">
      <OptimizationClient userId={userId} clerkToken={token} />
    </div>
  )
}
