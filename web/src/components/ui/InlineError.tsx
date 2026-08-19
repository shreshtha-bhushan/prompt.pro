import * as React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"

interface InlineErrorProps {
  title?: string
  message: string
  errorCode?: string
  onRetry?: () => void
  isRetrying?: boolean
  className?: string
}

export function InlineError({
  title = "Unable to load data",
  message,
  errorCode,
  onRetry,
  isRetrying = false,
  className = "",
}: InlineErrorProps) {
  return (
    <div
      className={`p-6 rounded-2xl border border-white/[0.08] bg-[#1A1A1C] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-white/70">
          <AlertCircle className="w-4 h-4 text-white/80" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-[14px] font-semibold text-white font-sans">{title}</h4>
            {errorCode && (
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-white/40 text-[10px] font-mono uppercase tracking-wider">
                {errorCode}
              </span>
            )}
          </div>
          <p className="text-[13px] text-white/50 leading-relaxed font-sans">{message}</p>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center justify-center gap-2 h-[34px] px-4 rounded-xl bg-white text-[#111111] text-[12px] font-semibold hover:bg-white/90 transition-all shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
          <span>{isRetrying ? "Retrying..." : "Retry"}</span>
        </button>
      )}
    </div>
  )
}
