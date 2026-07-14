"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { createClerkSupabaseClient } from "@/lib/supabase/client"
import {
  Clock,
  Copy,
  Check,
  Trash2,
  Search,
  ArrowRight,
  ExternalLink,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { PromptSparkleIcon } from "@/components/shared/PromptSparkleIcon"
import { ScorePill } from "@/components/shared/ScorePill"
import { ModelIcon } from "@/components/shared/ModelIcon"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "just now"
  const d = new Date(dateStr)
  const now = new Date()
  const diffSec = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000))

  if (diffSec < 60) return "just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatSiteName(site: string) {
  if (!site) return "Unknown"
  const s = site.toLowerCase()
  if (s === "chatgpt") return "ChatGPT"
  if (s === "claude") return "Claude"
  if (s === "gemini") return "Gemini"
  if (s === "perplexity") return "Perplexity"
  if (s === "deepseek") return "DeepSeek"
  if (s === "extension") return "Extension"
  if (s === "dashboard (manual)") return "Dashboard"
  return site.charAt(0).toUpperCase() + site.slice(1)
}

function getDayGroupLabel(dateStr: string): string {
  if (!dateStr) return "Earlier"
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const itemDate = new Date(d)
  itemDate.setHours(0, 0, 0, 0)

  if (itemDate.getTime() === today.getTime()) return "Today"
  if (itemDate.getTime() === yesterday.getTime()) return "Yesterday"

  return itemDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function HistoryClient({
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

  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [siteFilter, setSiteFilter] = useState("all")
  const [selectedLog, setSelectedLog] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 15

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, siteFilter])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from("optimization_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1000)

    if (siteFilter !== "all") {
      query = query.eq("site", siteFilter)
    }

    const { data, error } = await query
    if (!error && data) {
      setLogs(data)
    }
    setLoading(false)
  }, [supabase, userId, siteFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const { error } = await supabase
      .from("optimization_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (!error) {
      setLogs((prev) => prev.filter((item) => item.id !== id))
      if (selectedLog?.id === id) {
        setSelectedLog(null)
      }
    }
  }

  const handleClearAll = async () => {
    if (logs.length === 0) return
    const { error } = await supabase
      .from("optimization_logs")
      .delete()
      .eq("user_id", userId)

    if (!error) {
      setLogs([])
      setSelectedLog(null)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Filter by search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs
    const q = searchQuery.toLowerCase()
    return logs.filter((l) => {
      const orig = (l.original_prompt || "").toLowerCase()
      const up = (l.upgraded_prompt || "").toLowerCase()
      return orig.includes(q) || up.includes(q)
    })
  }, [logs, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE))
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredLogs, currentPage])

  // Group logs by timeline day
  const groupedLogs = useMemo(() => {
    const map = new Map<string, any[]>()
    paginatedLogs.forEach((log) => {
      const label = getDayGroupLabel(log.created_at)
      if (!map.has(label)) {
        map.set(label, [])
      }
      map.get(label)!.push(log)
    })
    return Array.from(map.entries())
  }, [paginatedLogs])

  return (
    <div className="w-full max-w-full overflow-hidden pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-white mb-1">
            Optimization History
          </h1>
          <p className="text-[14px] text-white/50">
            View and compare your past prompt upgrades across your AI applications.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative w-[240px]">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search prompt history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[36px] pl-9 pr-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-all"
            />
          </div>

          {/* Apple-grade Shadcn DropdownMenu for Model Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-[36px] px-3.5 rounded-xl bg-[#1A1A1C] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.14] text-[13px] font-medium text-white/90 inline-flex items-center gap-2 transition-all shrink-0"
              >
                <span>
                  {siteFilter === "all" ? "All AI Models" : formatSiteName(siteFilter)}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-white/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[180px] bg-[#1A1A1C]/95 backdrop-blur-2xl border border-white/[0.1] text-white rounded-xl shadow-2xl p-1.5"
            >
              {[
                { label: "All AI Models", value: "all" },
                { label: "ChatGPT", value: "chatgpt" },
                { label: "Claude", value: "claude" },
                { label: "Gemini", value: "gemini" },
                { label: "Perplexity", value: "perplexity" },
              ].map((model) => (
                <DropdownMenuItem
                  key={model.value}
                  onClick={() => setSiteFilter(model.value)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px] cursor-pointer transition-colors ${
                    siteFilter === model.value
                      ? "bg-white/[0.12] text-white font-medium"
                      : "text-white/70 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <span>{model.label}</span>
                  {siteFilter === model.value && <Check className="w-3.5 h-3.5 text-white" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Monotone Bin Icon -> turns red on hover -> opens Shadcn AlertDialog */}
          {logs.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  title="Clear all history"
                  className="w-[36px] h-[36px] rounded-xl bg-[#1A1A1C] border border-white/[0.08] text-white/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center transition-all shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1A1A1C] border border-white/[0.1] text-white rounded-2xl max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[18px] font-semibold text-white">
                    Clear All Optimization History?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[13px] text-white/60">
                    This will permanently delete all your prompt history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                  <AlertDialogCancel className="rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/80 hover:bg-white/[0.1] hover:text-white text-[13px] h-9 px-4">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-medium text-[13px] h-9 px-4"
                  >
                    Clear All History
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-20 rounded-2xl bg-white/[0.03] animate-pulse" />
          <div className="h-20 rounded-2xl bg-white/[0.03] animate-pulse" />
          <div className="h-20 rounded-2xl bg-white/[0.03] animate-pulse" />
        </div>
      ) : groupedLogs.length === 0 ? (
        /* Apple-Grade Empty State */
        <div className="card p-14 border border-white/[0.06] bg-[#1A1A1C] text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-white/60">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-[20px] font-semibold text-white mb-2">
            No prompt history.
          </h3>
          <p className="text-[14px] text-white/50 mb-6">
            Improve your first prompt in ChatGPT, Claude, or Gemini to begin tracking your upgrade timeline.
          </p>
          <a
            href="/dashboard/optimization"
            className="inline-flex items-center gap-2 h-[38px] px-5 rounded-xl bg-white text-[#111111] text-[13px] font-semibold hover:bg-white/90 transition-all"
          >
            <PromptSparkleIcon size={14} className="text-[#111111]" />
            <span>Improve First Prompt</span>
          </a>
        </div>
      ) : (
        /* Chronological Timeline View */
        <div className="space-y-10">
          {groupedLogs.map(([dayLabel, items]) => (
            <div key={dayLabel} className="space-y-3">
              {/* Day Header */}
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-mono font-semibold uppercase tracking-wider text-white/40">
                  {dayLabel}
                </span>
                <div className="h-px flex-1 bg-white/[0.05]" />
                <span className="text-[11px] font-mono text-white/30">
                  {items.length} {items.length === 1 ? "prompt" : "prompts"}
                </span>
              </div>

              {/* Timeline Cards */}
              <div className="space-y-2">
                {items.map((log) => {
                  const delta = (log.score_after || 0) - (log.score_before || 0)
                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="card p-4 border border-white/[0.05] bg-[#1A1A1C] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all cursor-pointer flex items-center justify-between gap-3 w-full max-w-full overflow-hidden group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                        <span className="inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[11px] font-medium text-white/90 shrink-0">
                          <ModelIcon site={log.site} className="w-3.5 h-3.5 text-white/80 shrink-0" />
                          <span>{formatSiteName(log.site)}</span>
                        </span>

                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="text-[14px] text-white/90 truncate font-medium">
                            {log.original_prompt || log.upgraded_prompt}
                          </p>
                          {log.strategy_used && (
                            <p className="text-[12px] text-white/40 truncate mt-0.5">
                              Strategy: {log.strategy_used}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[12px] font-mono text-white/40 min-w-[56px] text-right">
                          {formatRelativeTime(log.created_at)}
                        </span>
                        <ScorePill delta={delta} />

                        {/* Apple-grade 3-Dot Options Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              title="More options"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] opacity-50 group-hover:opacity-100 transition-all shrink-0"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-[170px] bg-[#1A1A1C]/95 backdrop-blur-2xl border border-white/[0.1] text-white rounded-xl shadow-2xl p-1.5"
                          >
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedLog(log)
                              }}
                              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-white/80 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-white/50" />
                              <span>Open Details</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopy(log.upgraded_prompt || log.original_prompt)
                              }}
                              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-white/80 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-white/50" />
                              <span>Copy Prompt</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-white/[0.06] my-1" />

                            <DropdownMenuItem
                              onClick={(e) => handleDelete(log.id, e)}
                              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>Delete Item</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {filteredLogs.length > 0 && (
        <div className="flex items-center justify-between pt-6 mt-8 border-t border-white/[0.06] flex-wrap gap-4">
          <span className="text-[12px] font-mono text-white/40">
            Showing {filteredLogs.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} prompts
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 rounded-xl bg-[#1A1A1C] border border-white/[0.08] text-[12px] text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              Previous
            </button>
            <span className="text-[12px] font-mono text-white/60 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-3 rounded-xl bg-[#1A1A1C] border border-white/[0.08] text-[12px] text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Inspection Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-[#151515] border-l border-white/[0.07] text-white p-6 overflow-y-auto">
          {selectedLog && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-[18px] font-semibold text-white">
                  Prompt Details
                </SheetTitle>
              </SheetHeader>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-white/40 uppercase">Model:</span>
                  <span className="text-[12px] font-mono font-semibold text-white">
                    {formatSiteName(selectedLog.site)}
                  </span>
                </div>
                <ScorePill delta={(selectedLog.score_after || 0) - (selectedLog.score_before || 0)} />
              </div>

              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2">
                  Upgraded Prompt
                </div>
                <div className="p-4 rounded-2xl bg-[#1A1A1C] border border-white/[0.06] text-[13px] text-white/90 leading-relaxed font-mono relative">
                  {selectedLog.upgraded_prompt}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedLog.upgraded_prompt || "")}
                  className="mt-2 inline-flex items-center gap-1.5 h-[34px] px-4 rounded-xl bg-white text-[#111111] text-[12px] font-semibold hover:bg-white/90 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-black" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Upgraded Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2">
                  Original Prompt
                </div>
                <div className="p-4 rounded-2xl bg-[#1A1A1C]/50 border border-white/[0.04] text-[13px] text-white/60 leading-relaxed font-mono">
                  {selectedLog.original_prompt}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
