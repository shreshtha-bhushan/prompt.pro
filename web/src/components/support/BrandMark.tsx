"use client"

import * as React from "react"
import Link from "next/link"
import { PromptSparkleIcon } from "@/components/shared/PromptSparkleIcon"

interface BrandMarkProps {
  href?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
}

export function BrandMark({
  href = "/",
  size = "md",
  showText = true,
  className = "",
}: BrandMarkProps) {
  const iconSize = size === "sm" ? 18 : size === "lg" ? 28 : 22
  const textSize = size === "sm" ? "text-[14px]" : size === "lg" ? "text-[18px]" : "text-[15px]"

  const content = (
    <div className={`inline-flex items-center gap-2.5 group cursor-pointer select-none ${className}`}>
      {/* Machined Metal Sparkle Container */}
      <div className="relative flex items-center justify-center">
        <div className="w-[34px] h-[34px] rounded-xl bg-white/[0.04] border border-white/[0.09] flex items-center justify-center transition-all duration-300 group-hover:bg-white/[0.08] group-hover:border-white/[0.18] group-hover:scale-105 shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]">
          <PromptSparkleIcon
            size={iconSize}
            className="text-white/90 transition-all duration-300 group-hover:text-white group-hover:rotate-6"
          />
        </div>
        {/* Subtle Ambient Sheen */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {showText && (
        <span className={`font-semibold tracking-tight text-white/90 group-hover:text-white transition-colors duration-200 ${textSize}`}>
          PromptPro
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded-xl">
        {content}
      </Link>
    )
  }

  return content
}
