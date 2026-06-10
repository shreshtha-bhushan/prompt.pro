import * as React from "react"
import { Sparkles } from "lucide-react"

export function EmptyState() {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="card p-16 px-12 text-center max-w-[520px] mx-auto w-full mb-12">
        <Sparkles className="w-8 h-8 text-[--text-tertiary] mx-auto mb-6" />
        <h2 className="text-[22px] font-light text-[--text-primary] tracking-[-0.02em] mb-4">
          Your first upgrade is one click away
        </h2>
        <p className="text-[14px] text-[--text-secondary] leading-[1.7] mb-8 max-w-[320px] mx-auto">
          Install the PromptPro extension, open ChatGPT or Claude, type any prompt, and click ✦ Upgrade.
        </p>
        <div className="flex items-center justify-center">
          <a 
            href="#" 
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.4)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.6)]"
          >
            <span className="relative z-10 flex items-center gap-2">
              Install Extension
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </a>
        </div>
      </div>

      {/* Skeleton Stat Cards */}
      <div className="grid grid-cols-4 gap-3 w-full">
        <div className="card px-[22px] py-[20px] min-h-[110px] skeleton" />
        <div className="card px-[22px] py-[20px] min-h-[110px] skeleton" />
        <div className="card px-[22px] py-[20px] min-h-[140px] skeleton" />
        <div className="card px-[22px] py-[20px] min-h-[140px] skeleton" />
      </div>
    </div>
  )
}
