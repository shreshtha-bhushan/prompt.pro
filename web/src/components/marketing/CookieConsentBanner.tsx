"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ShieldCheck, Cookie } from "lucide-react"
import { optInCapturing, optOutCapturing } from "@/lib/posthog"

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const consent = localStorage.getItem("promptpro_cookie_consent")
      if (!consent) {
        // Small delay for smooth entry
        const timer = setTimeout(() => setVisible(true), 800)
        return () => clearTimeout(timer)
      } else if (consent === "declined") {
        optOutCapturing()
      } else if (consent === "accepted") {
        optInCapturing()
      }
    }
  }, [])

  const handleAccept = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("promptpro_cookie_consent", "accepted")
    }
    optInCapturing()
    setVisible(false)
  }

  const handleDecline = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("promptpro_cookie_consent", "declined")
    }
    optOutCapturing()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-[440px] z-50 animate-fade-up"
    >
      <div className="p-5 rounded-2xl bg-[#151515] border border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.7)] space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 text-white/80">
            <Cookie size={16} />
          </div>
          <div className="space-y-1">
            <h4 className="text-[13.5px] font-semibold text-white font-sans">
              Privacy &amp; Telemetry
            </h4>
            <p className="text-[12.5px] text-white/60 leading-relaxed font-sans">
              We use telemetry (via PostHog) to improve PromptPro. Your prompts are never tracked or used for model training. See our{" "}
              <Link
                href="/privacy"
                className="text-white hover:underline underline-offset-4 font-medium"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 h-[34px] rounded-xl bg-white text-[#111111] text-[12px] font-semibold hover:bg-white/90 transition-all font-sans"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={handleDecline}
            className="flex-1 h-[34px] rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.1] text-[12px] font-medium transition-all font-sans"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
