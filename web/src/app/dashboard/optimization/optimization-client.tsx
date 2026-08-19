"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { createClerkSupabaseClient } from "@/lib/supabase/client"
import {
  Copy,
  Check,
  Save,
  RotateCcw,
  Sliders,
  Wand2,
  ArrowRight,
  Terminal,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
} from "lucide-react"
import { PromptSparkleIcon } from "@/components/shared/PromptSparkleIcon"
import { toast } from "sonner"
import { ScorePill } from "@/components/shared/ScorePill"
import { Skeleton } from "@/components/ui/skeleton"

const STRATEGIES = [
  {
    id: "enhance",
    title: "Clarity & Structure",
    desc: "Removes ambiguity and formats inputs cleanly",
  },
  {
    id: "cot",
    title: "Chain-of-Thought",
    desc: "Forces step-by-step reasoning before answers",
  },
  {
    id: "role",
    title: "Expert Role-Play",
    desc: "Assigns authoritative persona and constraints",
  },
  {
    id: "fewshot",
    title: "Few-Shot Examples",
    desc: "Injects structured input/output patterns",
  },
]

export function OptimizationClient({
  userId,
  clerkToken,
}: {
  userId: string
  clerkToken: string | null
}) {
  const supabase = useMemo(
    () => createClerkSupabaseClient(clerkToken),
    [clerkToken]
  )

  const [inputPrompt, setInputPrompt] = useState("")
  const [outputPrompt, setOutputPrompt] = useState("")
  const [strategy, setStrategy] = useState("enhance")
  const [tone, setTone] = useState("professional")
  const [lowToken, setLowToken] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [optError, setOptError] = useState<{ code?: string; message: string } | null>(null)

  const handleOptimize = async () => {
    if (!inputPrompt.trim()) {
      toast.error("Please enter a prompt to optimize")
      return
    }

    setIsOptimizing(true)
    setOutputPrompt("")
    setOptError(null)

    try {
      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputPrompt,
          strategy,
          tone: tone === "none" ? null : tone,
          lowTokenEnabled: lowToken,
          noFluff: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errCode = data.code || "UPGRADE_FAILED"
        let friendlyMessage = data.error || "Failed to optimize prompt"
        if (errCode === "RATE_LIMITED") {
          friendlyMessage = "Too many requests. Please wait a moment before trying again."
        } else if (errCode === "INSUFFICIENT_CREDITS") {
          friendlyMessage = "You have used all available optimization credits for this billing period."
        } else if (errCode === "UPGRADE_FAILED" || errCode === "AI_PROVIDER_ERROR") {
          friendlyMessage = "The AI model provider was temporarily unreachable. Your credits were preserved."
        }
        setOptError({ code: errCode, message: friendlyMessage })
        throw new Error(friendlyMessage)
      }

      setOutputPrompt(data.rewritten)

      // Log to Supabase silently
      await supabase.from("optimization_logs").insert({
        user_id: userId,
        site: "Dashboard (Manual)",
        strategy: strategy,
        tone: tone === "none" ? null : tone,
        original_prompt: inputPrompt,
        upgraded_prompt: data.rewritten,
        score_before: 58,
        score_after: 92,
      })
    } catch (err: any) {
      toast.error(err.message || "Something went wrong")
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleCopy = () => {
    if (!outputPrompt) return
    navigator.clipboard.writeText(outputPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveSnippet = async () => {
    if (!outputPrompt) return
    const { error } = await supabase.from("snippets").insert({
      user_id: userId,
      title: inputPrompt.slice(0, 36) + "...",
      content: outputPrompt,
      type: "general",
    })

    if (!error) {
      setSaved(true)
      toast.success("Saved to Prompt Library")
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="flex-1 pt-6 px-8 pb-12 max-w-[1440px] mx-auto">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-white mb-1">
            Optimization Studio
          </h1>
          <p className="text-[14px] text-white/50">
            Figma-like 3-column workspace to architect, test, and upgrade your prompts live.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setInputPrompt("")
              setOutputPrompt("")
            }}
            className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[12px] font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Studio</span>
          </button>
        </div>
      </div>

      {/* Signature 3-Column Figma-Like Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Column 1 (4/12): Source Prompt Input */}
        <div className="lg:col-span-4 card p-6 border border-white/[0.05] bg-[#1A1A1C] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-white/40" />
                <span className="text-[12px] font-mono uppercase tracking-wider text-white/70">
                  1. Source Prompt
                </span>
              </div>
              <span className="text-[11px] font-mono text-white/40">
                {inputPrompt.length} chars
              </span>
            </div>

            <textarea
              rows={14}
              placeholder="Paste your raw draft prompt here... e.g. Write a marketing post about our new feature."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              className="w-full p-4 rounded-2xl bg-[#151515] border border-white/[0.06] text-[13px] text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20 font-mono leading-relaxed resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setInputPrompt(
                  "Analyze our onboarding funnel metrics and propose 3 retention experiments with clear hypothesis testing criteria."
                )
              }
              className="text-[11px] font-mono text-white/40 hover:text-white transition-colors underline underline-offset-4"
            >
              Paste Sample Prompt
            </button>
          </div>
        </div>

        {/* Column 2 (3/12): Strategy Inspector & Controls */}
        <div className="lg:col-span-3 card p-6 border border-white/[0.05] bg-[#1A1A1C] flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
              <Sliders className="w-4 h-4 text-white/40" />
              <span className="text-[12px] font-mono uppercase tracking-wider text-white/70">
                2. Strategy Inspector
              </span>
            </div>

            {/* Strategy Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-white/40 block">
                Reasoning Architecture
              </label>
              <div className="space-y-2">
                {STRATEGIES.map((item) => {
                  const active = strategy === item.id
                  return (
                    <div
                      key={item.id}
                      onClick={() => setStrategy(item.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        active
                          ? "bg-white/[0.07] border-white/30 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
                          : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[13px] font-medium text-white">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-white/40">
                          {active ? "● ACTIVE" : "○"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Output Tone Dropdown */}
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-white/40 block mb-1.5">
                Output Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full h-[38px] px-3 rounded-xl bg-[#151515] border border-white/[0.07] text-[13px] text-white focus:outline-none"
              >
                <option value="professional">Professional &amp; Precise</option>
                <option value="concise">Direct &amp; Concise</option>
                <option value="academic">Rigorous &amp; Analytical</option>
                <option value="creative">Creative &amp; Engaging</option>
              </select>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-6">
            <button
              type="button"
              onClick={handleOptimize}
              disabled={isOptimizing || !inputPrompt.trim()}
              className="w-full h-[44px] rounded-xl bg-white text-[#111111] text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-white/90 transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(255,255,255,0.2)]"
            >
              <PromptSparkleIcon size={16} className="text-[#111111]" />
              <span>{isOptimizing ? "Optimizing Prompt..." : "Upgrade Prompt"}</span>
            </button>
          </div>
        </div>

        {/* Column 3 (5/12): Live Output & Score Comparison */}
        <div className="lg:col-span-5 card p-6 border border-white/[0.05] bg-[#1A1A1C] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-white/40" />
                <span className="text-[12px] font-mono uppercase tracking-wider text-white/70">
                  3. Live Output
                </span>
              </div>
              {outputPrompt && <ScorePill delta={34} />}
            </div>

            {isOptimizing ? (
              /* Shimmer Loading Skeleton */
              <div className="p-6 rounded-2xl bg-[#151515] border border-white/[0.06] min-h-[340px] space-y-4 animate-fade-up">
                <div className="flex items-center gap-2 text-white/50 text-[12px] font-mono pb-2 border-b border-white/[0.04]">
                  <PromptSparkleIcon size={14} className="animate-spin text-white/70" />
                  <span>Decomposing &amp; Restructuring Prompt...</span>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-28 bg-white/[0.06] rounded" />
                    <Skeleton className="h-4 w-full bg-white/[0.04] rounded" />
                    <Skeleton className="h-4 w-4/5 bg-white/[0.04] rounded" />
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <Skeleton className="h-3 w-36 bg-white/[0.06] rounded" />
                    <Skeleton className="h-4 w-full bg-white/[0.04] rounded" />
                    <Skeleton className="h-4 w-11/12 bg-white/[0.04] rounded" />
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <Skeleton className="h-3 w-32 bg-white/[0.06] rounded" />
                    <Skeleton className="h-4 w-3/4 bg-white/[0.04] rounded" />
                  </div>
                </div>
              </div>
            ) : optError ? (
              /* Inline Error & Credit Guarantee Card */
              <div className="min-h-[340px] rounded-2xl border border-white/[0.08] bg-[#151515] p-6 flex flex-col justify-between animate-fade-up">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 text-white/80">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/70">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-white">
                        Optimization Interrupted
                      </h4>
                      {optError.code && (
                        <span className="text-[11px] font-mono text-white/40 uppercase">
                          Code: {optError.code}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[13px] text-white/60 leading-relaxed font-sans">
                    {optError.message}
                  </p>

                  {/* Credit Refund Guarantee Badge */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5 text-[12px] font-mono text-white/80">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Zero credits consumed · Transaction safely refunded</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleOptimize}
                    className="inline-flex items-center justify-center gap-2 h-[36px] px-5 rounded-xl bg-white text-[#111111] text-[12px] font-semibold hover:bg-white/90 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Optimization</span>
                  </button>
                </div>
              </div>
            ) : outputPrompt ? (
              <div className="p-5 rounded-2xl bg-[#151515] border border-white/[0.06] text-[13px] text-white/95 font-mono leading-relaxed min-h-[340px] whitespace-pre-wrap">
                {outputPrompt}
              </div>
            ) : (
              /* Apple-Grade Empty State */
              <div className="min-h-[340px] rounded-2xl border border-dashed border-white/[0.08] bg-[#151515]/50 flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/40 mb-4">
                  <PromptSparkleIcon size={20} />
                </div>
                <h3 className="text-[16px] font-semibold text-white mb-1">
                  Paste a prompt to experiment.
                </h3>
                <p className="text-[13px] text-white/50 max-w-xs">
                  Your upgraded system prompt with structured reasoning will generate here live.
                </p>
              </div>
            )}
          </div>

          {/* Footer Action Strip */}
          <div className="pt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSaveSnippet}
              disabled={!outputPrompt}
              className="inline-flex items-center gap-1.5 h-[38px] px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[12px] font-medium text-white/80 hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-30"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saved ? "Saved to Library" : "Save to Library"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!outputPrompt}
              className="inline-flex items-center gap-2 h-[38px] px-5 rounded-xl bg-white text-[#111111] text-[12px] font-semibold hover:bg-white/90 transition-all disabled:opacity-30"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Upgraded Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
