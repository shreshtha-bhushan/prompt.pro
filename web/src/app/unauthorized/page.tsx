"use client"

import * as React from "react"
import { SupportPageShell } from "@/components/support/SupportPageShell"
import { SupportCard } from "@/components/support/SupportCard"
import { StatusIcon } from "@/components/support/StatusIcon"
import { SupportButton } from "@/components/support/SupportButton"

export default function UnauthorizedPage() {
  return (
    <SupportPageShell backHref="/login" backLabel="Sign in">
      <SupportCard size="md" className="text-center">
        <div className="flex flex-col items-center">
          <StatusIcon type="lock" size="lg" className="mb-6" />

          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-white mb-2 font-sans">
            Access Restricted
          </h1>
          <p className="text-[14px] text-white/50 leading-relaxed max-w-sm mb-8 font-sans">
            You need to be signed in with an authorized account to access this PromptPro workspace resource.
          </p>

          <div className="w-full flex flex-col sm:flex-row gap-3">
            <SupportButton href="/login" variant="primary" className="flex-1">
              Sign In
            </SupportButton>
            <SupportButton href="/dashboard" variant="secondary" className="flex-1">
              Go to Dashboard
            </SupportButton>
          </div>
        </div>
      </SupportCard>
    </SupportPageShell>
  )
}
