"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { createClerkSupabaseClient } from "@/lib/supabase/client"
import {
  BookOpen,
  Plus,
  Search,
  Copy,
  Check,
  Trash2,
  FolderOpen,
} from "lucide-react"
import { PromptSparkleIcon } from "@/components/shared/PromptSparkleIcon"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

const NOTE_CATEGORIES = [
  { id: "all", label: "All Notes" },
  { id: "snippet", label: "Snippets" },
  { id: "context", label: "Context Blocks" },
]

function isContextNote(item: any) {
  if (item?.type === "context") return true
  if (item?.type === "snippet") return false
  if (
    item?.type === "brand" ||
    item?.type === "research" ||
    item?.type === "tech"
  )
    return true
  const title = (item?.title || "").toLowerCase()
  if (
    title.includes("stack") ||
    title.includes("tone") ||
    title.includes("claude") ||
    title.includes("context")
  ) {
    return true
  }
  return false
}

export function LibraryClient({
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

  const [snippets, setSnippets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState("snippet")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchSnippets = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("snippets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (data && data.length > 0) {
      setSnippets(data)
    } else {
      setSnippets([
        {
          id: "s1",
          title: "Example: Senior Review",
          content: "Review this code for edge cases and efficiency. Ensure it follows modern standards.",
          type: "snippet",
          created_at: "2026-06-10T10:00:00Z",
          active: true,
        },
        {
          id: "c1",
          title: "React Stack",
          content: "Using React 18, Tailwind, TypeScript.",
          type: "context",
          created_at: "2026-06-10T10:00:00Z",
          active: true,
        },
        {
          id: "c2",
          title: "Brand Tone",
          content: "Brand voice is extremely energetic and concise.",
          type: "context",
          created_at: "2026-06-10T10:00:00Z",
          active: true,
        },
        {
          id: "c3",
          title: "Claude Code",
          content: "Always Check for edge cases, and apply guardrails appropriately.",
          type: "context",
          created_at: "2026-06-10T10:00:00Z",
          active: true,
        },
      ])
    }
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    fetchSnippets()
  }, [fetchSnippets])

  const handleSave = async () => {
    if (!newTitle.trim() || !newContent.trim()) return

    const { data, error } = await supabase
      .from("snippets")
      .insert([
        {
          user_id: userId,
          title: newTitle.trim(),
          content: newContent.trim(),
          type: newCategory,
        },
      ])
      .select()

    if (!error && data) {
      setSnippets((prev) => [data[0], ...prev])
      setIsDialogOpen(false)
      setNewTitle("")
      setNewContent("")
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("snippets")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (!error) {
      setSnippets((prev) => prev.filter((item) => item.id !== id))
    }
  }

  const handleClearAll = async () => {
    if (snippets.length === 0) return
    const { error } = await supabase
      .from("snippets")
      .delete()
      .eq("user_id", userId)

    if (!error) {
      setSnippets([])
    }
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleToggleActive = async (item: any) => {
    const currentActive = item.active !== false
    const newActive = !currentActive

    setSnippets((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, active: newActive } : s))
    )

    try {
      await supabase
        .from("snippets")
        .update({ active: newActive })
        .eq("id", item.id)
        .eq("user_id", userId)
    } catch (e) {}
  }

  // Filter snippets vs context blocks
  const filteredSnippets = useMemo(() => {
    return snippets.filter((s) => {
      const isCtx = isContextNote(s)
      const matchesCat =
        activeCategory === "all" ||
        (activeCategory === "context" && isCtx) ||
        (activeCategory === "snippet" && !isCtx)
      const matchesSearch =
        !searchQuery.trim() ||
        (s.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.content || "").toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCat && matchesSearch
    })
  }, [snippets, activeCategory, searchQuery])

  return (
    <div className="flex-1 pt-6 px-8 pb-12 max-w-[1440px] mx-auto">
      {/* Apple Notes Header & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-white mb-1">
            Prompt Library
          </h1>
          <p className="text-[14px] text-white/50">
            Apple Notes-style visual library for your system contexts, brand voices, and templates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-[240px]">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search library notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[36px] pl-9 pr-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Monotone Bin Icon -> turns red on hover -> opens Shadcn AlertDialog */}
          {snippets.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  title="Clear all prompt notes"
                  className="w-[36px] h-[36px] rounded-xl bg-[#1A1A1C] border border-white/[0.08] text-white/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center transition-all shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1A1A1C] border border-white/[0.1] text-white rounded-2xl max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[18px] font-semibold text-white">
                    Clear All Saved Notes?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[13px] text-white/60">
                    This will permanently delete all your prompt library notes and templates. This action cannot be undone.
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
                    Clear All Notes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 h-[36px] px-4 rounded-xl bg-white text-[#111111] text-[13px] font-semibold hover:bg-white/90 transition-all shadow-[0_2px_12px_rgba(255,255,255,0.15)] shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>New Note</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#1A1A1C] border border-white/[0.07] text-white sm:max-w-[540px] p-6 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-[18px] font-semibold text-white">
                  Save Reusable Prompt Note
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-[12px] font-mono text-white/50 uppercase mb-1.5 block">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-[38px] px-3 rounded-xl bg-[#151515] border border-white/[0.08] text-[13px] text-white focus:outline-none"
                  >
                    <option value="snippet">Prompt Snippet</option>
                    <option value="context">Context Block</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-mono text-white/50 uppercase mb-1.5 block">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Executive Summary Tone"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full h-[38px] px-3 rounded-xl bg-[#151515] border border-white/[0.08] text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-mono text-white/50 uppercase mb-1.5 block">
                    Prompt Context Content
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Enter the reusable system prompt or context..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[#151515] border border-white/[0.08] text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 font-mono leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className="h-[36px] px-4 rounded-xl border border-white/[0.08] text-[13px] text-white/70 hover:bg-white/[0.05]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!newTitle.trim() || !newContent.trim()}
                    className="h-[36px] px-5 rounded-xl bg-white text-[#111111] text-[13px] font-semibold hover:bg-white/90 disabled:opacity-50"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Apple Notes Category Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 no-scrollbar">
        {NOTE_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`h-[34px] px-4 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
                active
                  ? "bg-white text-[#111111] font-semibold shadow-[0_1px_8px_rgba(255,255,255,0.15)]"
                  : "bg-white/[0.04] border border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="h-48 rounded-2xl bg-white/[0.03] animate-pulse" />
          <div className="h-48 rounded-2xl bg-white/[0.03] animate-pulse" />
          <div className="h-48 rounded-2xl bg-white/[0.03] animate-pulse" />
        </div>
      ) : filteredSnippets.length === 0 ? (
        /* Apple-Grade Empty State */
        <div className="card p-14 border border-white/[0.06] bg-[#1A1A1C] text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-white/60">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-[20px] font-semibold text-white mb-2">
            Nothing saved yet.
          </h3>
          <p className="text-[14px] text-white/50 mb-6">
            When you save prompts or system context notes they&apos;ll appear here as visual Apple Notes.
          </p>
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="inline-flex items-center gap-2 h-[38px] px-5 rounded-xl bg-white text-[#111111] text-[13px] font-semibold hover:bg-white/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Save First Prompt</span>
          </button>
        </div>
      ) : (
        /* Apple Notes Visual Card Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSnippets.map((item) => {
            const isCopied = copiedId === item.id
            const isCtx = isContextNote(item)
            const isActive = item.active !== false
            return (
              <div
                key={item.id}
                className={`card p-6 border transition-all flex flex-col justify-between group h-[225px] ${
                  isCtx && isActive
                    ? "border-[#30d158]/35 bg-gradient-to-br from-[#30d158]/[0.06] to-[#1A1A1C] shadow-[0_4px_24px_rgba(48,209,88,0.06)]"
                    : "border-white/[0.06] bg-[#1A1A1C] hover:bg-white/[0.03] hover:border-white/[0.12]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center h-[22px] px-2.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                        isCtx
                          ? "bg-[#30d158]/15 border border-[#30d158]/30 text-[#30d158]"
                          : "bg-white/[0.05] border border-white/[0.06] text-white/70"
                      }`}
                    >
                      {isCtx ? "CONTEXT BLOCK" : "SNIPPET"}
                    </span>

                    {isCtx ? (
                      <span
                        className={`text-[11px] font-mono font-medium flex items-center gap-1.5 ${
                          isActive ? "text-[#30d158]" : "text-white/40"
                        }`}
                      >
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
                        )}
                        {isActive ? "Active" : "Disabled"}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-white/30">
                        {new Date(
                          item.created_at || Date.now()
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  <h3 className="text-[16px] font-semibold text-white truncate mb-2">
                    {item.title}
                  </h3>

                  <p className="text-[13px] text-white/60 line-clamp-3 font-mono leading-relaxed">
                    {item.content}
                  </p>
                </div>

                {/* Footer Toolbar */}
                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isCtx && (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        className={`h-[30px] px-3 rounded-lg text-[12px] font-semibold transition-all ${
                          isActive
                            ? "bg-[#30d158]/15 border border-[#30d158]/35 text-[#30d158] hover:bg-[#30d158]/25"
                            : "bg-white/[0.05] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.1]"
                        }`}
                      >
                        {isActive ? "Enabled" : "Enable"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.content)}
                      className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#30d158]" />
                          <span className="text-[#30d158]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Note</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    title="Delete note"
                    className="p-1.5 rounded-lg text-white/20 hover:text-[--danger] hover:bg-white/[0.04] transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
