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
        <div className="flex items-center justify-center gap-4">
          <a href="#" className="border border-white/[0.12] bg-white/[0.06] text-[--text-primary] text-[13px] px-5 py-2.5 rounded-lg hover:bg-white/[0.10] transition-colors">
            Install Extension
          </a>
          <a href="#" className="text-[--text-secondary] text-[13px] px-5 py-2.5 rounded-lg hover:text-[--text-primary] transition-colors">
            Watch Demo
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
