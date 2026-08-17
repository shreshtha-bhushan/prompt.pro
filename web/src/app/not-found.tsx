"use client"

import * as React from "react"
import { SupportPageShell } from "@/components/support/SupportPageShell"
import { SupportCard } from "@/components/support/SupportCard"
import { SupportButton } from "@/components/support/SupportButton"

export default function NotFoundPage() {
  return (
    <SupportPageShell backHref="/dashboard" backLabel="Dashboard">
      <SupportCard size="md" className="text-center">
        <div className="flex flex-col items-center">
          {/* Metallic Oversized 404 Header with Titanium Reflection */}
          <div className="relative mb-3 select-none">
            <span
              className="text-[78px] sm:text-[92px] font-bold tracking-tighter leading-none block font-mono relative z-10"
              style={{
                background: "linear-gradient(180deg, #FFFFFF 0%, #E2E2E8 35%, #7A7A88 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              404
            </span>
            <div className="absolute -inset-4 bg-white/[0.05] blur-2xl rounded-full pointer-events-none" />
          </div>

          {/* Heading & Details */}
          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-white mb-2 font-sans">
            Page Not Found
          </h1>
          <p className="text-[14px] text-white/45 leading-relaxed max-w-sm mb-8 font-sans">
            The page or resource you are looking for may have moved, expired, or never existed in your PromptPro workspace.
          </p>

          {/* Actions Row */}
          <div className="w-full flex flex-col sm:flex-row gap-3">
            <SupportButton href="/dashboard" variant="primary" className="flex-1">
              Go to Dashboard
            </SupportButton>
            <SupportButton
              onClick={() => {
                if (typeof window !== "undefined") window.history.back()
              }}
              variant="secondary"
              className="flex-1"
            >
              Go Back
            </SupportButton>
          </div>
        </div>
      </SupportCard>
    </SupportPageShell>
  )
}
