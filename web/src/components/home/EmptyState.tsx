"use client"

import * as React from "react"
import { ArrowRight, Laptop, CheckCircle2 } from "lucide-react"
import { PromptProIcon } from "@/components/shared/PromptProIcon"

export function EmptyState() {
  return (
    <div className="w-full">
      {/* Apple-grade Calm Empty Workspace Banner */}
      <div className="card w-full p-10 md:p-14 border border-white/[0.06] bg-[#1A1A1C] relative overflow-hidden mb-8">
        {/* Soft Ambient Top Glow */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[260px] rounded-full pointer-events-none opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)"
          }}
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left / Main message */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] font-mono text-white/70">
              <span className="w-2 h-2 rounded-full bg-[--score-positive]" />
              <span>MAC &amp; WINDOWS DESKTOP READY</span>
            </div>

            <h2 className="text-[36px] font-semibold tracking-tight text-white leading-[1.15]">
              Your workspace is ready.
            </h2>

            <p className="text-[15px] text-white/60 leading-[1.65] max-w-[440px]">
              PromptPro integrates directly into your daily AI workflow inside ChatGPT, Claude, Gemini, and Perplexity.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                href="https://promptpro-beta.vercel.app#install"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-[42px] px-6 rounded-xl bg-white text-[#111111] text-[13px] font-semibold transition-all hover:bg-white/90 shadow-[0_4px_20px_rgba(255,255,255,0.2)]"
              >
                <PromptProIcon size={16} variant="transparent" className="text-[#111111]" />
                <span>Install PromptPro Extension</span>
              </a>

              <a
                href="/dashboard/optimization"
                className="inline-flex items-center gap-1.5 h-[42px] px-5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/80 text-[13px] font-medium transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <span>Try Studio Sandbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right illustration / Floating macOS Browser Window */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.6)] relative">
              {/* macOS Window Controls Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                </div>
                <div className="text-[11px] font-mono text-white/40">chatgpt.com / claude.ai</div>
                <div className="w-8" />
              </div>

              {/* Mock AI Conversation Prompt Box */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center justify-between text-[11px] text-white/40 mb-1.5">
                    <span>Draft Prompt</span>
                    <span className="font-mono text-[--score-positive]">+31 pts lift</span>
                  </div>
                  <p className="text-[13px] text-white/80 font-mono">
                    Analyze our Q3 churn metrics and suggest 3 high-leverage retention initiatives...
                  </p>
                </div>

                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-[12px] text-white/50">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[--score-positive]" />
                    <span>Real-time score optimization active</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-white/70">
                    ⌘ + Enter
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
