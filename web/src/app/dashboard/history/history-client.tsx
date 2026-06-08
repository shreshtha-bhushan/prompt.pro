"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClerkSupabaseClient } from "@/lib/supabase/client"
import { ArrowRightIcon, CopyIcon, CheckIcon } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Button } from "@/components/ui/button"
import { DatePickerInput } from "@/components/ui/date-picker-input"
import { Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Progress } from "@/components/ui/progress"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

function formatSiteName(site: string) {
  if (!site) return "Unknown"
  const s = site.toLowerCase()
  if (s === "chatgpt") return "ChatGPT"
  if (s === "claude") return "Claude"
  if (s === "gemini") return "Gemini"
  if (s === "perplexity") return "Perplexity"
  if (s === "deepseek") return "DeepSeek"
  if (s === "extension") return "Extension"
  if (s === "unknown") return "Unknown"
  if (s === "dashboard (manual)") return "Dashboard"
  return site.charAt(0).toUpperCase() + site.slice(1)
}

export function HistoryClient({ userId, clerkToken }: { userId: string, clerkToken: string | null }) {
  const supabase = useMemo(() => createClerkSupabaseClient(clerkToken), [clerkToken])
  
  const [logs, setLogs] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [page, setPage] = useState(1)
  const [siteFilter, setSiteFilter] = useState("all")
  const [strategyFilter, setStrategyFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  
  // Sheet
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const ITEMS_PER_PAGE = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const uuid = userId
    
    let query = supabase
      .from('optimization_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', uuid)

    if (siteFilter !== "all") {
      query = query.eq('site', siteFilter)
    }
    if (strategyFilter !== "all") {
      query = query.eq('strategy', strategyFilter)
    }
    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString())
    }
    if (dateTo) {
      // Add one day to include the end date fully
      const toDate = new Date(dateTo)
      toDate.setDate(toDate.getDate() + 1)
      query = query.lte('created_at', toDate.toISOString())
    }

    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    query = query.order('created_at', { ascending: false }).range(from, to)

    const { data, count, error } = await query
    
    if (data) setLogs(data)
    if (count !== null) setTotalCount(count)
    
    setLoading(false)
  }, [supabase, userId, page, siteFilter, strategyFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRowClick = (log: any) => {
    setSelectedLog(log)
  }

  return (
    <div className="flex flex-col flex-1 gap-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs text-[--text-secondary] uppercase tracking-wide">Site</label>
          <Select value={siteFilter} onValueChange={(val) => { setSiteFilter(val); setPage(1) }}>
            <SelectTrigger className="w-[180px] bg-[--layer-3] border-[--border-side]">
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent className="bg-[#111113] border-[--border-side]">
              <SelectItem value="all">All Sites</SelectItem>
              <SelectItem value="chatgpt">ChatGPT</SelectItem>
              <SelectItem value="claude">Claude</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
              <SelectItem value="perplexity">Perplexity</SelectItem>
              <SelectItem value="deepseek">DeepSeek</SelectItem>
              <SelectItem value="Dashboard (Manual)">Dashboard (Manual)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <label className="text-xs text-[--text-secondary] uppercase tracking-wide">Strategy</label>
          <Select value={strategyFilter} onValueChange={(val) => { setStrategyFilter(val); setPage(1) }}>
            <SelectTrigger className="w-[180px] bg-[--layer-3] border-[--border-side]">
              <SelectValue placeholder="All Strategies" />
            </SelectTrigger>
            <SelectContent className="bg-[#111113] border-[--border-side]">
              <SelectItem value="all">All Strategies</SelectItem>
              <SelectItem value="enhance">Enhance</SelectItem>
              <SelectItem value="elaborate">Elaborate</SelectItem>
              <SelectItem value="concise">Concise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[--text-secondary] uppercase tracking-wide">From Date</label>
          <DatePickerInput 
            value={dateFrom} 
            onChange={(val) => { setDateFrom(val); setPage(1) }}
            className="w-[160px]" 
            placeholder="From Date"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[--text-secondary] uppercase tracking-wide">To Date</label>
          <DatePickerInput 
            value={dateTo} 
            onChange={(val) => { setDateTo(val); setPage(1) }}
            className="w-[160px]" 
            placeholder="To Date"
          />
        </div>

        <div className="space-y-1 ml-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="h-[42px] border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                <Trash2Icon className="w-4 h-4 mr-2" />
                Clear History
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#111113] border-[--border-side] text-[--text-primary]">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-[--text-secondary]">
                  This action cannot be undone. This will permanently delete all your optimization history from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-[--layer-3] border-[--border-side] text-[--text-primary] hover:bg-[rgba(255,255,255,0.1)]">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-red-500 text-white hover:bg-red-600"
                  onClick={async () => {
                    const res = await fetch("/api/extension/sync", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "clearHistory" })
                    })
                    if (res.ok) {
                      setLogs([])
                      setTotalCount(0)
                      setPage(1)
                    }
                  }}
                >
                  Yes, delete history
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Table */}
      <div className="card rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-[--layer-2] sticky top-0 z-10">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="w-[100px] text-[--text-secondary]">Date</TableHead>
                <TableHead className="text-[--text-secondary]">Site</TableHead>
                <TableHead className="text-[--text-secondary]">Strategy</TableHead>
                <TableHead className="w-[40%] text-[--text-secondary]">Original</TableHead>
                <TableHead className="text-right text-[--text-secondary]">Score Before</TableHead>
                <TableHead className="text-right text-[--text-secondary]">Score After</TableHead>
                <TableHead className="text-right text-[--text-secondary]">Lift</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-none hover:bg-[rgba(255,255,255,0.02)]">
                  <TableCell colSpan={7} className="text-center py-10 text-[--text-secondary]">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow className="border-none hover:bg-[rgba(255,255,255,0.02)]">
                  <TableCell colSpan={7} className="text-center py-10 text-[--text-secondary]">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const lift = (log.score_after || 0) - (log.score_before || 0)
                  return (
                    <TableRow 
                      key={log.id} 
                      className="border-none hover:bg-[rgba(255,255,255,0.04)] cursor-pointer"
                      onClick={() => handleRowClick(log)}
                    >
                      <TableCell className="font-medium text-[--text-secondary]">
                        {new Date(log.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs border border-[--border-side] rounded-full px-2 py-0.5 text-[--text-primary]">
                          {formatSiteName(log.site)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-[--text-secondary] uppercase tracking-wide">
                          {log.strategy || "enhance"}
                        </span>
                      </TableCell>
                      <TableCell className="truncate max-w-[300px] text-[--text-secondary]" title={log.original_prompt && log.original_prompt !== "Synced from Extension" ? log.original_prompt : log.upgraded_prompt}>
                        {log.original_prompt && log.original_prompt !== "Synced from Extension"
                          ? log.original_prompt
                          : (log.upgraded_prompt || log.original_prompt || "")}
                      </TableCell>
                      <TableCell className="text-right text-[--text-secondary]">{log.score_before}</TableCell>
                      <TableCell className="text-right text-[--text-primary] font-medium">{log.score_after}</TableCell>
                      <TableCell className="text-right">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${lift > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {lift > 0 ? '+' : ''}{lift}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-[--border-side] p-4 bg-[rgba(255,255,255,0.01)]">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); if(page > 1) setPage(p => p - 1) }}
                    className={page <= 1 ? "opacity-50 pointer-events-none" : "hover:bg-[--layer-3]"}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-sm text-[--text-secondary] px-4">
                    Page {page} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); if(page < totalPages) setPage(p => p + 1) }}
                    className={page >= totalPages ? "opacity-50 pointer-events-none" : "hover:bg-[--layer-3]"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="w-full sm:max-w-[480px] bg-[#111113] border-l border-[--border-side] p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-[--border-side]">
            <SheetTitle className="text-lg font-semibold text-[--text-primary]">Optimization Details</SheetTitle>
          </SheetHeader>
          
          {selectedLog && (
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-8">
              
              {/* Scores & Progress */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <div className="text-[--text-secondary]">Score Progression</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[--text-secondary]">{selectedLog.score_before}</span>
                    <ArrowRightIcon className="w-4 h-4 text-[--text-secondary]" />
                    <span className="text-[--text-primary] font-medium">{selectedLog.score_after}</span>
                  </div>
                </div>
                <Progress 
                  value={selectedLog.score_after} 
                  className="h-2 bg-[--layer-3] [&>div]:bg-[--text-primary]"
                />
                
                <div className="flex gap-2 pt-2">
                  <span className="text-xs border border-[--border-side] rounded-full px-2 py-0.5 text-[--text-secondary] uppercase tracking-wider">
                    {selectedLog.strategy || "enhance"}
                  </span>
                  <span className="text-xs border border-[--border-side] rounded-full px-2 py-0.5 text-[--text-secondary] uppercase tracking-wider">
                    {selectedLog.tone || "technical"}
                  </span>
                </div>
              </div>

              {/* Original Prompt */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-[--text-primary]">Original Prompt</div>
                <div className="bg-[--layer-3] border border-[--border-side] rounded-lg p-4 font-mono text-sm text-[--text-secondary] whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                  {selectedLog.original_prompt === "Synced from Extension" ? (
                    <span className="text-xs text-[--text-secondary] italic">Original prompt text not available (Synced from extension)</span>
                  ) : (
                    selectedLog.original_prompt
                  )}
                </div>
              </div>

              {/* Upgraded Prompt */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-[--text-primary]">Upgraded Prompt</div>
                  <button 
                    onClick={() => handleCopy(selectedLog.upgraded_prompt)}
                    className="flex items-center gap-1.5 text-xs text-[--text-secondary] hover:text-[--text-primary] transition-colors"
                  >
                    {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="bg-[--layer-3] border border-[--border-side] rounded-lg p-4 font-mono text-sm text-[--text-primary] whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                  {selectedLog.upgraded_prompt}
                </div>
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
