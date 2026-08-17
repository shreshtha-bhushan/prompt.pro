"use client"

import * as React from "react"
import Link from "next/link"

interface SupportButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md" | "lg"
  isLoading?: boolean
  loadingText?: string
  href?: string
  icon?: React.ReactNode
  fullWidth?: boolean
}

export function SupportButton({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingText,
  href,
  icon,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: SupportButtonProps) {
  const sizeStyles =
    size === "sm"
      ? "h-[36px] px-3.5 text-[13px] rounded-xl"
      : size === "lg"
      ? "h-[46px] px-6 text-[15px] rounded-[14px]"
      : "h-[42px] px-5 text-[14px] rounded-xl"

  const variantStyles = {
    primary:
      "bg-gradient-to-b from-[#F5F5F7] to-[#E2E2E5] text-[#0A0A0C] font-semibold hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.985] shadow-[0_2px_10px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,1)] border border-white/30",
    secondary:
      "bg-white/[0.04] text-[#F5F5F7] font-medium hover:bg-white/[0.08] hover:border-white/[0.16] hover:-translate-y-0.5 active:scale-[0.985] border border-white/[0.08] shadow-sm",
    danger:
      "bg-rose-500/15 text-rose-400 font-medium hover:bg-rose-500/25 hover:border-rose-500/30 active:scale-[0.985] border border-rose-500/20 shadow-sm",
    ghost:
      "bg-transparent text-white/50 font-medium hover:text-white hover:bg-white/[0.04] active:scale-[0.985] border border-transparent",
  }[variant]

  const baseStyles = `inline-flex items-center justify-center gap-2 tracking-tight transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 ${
    fullWidth ? "w-full" : ""
  } ${sizeStyles} ${variantStyles} ${className}`

  const innerContent = (
    <>
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin -ml-0.5 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{loadingText || "Please wait..."}</span>
        </span>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={baseStyles}>
        {innerContent}
      </Link>
    )
  }

  return (
    <button
      disabled={disabled || isLoading}
      className={baseStyles}
      {...props}
    >
      {innerContent}
    </button>
  )
}
