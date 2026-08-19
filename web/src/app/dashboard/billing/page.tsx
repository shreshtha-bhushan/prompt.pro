import type { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getEntitlement } from "@/lib/entitlement"
import { BillingClient } from "./billing-client"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Billing & Subscription | PromptPro",
  description:
    "Manage your PromptPro membership tier, monthly credit allowances, and active Whop subscriptions.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function BillingPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/login")
  }

  const entitlement = await getEntitlement()

  return (
    <div className="flex-1 p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <BillingClient entitlement={entitlement} />
    </div>
  )
}
