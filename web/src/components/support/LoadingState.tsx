"use client"

import * as React from "react"
import { PromptSparkleIcon } from "@/components/shared/PromptSparkleIcon"

interface LoadingStateProps {
  title?: string
  description?: string
  className?: string
  fullScreen?: boolean
}

export function LoadingState({
  title = "Preparing PromptPro",
  description = "Securing your session...",
  className = "",
  fullScreen = false,
}: LoadingStateProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center text-center p-8 select-none ${className}`}>
      {/* Liquid Titanium Sparkle Animation */}
      <div className="relative mb-6">
        {/* Soft Ambient Radial Sheen */}
        <div className="absolute -inset-6 rounded-full bg-white/[0.04] blur-2xl pointer-events-none" />

        {/* Machined Metal Container with Light Sweep */}
        <div className="relative w-16 h-16 rounded-[20px] bg-white/[0.04] border border-white/[0.1] flex items-center justify-center shadow-[0_12px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] overflow-hidden">
          <PromptSparkleIcon
            size={30}
            className="text-white/95 transition-transform duration-500 hover:scale-110"
          />

          {/* Diagonal Metallic Sheen Sweep */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none motion-safe:animate-[pulse_3s_ease-in-out_infinite]"
            style={{
              background: "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)"
            }}
          />
        </div>
      </div>

      {/* Title & Description */}
      <h2 className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-white mb-1.5 font-sans">
        {title}
      </h2>
      {description && (
        <p className="text-[13.5px] sm:text-[14px] text-white/45 max-w-xs leading-relaxed font-sans">
          {description}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#060607]">
        {content}
      </div>
    )
  }

  return content
}
