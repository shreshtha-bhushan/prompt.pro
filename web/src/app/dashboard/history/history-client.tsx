"use client"

import { useState, useEffect, useCallback } from "react"
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

export function HistoryClient({ userId, clerkToken }: { userId: string, clerkToken: string | null }) {
  const supabase = createClerkSupabaseClient(clerkToken)
  
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
          <label className="text-xs text-[--text-muted] uppercase tracking-wide">Site</label>
          <Select value={siteFilter} onValueChange={(val) => { setSiteFilter(val); setPage(1) }}>
            <SelectTrigger className="w-[180px] bg-[--bg-elevated] border-[--border-subtle]">
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent className="bg-[#111113] border-[--border-subtle]">
              <SelectItem value="all">All Sites</SelectItem>
              <SelectItem value="chatgpt.com">chatgpt.com</SelectItem>
              <SelectItem value="claude.ai">claude.ai</SelectItem>
              <SelectItem value="gemini.google.com">gemini.google.com</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <label className="text-xs text-[--text-muted] uppercase tracking-wide">Strategy</label>
          <Select value={strategyFilter} onValueChange={(val) => { setStrategyFilter(val); setPage(1) }}>
            <SelectTrigger className="w-[180px] bg-[--bg-elevated] border-[--border-subtle]">
              <SelectValue placeholder="All Strategies" />
            </SelectTrigger>
            <SelectContent className="bg-[#111113] border-[--border-subtle]">
              <SelectItem value="all">All Strategies</SelectItem>
              <SelectItem value="enhance">Enhance</SelectItem>
              <SelectItem value="elaborate">Elaborate</SelectItem>
              <SelectItem value="concise">Concise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[--text-muted] uppercase tracking-wide">From Date</label>
          <Input 
            type="date" 
            value={dateFrom} 
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="w-[160px] bg-[--bg-elevated] border-[--border-subtle] [color-scheme:dark]" 
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[--text-muted] uppercase tracking-wide">To Date</label>
          <Input 
            type="date" 
            value={dateTo} 
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="w-[160px] bg-[--bg-elevated] border-[--border-subtle] [color-scheme:dark]" 
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass border border-[--border-subtle] rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-[rgba(255,255,255,0.02)] sticky top-0 z-10 backdrop-blur-md">
              <TableRow className="border-[--border-subtle] hover:bg-transparent">
                <TableHead className="w-[100px] text-[--text-muted]">Date</TableHead>
                <TableHead className="text-[--text-muted]">Site</TableHead>
                <TableHead className="text-[--text-muted]">Strategy</TableHead>
                <TableHead className="w-[40%] text-[--text-muted]">Original</TableHead>
                <TableHead className="text-right text-[--text-muted]">Score Before</TableHead>
                <TableHead className="text-right text-[--text-muted]">Score After</TableHead>
                <TableHead className="text-right text-[--text-muted]">Lift</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-[--border-subtle] hover:bg-[rgba(255,255,255,0.02)]">
                  <TableCell colSpan={7} className="text-center py-10 text-[--text-muted]">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow className="border-[--border-subtle] hover:bg-[rgba(255,255,255,0.02)]">
                  <TableCell colSpan={7} className="text-center py-10 text-[--text-muted]">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const lift = (log.score_after || 0) - (log.score_before || 0)
                  return (
                    <TableRow 
                      key={log.id} 
                      className="border-[--border-subtle] hover:bg-[rgba(255,255,255,0.04)] cursor-pointer"
                      onClick={() => handleRowClick(log)}
                    >
                      <TableCell className="font-medium text-[--text-secondary]">
                        {new Date(log.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs border border-[--border-subtle] rounded-full px-2 py-0.5 text-[--text-primary]">
                          {log.site || "unknown"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-[--text-muted] uppercase tracking-wide">
                          {log.strategy || "enhance"}
                        </span>
                      </TableCell>
                      <TableCell className="truncate max-w-[300px] text-[--text-secondary]">
                        {log.original_prompt}
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
          <div className="border-t border-[--border-subtle] p-4 bg-[rgba(255,255,255,0.01)]">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); if(page > 1) setPage(p => p - 1) }}
                    className={page <= 1 ? "opacity-50 pointer-events-none" : "hover:bg-[--bg-elevated]"}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-sm text-[--text-muted] px-4">
                    Page {page} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); if(page < totalPages) setPage(p => p + 1) }}
                    className={page >= totalPages ? "opacity-50 pointer-events-none" : "hover:bg-[--bg-elevated]"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="w-full sm:max-w-[480px] bg-[#111113] border-l border-[--border-subtle] p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-[--border-subtle]">
            <SheetTitle className="text-lg font-semibold text-[--text-primary]">Optimization Details</SheetTitle>
          </SheetHeader>
          
          {selectedLog && (
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-8">
              
              {/* Scores & Progress */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <div className="text-[--text-secondary]">Score Progression</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[--text-muted]">{selectedLog.score_before}</span>
                    <ArrowRightIcon className="w-4 h-4 text-[--text-muted]" />
                    <span className="text-[--text-primary] font-medium">{selectedLog.score_after}</span>
                  </div>
                </div>
                <Progress 
                  value={selectedLog.score_after} 
                  className="h-2 bg-[--bg-elevated] [&>div]:bg-[--text-primary]"
                />
                
                <div className="flex gap-2 pt-2">
                  <span className="text-xs border border-[--border-subtle] rounded-full px-2 py-0.5 text-[--text-secondary] uppercase tracking-wider">
                    {selectedLog.strategy || "enhance"}
                  </span>
                  <span className="text-xs border border-[--border-subtle] rounded-full px-2 py-0.5 text-[--text-secondary] uppercase tracking-wider">
                    {selectedLog.tone || "technical"}
                  </span>
                </div>
              </div>

              {/* Original Prompt */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-[--text-primary]">Original Prompt</div>
                <div className="bg-[--bg-elevated] border border-[--border-subtle] rounded-lg p-4 font-mono text-sm text-[--text-secondary] whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                  {selectedLog.original_prompt}
                </div>
              </div>

              {/* Upgraded Prompt */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-[--text-primary]">Upgraded Prompt</div>
                  <button 
                    onClick={() => handleCopy(selectedLog.upgraded_prompt)}
                    className="flex items-center gap-1.5 text-xs text-[--text-muted] hover:text-[--text-primary] transition-colors"
                  >
                    {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="bg-[--bg-elevated] border border-[--border-subtle] rounded-lg p-4 font-mono text-sm text-[--text-primary] whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
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
