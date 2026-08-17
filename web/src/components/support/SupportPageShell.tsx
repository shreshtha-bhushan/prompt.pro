"use client"

import * as React from "react"
import Link from "next/link"
import { BrandMark } from "./BrandMark"
import { LiquidTitaniumBackground } from "./LiquidTitaniumBackground"

interface SupportPageShellProps {
  children: React.ReactNode
  showHeaderBrand?: boolean
  showFooter?: boolean
  showTagline?: boolean
  backHref?: string
  backLabel?: string
  className?: string
}

export function SupportPageShell({
  children,
  showHeaderBrand = true,
  showFooter = true,
  showTagline = true,
  backHref,
  backLabel,
  className = "",
}: SupportPageShellProps) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between relative overflow-hidden bg-[#050505] text-[#F5F5F7] font-sans antialiased select-none selection:bg-white/20 selection:text-white">
      {/* ── Liquid Titanium Environment ── */}
      <LiquidTitaniumBackground />

      {/* ── Top Header Navigation ── */}
      <header className="relative z-20 w-full max-w-[1240px] mx-auto px-6 py-6 sm:py-8 flex items-center justify-between">
        {showHeaderBrand ? (
          <BrandMark />
        ) : (
          <div className="w-8" />
        )}

        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/45 hover:text-white/95 transition-all duration-200 group px-3 py-1.5 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06]"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
            <span>{backLabel || "Home"}</span>
          </Link>
        )}
      </header>

      {/* ── Focused Content Center with Ambient Card Alignment ── */}
      <main className={`relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-10 w-full max-w-[1240px] mx-auto animate-fade-up ${className}`}>
        {children}

        {/* Subtle Product Context Tagline */}
        {showTagline && (
          <div className="mt-8 text-center select-none pointer-events-none">
            <span className="text-[11.5px] font-mono tracking-[0.14em] uppercase text-white/25">
              Your prompts, upgraded.
            </span>
          </div>
        )}
      </main>

      {/* ── Discreet System Footer ── */}
      {showFooter && (
        <footer className="relative z-20 w-full max-w-[1240px] mx-auto px-6 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-white/30 font-mono">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} PromptPro</span>
            <span className="text-white/20">·</span>
            <span>All systems operational</span>
          </div>

          <nav className="flex items-center gap-5">
            <Link href="/about" className="hover:text-white/70 transition-colors duration-150">
              About
            </Link>
            <Link href="/privacy" className="hover:text-white/70 transition-colors duration-150">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white/70 transition-colors duration-150">
              Terms
            </Link>
            <a
              href="https://discord.gg/promptpro"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/70 transition-colors duration-150"
            >
              Discord
            </a>
          </nav>
        </footer>
      )}
    </div>
  )
}

