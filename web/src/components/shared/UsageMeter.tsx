"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { RefreshCw } from "lucide-react"

export interface UsageMeterProps {
  balance?: number
  allotment?: number
  resetAt?: string | null
  tier?: string
  isAdmin?: boolean
  planStatus?: string
  onRefresh?: () => Promise<void> | void
  showUpgradeLink?: boolean
  compact?: boolean
  className?: string
}

/**
 * Format a reset countdown from a target ISO date string.
 * e.g., "resets in 4d 9h", "resets in 18h", "resets in 45m"
 */
export function formatResetCountdown(resetAt?: string | null): string {
  if (!resetAt) return "in 30d"
  const target = new Date(resetAt).getTime()
  const now = Date.now()
  const diffMs = target - now

  if (diffMs <= 0) return "soon"

  const diffMin = Math.floor(diffMs / (1000 * 60))
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffDay > 0) {
    const remainHours = diffHour % 24
    return remainHours > 0 ? `in ${diffDay}d ${remainHours}h` : `in ${diffDay}d`
  }

  if (diffHour > 0) {
    const remainMin = diffMin % 60
    return remainMin > 0 ? `in ${diffHour}h ${remainMin}m` : `in ${diffHour}h`
  }

  return `in ${Math.max(1, diffMin)}m`
}

export function UsageMeter({
  balance = 50,
  allotment = 50,
  resetAt,
  tier = "free",
  isAdmin = false,
  planStatus = "none",
  onRefresh,
  showUpgradeLink = true,
  compact = false,
  className = "",
}: UsageMeterProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [currentBalance, setCurrentBalance] = useState(balance)
  const [currentAllotment, setCurrentAllotment] = useState(allotment)
  const [currentResetAt, setCurrentResetAt] = useState(resetAt)

  React.useEffect(() => {
    setCurrentBalance(balance)
    setCurrentAllotment(allotment)
    setCurrentResetAt(resetAt)
  }, [balance, allotment, resetAt])

  const handleRefreshClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (isSpinning) return

      setIsSpinning(true)
      try {
        if (onRefresh) {
          await onRefresh()
        } else {
          // Default: call /api/entitlement
          const res = await fetch("/api/entitlement")
          if (res.ok) {
            const data = await res.json()
            if (data.creditsBalance !== undefined) setCurrentBalance(data.creditsBalance)
            if (data.monthlyCredits !== undefined) setCurrentAllotment(data.monthlyCredits)
            if (data.creditsResetAt) setCurrentResetAt(data.creditsResetAt)
          }
        }
      } catch (err) {
        console.warn("[UsageMeter] Refresh failed:", err)
      } finally {
        setTimeout(() => setIsSpinning(false), 500)
      }
    },
    [isSpinning, onRefresh]
  )

  const isFree = tier === "free" && !isAdmin
  const isPastDue = planStatus === "past_due"
  const ratio = currentAllotment > 0 ? currentBalance / currentAllotment : 0
  const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)))

  // States:
  // Normal: >20% remaining
  // Warning: <= 20% remaining
  // Exhausted: 0 credits remaining
  const isExhausted = currentBalance <= 0 && !isAdmin
  const isLow = !isExhausted && ratio <= 0.20 && !isAdmin

  const countdownStr = formatResetCountdown(currentResetAt)

  // Color tokens:
  // Normal: neutral silver
  // Low or Exhausted: amber (#f59e0b)
  const fillColor = isLow || isExhausted
    ? "var(--meter-fill-low, #f59e0b)"
    : "var(--meter-fill, #e5e5ea)"

  // Admin view: Unlimited (admin) with full-width silver bar
  if (isAdmin) {
    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/50 font-mono">Optimization compute</span>
          <span className="font-mono text-white/90 font-medium">Unlimited (admin)</span>
        </div>
        <div
          className="relative h-[4px] rounded-full overflow-hidden"
          style={{ background: "var(--meter-track, rgba(255, 255, 255, 0.08))" }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full w-full"
            style={{ background: "var(--meter-fill, #e5e5ea)" }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Past due quiet banner */}
      {isPastDue && (
        <div className="px-2.5 py-1.5 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[11px] text-[#f59e0b] leading-tight mb-1">
          Your last payment didn't go through — update billing to keep your plan.
        </div>
      )}

      {/* Progress track (4px height, full radius) */}
      <div
        className="relative h-[4px] rounded-full overflow-hidden w-full"
        style={{ background: "var(--meter-track, rgba(255, 255, 255, 0.08))" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            width: `${pct}%`,
            background: fillColor,
          }}
        />
      </div>

      {/* Label and countdown row */}
      <div className="flex items-center justify-between text-[11px] text-white/60 min-h-[18px]">
        {isExhausted ? (
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[#f59e0b] font-medium">
              0 / {currentAllotment.toLocaleString()} credits · resets {countdownStr}
            </span>
            {showUpgradeLink && (
              <a
                href="/upgrade"
                className="text-white/90 hover:text-white transition-colors underline underline-offset-2 ml-1 font-medium"
              >
                Upgrade plan →
              </a>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 truncate">
            <span className="font-mono text-white/85 tabular-nums font-medium">
              {currentBalance.toLocaleString()} / {currentAllotment.toLocaleString()}
            </span>
            <span className="text-white/40">credits · resets {countdownStr}</span>
            {isLow && (
              <span className="text-[#f59e0b] font-medium ml-0.5">· running low</span>
            )}
          </div>
        )}

        {/* 16px Refresh Icon */}
        <button
          type="button"
          onClick={handleRefreshClick}
          title="Refresh credit balance"
          aria-label="Refresh credit balance"
          className="w-4 h-4 text-white/40 hover:text-white transition-colors flex items-center justify-center shrink-0 ml-1.5 focus:outline-none"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              isSpinning ? "animate-spin-once" : ""
            } transition-transform`}
            style={{
              animation: isSpinning ? "spinOnce 500ms cubic-bezier(0.4, 0, 0.2, 1) forwards" : undefined,
            }}
          />
        </button>
      </div>

      <style jsx global>{`
        @keyframes spinOnce {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .transition-\\[width\\] {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  )
}
