"use client"

import * as React from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"
import { BrandMark } from "@/components/support/BrandMark"

interface AuthLayoutProps {
  children: React.ReactNode
  backHref?: string
  backLabel?: string
  showTagline?: boolean
  showFooter?: boolean
}

export function AuthLayout({
  children,
  backHref = "/",
  backLabel = "Home",
  showTagline = true,
  showFooter = true,
}: AuthLayoutProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="min-h-screen w-full flex flex-col justify-between relative overflow-hidden bg-[var(--auth-bg)] text-[var(--text-primary)] font-sans antialiased select-none"
    >
      {/* ── Ambient Glow (Single Instance - Blur Budget 1 of 2) ── */}
      <div className="auth-glow" aria-hidden="true" />

      {/* ── Top Header Navigation (No Backdrop Blur) ── */}
      <header className="relative z-10 w-full max-w-[1240px] mx-auto px-6 py-6 sm:py-8 flex items-center justify-between">
        <BrandMark href="/" />

        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/45 hover:text-white/90 transition-all duration-200 group px-3 py-1.5 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] focus:outline-none focus:ring-1 focus:ring-[var(--auth-accent-start)]/50"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
            <span>{backLabel}</span>
          </Link>
        )}
      </header>

      {/* ── Centered Card Slot ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 w-full max-w-[1240px] mx-auto">
        <div className="w-full flex justify-center items-center">
          {children}
        </div>

        {/* Subtle Product Context Tagline */}
        {showTagline && (
          <div className="mt-8 text-center select-none pointer-events-none">
            <span className="text-[11px] font-mono tracking-[0.16em] uppercase text-white/25">
              Your prompts, upgraded.
            </span>
          </div>
        )}
      </main>

      {/* ── Discreet System Footer (No Backdrop Blur) ── */}
      {showFooter && (
        <footer className="relative z-10 w-full max-w-[1240px] mx-auto px-6 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-white/30 font-mono">
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
    </motion.div>
  )
}
