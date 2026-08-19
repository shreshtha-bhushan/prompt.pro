"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { PromptSparkleIcon } from "@/components/shared/PromptSparkleIcon"
import { X, ArrowRight } from "lucide-react"

export function StickyMobileCTA() {
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    // Check session storage
    if (typeof window !== "undefined") {
      const isDismissed = sessionStorage.getItem("promptpro_mobile_cta_dismissed") === "true"
      setDismissed(isDismissed)
    }
  }, [])

  // Only render on public marketing routes (e.g. /, /about, /demo, /upgrade)
  // Hide on dashboard, admin, legal pages, auth pages
  const isExcludedRoute =
    !pathname ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/signout") ||
    pathname.startsWith("/unauthorized") ||
    pathname.startsWith("/extension-linked") ||
    pathname.startsWith("/api")

  if (dismissed || isExcludedRoute) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("promptpro_mobile_cta_dismissed", "true")
    }
  }

  return (
    <aside
      aria-label="PromptPro Sign-up Offer"
      className="fixed bottom-0 inset-x-0 z-40 sm:hidden p-3 bg-[#151515] border-t border-white/[0.1] shadow-[0_-8px_32px_rgba(0,0,0,0.6)] animate-fade-up"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0 text-white">
            <PromptSparkleIcon size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-white truncate font-sans">
              PromptPro Studio
            </p>
            <p className="text-[11px] text-white/50 truncate font-mono">
              50 free monthly credits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-xl bg-white text-[#111111] text-[12px] font-semibold hover:bg-white/90 transition-all font-sans"
          >
            <span>Start Free</span>
            <ArrowRight size={12} />
          </Link>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="w-[30px] h-[30px] rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white flex items-center justify-center transition-all"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
