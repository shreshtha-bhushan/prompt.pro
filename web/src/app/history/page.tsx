import { PageHeader } from '@/components/ui/PageHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { MetaLabel } from '@/components/ui/MetaLabel'
import { PageTransition } from '@/components/layout/PageTransition'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'

const mockHistory = [
  {
    id: '1',
    platform: 'ChatGPT',
    mode: 'Technical',
    lift: 82,
    original: 'Write a python script to parse logs.',
    upgraded: 'Write a robust Python script to parse access logs, extracting IPs, timestamps, and request paths. Use regex for parsing and handle potential malformed lines gracefully, outputting results as a structured JSON object.',
    date: 'Today',
  },
  {
    id: '2',
    platform: 'Claude',
    mode: 'Creative',
    lift: 45,
    original: 'Give me ideas for a blog post.',
    upgraded: 'Generate 5 compelling, unconventional blog post ideas about the future of remote work. For each idea, provide a catchy title, a one-sentence summary, and the target audience.',
    date: 'Yesterday',
  }
]

export default function HistoryPage() {
  return (
    <PageTransition>
      <div className="min-h-screen pb-12">
        <PageHeader
          title="History"
          eyebrow="21 upgrades"
          action={
            <div className="flex gap-3">
              <Input
                placeholder="Search history..."
                className="input-glass w-48"
              />
            </div>
          }
        />

        <div className="px-8 flex flex-col gap-4">
          {/* ── Filter Bar ── */}
          <GlassCard className="py-3 px-4 flex items-center gap-4">
            <Select defaultValue="all">
              <SelectTrigger className="w-32 border-none bg-transparent shadow-none h-auto p-0 font-medium hover:text-white">
                <SelectValue placeholder="All Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                <SelectItem value="chatgpt">ChatGPT</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-px h-4 bg-white/10" />

            <Select defaultValue="all">
              <SelectTrigger className="w-32 border-none bg-transparent shadow-none h-auto p-0 font-medium hover:text-white">
                <SelectValue placeholder="All Modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-px h-4 bg-white/10" />

            <Select defaultValue="7d">
              <SelectTrigger className="w-32 border-none bg-transparent shadow-none h-auto p-0 font-medium hover:text-white">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </GlassCard>

          {/* ── History Table ── */}
          <GlassCard noPad>
            <Table>
              <TableHeader style={{ borderBottom: '1px solid var(--border-dim)' }}>
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-[var(--text-tertiary)] font-mono text-[11px] uppercase tracking-wider">Platform</TableHead>
                  <TableHead className="text-[var(--text-tertiary)] font-mono text-[11px] uppercase tracking-wider">Mode</TableHead>
                  <TableHead className="text-[var(--text-tertiary)] font-mono text-[11px] uppercase tracking-wider">Score Lift</TableHead>
                  <TableHead className="text-[var(--text-tertiary)] font-mono text-[11px] uppercase tracking-wider">Original</TableHead>
                  <TableHead className="text-[var(--text-tertiary)] font-mono text-[11px] uppercase tracking-wider text-right pr-6">Date</TableHead>
                </TableRow>
              </TableHeader>
                {mockHistory.map((item) => (
                  <Collapsible key={item.id} asChild>
                    <tbody className="[&_tr:last-child]:border-0">
                      <CollapsibleTrigger asChild>
                        <TableRow
                          style={{
                            borderBottom: '1px solid var(--border-dim)',
                            cursor: 'pointer',
                            transition: 'background var(--dur-fast)',
                          }}
                          className="hover:bg-[rgba(255,255,255,0.03)] border-none"
                        >
                          <TableCell className="font-medium text-[var(--text-secondary)]">{item.platform}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              style={{
                                background:   'rgba(255,255,255,0.06)',
                                border:       '1px solid rgba(255,255,255,0.10)',
                                color:        'var(--text-secondary)',
                                fontSize:     'var(--text-micro)',
                                fontFamily:   'var(--font-mono)',
                                borderRadius: 'var(--radius-pill)',
                                padding:      '2px 8px',
                                fontWeight:   500,
                                letterSpacing:'0.04em',
                              }}
                            >
                              {item.mode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span style={{
                                fontSize:   'var(--text-subhead)',
                                fontWeight: 600,
                                fontFamily: 'var(--font-mono)',
                                color:      'var(--score-positive)',
                                width:      '32px',
                              }}>
                                +{item.lift}
                              </span>
                              <div style={{ width: '40px', height: '3px', background: 'var(--score-track)', borderRadius: '9999px' }}>
                                <div style={{ width: `${(item.lift / 100) * 100}%`, height: '100%', background: 'var(--score-bar)', borderRadius: '9999px' }} />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[var(--text-secondary)] max-w-[200px] truncate">
                            {item.original}
                          </TableCell>
                          <TableCell className="text-right text-[var(--text-tertiary)] pr-6">
                            {item.date}
                          </TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <tr>
                          <td colSpan={5} className="p-0 border-none">
                            <div style={{
                              display:    'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap:        'var(--space-4)',
                              padding:    'var(--space-4)',
                              background: 'var(--surface-inset)',
                              borderBottom:  '1px solid var(--border-dim)',
                            }}>
                              <div>
                                <MetaLabel>Before</MetaLabel>
                                <p style={{ fontSize: 'var(--text-footnote)', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.6 }}>
                                  {item.original}
                                </p>
                              </div>
                              <div>
                                <MetaLabel>After</MetaLabel>
                                <p style={{ fontSize: 'var(--text-footnote)', color: 'var(--text-primary)', marginTop: '8px', lineHeight: 1.6 }}>
                                  {item.upgraded}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </CollapsibleContent>
                    </tbody>
                  </Collapsible>
                ))}
            </Table>
          </GlassCard>
        </div>
      </div>
    </PageTransition>
  )
}
