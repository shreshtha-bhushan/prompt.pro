"use client"

import * as React from "react"
import { SupportPageShell } from "@/components/support/SupportPageShell"
import { SupportCard } from "@/components/support/SupportCard"
import { StatusIcon } from "@/components/support/StatusIcon"
import { SupportButton } from "@/components/support/SupportButton"
import { PromptSparkleIcon } from "@/components/shared/PromptSparkleIcon"

/**
 * Extension Linked — Success Page
 *
 * Shown briefly after the extension auth bridge redirects here with ?token=xxx.
 * The service worker detects this URL and auto-closes the tab within ~1.5s.
 * If the tab isn't closed (e.g. extension not loaded), the user sees this page.
 */
export default function ExtensionLinkedPage() {
  return (
    <SupportPageShell showFooter={true}>
      <SupportCard size="md" className="text-center">
        <div className="flex flex-col items-center">
          {/* Status Icon with Subtle Glow */}
          <StatusIcon type="success" size="lg" className="mb-6" />

          {/* Heading & Details */}
          <h1 className="text-[24px] sm:text-[26px] font-semibold tracking-tight text-white mb-2 font-sans">
            Extension Linked
          </h1>
          <p className="text-[14px] text-white/50 leading-relaxed max-w-sm mb-6 font-sans">
            Your PromptPro extension is now authenticated and synchronized with your account. This tab will close automatically.
          </p>

          {/* System Metadata Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono font-medium text-white/80">Cloud Sync Active</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <PromptSparkleIcon size={12} className="text-white/60" />
              <span className="text-[11px] font-mono font-medium text-white/80">Telemetry Connected</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="w-full flex flex-col gap-2.5">
            <SupportButton href="/dashboard" variant="primary" fullWidth>
              Open Dashboard
            </SupportButton>
            <SupportButton
              onClick={() => {
                if (typeof window !== "undefined") window.close()
              }}
              variant="ghost"
              fullWidth
            >
              Close Tab
            </SupportButton>
          </div>
        </div>
      </SupportCard>
    </SupportPageShell>
  )
}

