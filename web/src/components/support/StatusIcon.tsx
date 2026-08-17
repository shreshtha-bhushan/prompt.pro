"use client"

import * as React from "react"
import { Check, AlertCircle, AlertTriangle, WifiOff, Lock, HelpCircle, ShieldCheck } from "lucide-react"

type StatusType = "success" | "error" | "warning" | "offline" | "lock" | "info" | "shield"

interface StatusIconProps {
  type: StatusType
  size?: "sm" | "md" | "lg"
  className?: string
}

export function StatusIcon({
  type,
  size = "md",
  className = "",
}: StatusIconProps) {
  const containerSize =
    size === "sm"
      ? "w-10 h-10 rounded-xl"
      : size === "lg"
      ? "w-16 h-16 rounded-[22px]"
      : "w-12 h-12 rounded-2xl"

  const iconSize = size === "sm" ? 18 : size === "lg" ? 28 : 22

  const config = {
    success: {
      Icon: Check,
      color: "text-emerald-400",
      bg: "bg-emerald-500/[0.08]",
      border: "border-emerald-500/20",
      halo: "bg-emerald-500/[0.08]",
    },
    error: {
      Icon: AlertCircle,
      color: "text-rose-400",
      bg: "bg-rose-500/[0.08]",
      border: "border-rose-500/20",
      halo: "bg-rose-500/[0.08]",
    },
    warning: {
      Icon: AlertTriangle,
      color: "text-amber-400",
      bg: "bg-amber-500/[0.08]",
      border: "border-amber-500/20",
      halo: "bg-amber-500/[0.08]",
    },
    offline: {
      Icon: WifiOff,
      color: "text-zinc-400",
      bg: "bg-zinc-500/[0.08]",
      border: "border-zinc-500/20",
      halo: "bg-zinc-500/[0.05]",
    },
    lock: {
      Icon: Lock,
      color: "text-white/80",
      bg: "bg-white/[0.05]",
      border: "border-white/[0.12]",
      halo: "bg-white/[0.04]",
    },
    shield: {
      Icon: ShieldCheck,
      color: "text-white/90",
      bg: "bg-white/[0.06]",
      border: "border-white/[0.14]",
      halo: "bg-white/[0.05]",
    },
    info: {
      Icon: HelpCircle,
      color: "text-white/70",
      bg: "bg-white/[0.05]",
      border: "border-white/[0.1]",
      halo: "bg-white/[0.03]",
    },
  }[type]

  const { Icon, color, bg, border, halo } = config

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Ambient Halo Glow */}
      <div className={`absolute inset-0 ${containerSize} ${halo} blur-xl pointer-events-none`} />

      {/* Machined Metal Container */}
      <div
        className={`relative ${containerSize} ${bg} border ${border} flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105`}
      >
        <Icon size={iconSize} className={color} />
      </div>
    </div>
  )
}
