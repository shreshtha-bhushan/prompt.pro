"use client"

import * as React from "react"
import { SupportPageShell } from "@/components/support/SupportPageShell"
import { SupportCard } from "@/components/support/SupportCard"
import { StatusIcon } from "@/components/support/StatusIcon"
import { SupportButton } from "@/components/support/SupportButton"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    // Log client error to monitoring if configured
    console.error("PromptPro Route Error:", error)
  }, [error])

  return (
    <SupportPageShell backHref="/dashboard" backLabel="Dashboard">
      <SupportCard size="md" className="text-center">
        <div className="flex flex-col items-center">
          {/* Restrained Error Status Icon */}
          <StatusIcon type="error" size="lg" className="mb-6" />

          {/* Heading & Details */}
          <h1 className="text-[21px] sm:text-[23px] font-semibold tracking-tight text-white mb-2 font-sans">
            Something Went Wrong
          </h1>
          <p className="text-[14px] text-white/50 leading-relaxed max-w-sm mb-6 font-sans">
            PromptPro couldn’t complete that operation. Please try refreshing or return to your workspace.
          </p>

          {/* Optional Error Digest Badge (if provided) */}
          {error.digest && (
            <div className="mb-6 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-white/40">
              Error ID: {error.digest}
            </div>
          )}

          {/* Actions Row */}
          <div className="w-full flex flex-col sm:flex-row gap-3">
            <SupportButton onClick={() => reset()} variant="primary" className="flex-1">
              Try Again
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
