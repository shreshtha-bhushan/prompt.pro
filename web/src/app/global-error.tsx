"use client"

import * as React from "react"
import { SupportPageShell } from "@/components/support/SupportPageShell"
import { SupportCard } from "@/components/support/SupportCard"
import { StatusIcon } from "@/components/support/StatusIcon"
import { SupportButton } from "@/components/support/SupportButton"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error("PromptPro Critical Global Error:", error)
  }, [error])

  return (
    <html lang="en" className="dark">
      <body className="bg-[#060607] text-[#F5F5F7] antialiased m-0 p-0">
        <SupportPageShell showHeaderBrand={true} showFooter={false}>
          <SupportCard size="md" className="text-center">
            <div className="flex flex-col items-center">
              <StatusIcon type="error" size="lg" className="mb-6" />

              <h1 className="text-[22px] font-semibold tracking-tight text-white mb-2 font-sans">
                Application Error
              </h1>
              <p className="text-[14px] text-white/50 leading-relaxed max-w-sm mb-6 font-sans">
                An unexpected system fault occurred while initializing the application.
              </p>

              {error.digest && (
                <div className="mb-6 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-white/40">
                  Digest: {error.digest}
                </div>
              )}

              <SupportButton
                onClick={() => {
                  if (typeof window !== "undefined") window.location.reload()
                }}
                variant="primary"
                fullWidth
              >
                Reload PromptPro
              </SupportButton>
            </div>
          </SupportCard>
        </SupportPageShell>
      </body>
    </html>
  )
}
