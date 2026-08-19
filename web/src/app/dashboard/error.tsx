"use client"

import * as React from "react"
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react"
import Link from "next/link"

interface DashboardErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  React.useEffect(() => {
    console.error("[Dashboard Route Error]:", error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
      <div className="card max-w-lg w-full p-8 border border-white/[0.08] bg-[#1A1A1C] text-center rounded-[24px] shadow-2xl space-y-6 animate-fade-up">
        {/* Monotone Alert Icon */}
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-white/70">
          <AlertTriangle className="w-6 h-6" />
        </div>

        {/* Heading & Details */}
        <div className="space-y-2">
          <h2 className="text-[20px] font-semibold text-white tracking-tight">
            Workspace Error
          </h2>
          <p className="text-[13.5px] text-white/50 leading-relaxed max-w-sm mx-auto">
            We couldn&apos;t load this section of your workspace. Your prompt history, credits, and saved snippets remain safe.
          </p>
        </div>

        {/* Optional Error Digest Badge */}
        {error.digest && (
          <div className="inline-block px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-white/40">
            Digest: {error.digest}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 h-[38px] px-5 rounded-xl bg-white text-[#111111] text-[13px] font-semibold hover:bg-white/90 transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 h-[38px] px-5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/80 hover:text-white hover:bg-white/[0.1] text-[13px] font-medium transition-all"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard Overview</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
