import { PageHeader } from '@/components/ui/PageHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { MetaLabel } from '@/components/ui/MetaLabel'
import { PageTransition } from '@/components/layout/PageTransition'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoreHorizontal, Plus } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const mockLibrary = [
  {
    id: '1',
    mode: 'Technical',
    title: 'Senior Review',
    content: 'Act as a senior principal engineer. Review this code for performance, security, and maintainability. Point out architectural flaws before focusing on micro-optimizations.',
    uses: 3,
    relativeTime: '5 days ago',
  },
  {
    id: '2',
    mode: 'Creative',
    title: 'Blog Post Ideation',
    content: 'Generate 5 compelling, unconventional blog post ideas about the given topic. For each idea, provide a catchy title, a one-sentence summary, and the target audience.',
    uses: 1,
    relativeTime: 'Today',
  }
]

export default function LibraryPage() {
  return (
    <PageTransition>
      <div className="min-h-screen pb-12">
        <PageHeader
          title="Library"
          eyebrow="4 snippets"
          action={
            <Button className="btn-primary flex items-center gap-2">
              <Plus size={16} />
              New Snippet
            </Button>
          }
        />

        <div className="px-8 pb-6">
          <Input
            placeholder="Search library..."
            className="input-glass w-64"
          />
        </div>

        <div className="px-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockLibrary.map((snippet) => (
            <GlassCard
              key={snippet.id}
              className="flex flex-col gap-3 cursor-pointer group hover:bg-[var(--glass-fill-hover)] transition-colors duration-200"
            >
              <div className="flex items-start justify-between">
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
                  {snippet.mode}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100"
                      style={{ color: 'var(--text-tertiary)' }}>
                      <MoreHorizontal size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem style={{ color: 'var(--danger)' }}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div>
                <h3 style={{ fontSize: 'var(--text-headline)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {snippet.title}
                </h3>
                <p style={{
                  fontSize: 'var(--text-footnote)',
                  color: 'var(--text-tertiary)',
                  marginTop: '4px',
                  lineHeight: 1.6,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {snippet.content}
                </p>
              </div>

              <div style={{ height: '1px', background: 'var(--border-dim)' }} />

              <div className="flex items-center justify-between">
                <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-quaternary)', fontFamily: 'var(--font-mono)' }}>
                  Used {snippet.uses}× · {snippet.relativeTime}
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </PageTransition>
  )
}
