"use client"

import * as React from "react"

interface SupportCardProps {
  children: React.ReactNode
  className?: string
  size?: "sm" | "md" | "lg"
}

export function SupportCard({
  children,
  className = "",
  size = "md",
}: SupportCardProps) {
  const maxWidth =
    size === "sm"
      ? "max-w-[380px]"
      : size === "lg"
      ? "max-w-[540px]"
      : "max-w-[440px]"

  return (
    <div
      className={`w-full ${maxWidth} relative rounded-[24px] border border-white/[0.08] shadow-[0_32px_72px_-16px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.02)] overflow-hidden transition-all duration-300 ${className}`}
      style={{
        background: "linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%), #101012",
      }}
    >
      {/* ── Top-Left Specular Directional Metal Highlight ── */}
      <div
        className="absolute top-0 inset-x-0 h-[1px] pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 25%, rgba(255, 255, 255, 0.15) 60%, transparent 100%)"
        }}
      />

      {/* ── Left Edge Subtle Titanium Sheen ── */}
      <div
        className="absolute top-0 left-0 w-[1px] h-32 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, transparent 100%)"
        }}
      />

      {/* ── Subtle Ambient Inner Sheen ── */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-56 h-36 rounded-full pointer-events-none opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)"
        }}
      />

      <div className="relative z-10 p-7 sm:p-9">
        {children}
      </div>
    </div>
  )
}
