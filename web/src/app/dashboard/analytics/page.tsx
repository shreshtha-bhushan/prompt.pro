import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import * as React from "react"
import { AnalyticsDashboard } from "./analytics-dashboard"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="flex-1 pt-6 px-8 pb-14 max-w-[1440px] mx-auto">
      <AnalyticsDashboard />
    </div>
  )
}
