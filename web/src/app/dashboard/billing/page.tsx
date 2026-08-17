import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getEntitlement } from "@/lib/entitlement"
import { BillingClient } from "./billing-client"

export const dynamic = "force-dynamic"

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
