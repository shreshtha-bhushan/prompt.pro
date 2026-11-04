"use client"

import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.08)_100%)] border border-white/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)] text-white shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        ),
        info: (
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.20)_0%,rgba(255,255,255,0.08)_100%)] border border-white/28 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)] text-white shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
        ),
        warning: (
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[linear-gradient(180deg,rgba(245,166,35,0.22)_0%,rgba(217,119,6,0.08)_100%)] border border-amber-400/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)] text-amber-300 shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        ),
        error: (
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[linear-gradient(180deg,rgba(248,113,113,0.22)_0%,rgba(239,68,68,0.08)_100%)] border border-red-400/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)] text-red-300 shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        ),
        loading: (
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.20)_0%,rgba(255,255,255,0.08)_100%)] border border-white/28 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)] text-white shrink-0">
            <LoaderCircle className="w-3 h-3 animate-spin text-white" />
          </div>
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans !rounded-full !px-4 !py-2.5 !gap-2.5 !min-h-[44px] !bg-[linear-gradient(180deg,rgba(38,38,42,0.88)_0%,rgba(20,20,24,0.92)_100%)] !border !border-white/18 !text-white !shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.22),inset_0_-1px_1px_rgba(0,0,0,0.4)] backdrop-blur-xl saturate-150 text-[13px] font-medium tracking-tight",
          title: "!text-[13px] !font-medium !text-white tracking-tight",
          description: "!text-[12px] !text-white/70 font-normal",
          actionButton:
            "!rounded-full !bg-white/10 hover:!bg-white/20 !border !border-white/20 !text-white !text-xs !font-medium !px-3 !py-1 transition-colors",
          cancelButton:
            "!rounded-full !bg-white/5 hover:!bg-white/10 !border !border-white/10 !text-white/70 !text-xs !font-medium !px-3 !py-1 transition-colors",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
