import { PageHeader } from '@/components/ui/PageHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { MetaLabel } from '@/components/ui/MetaLabel'
import { BigNumber } from '@/components/ui/BigNumber'
import { PageTransition } from '@/components/layout/PageTransition'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function ScoreBar({ label, count, max, pct }: { label: string, count: number, max: number, pct: number }) {
  return (
    <div className="flex items-center gap-4">
      <span style={{
        fontSize: 'var(--text-micro)',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-tertiary)',
        width: '52px',
        flexShrink: 0,
      }}>
        {label}
      </span>
      <div className="flex-1 rounded-full overflow-hidden"
        style={{ height: '6px', background: 'var(--score-track)' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: 'linear-gradient(90deg, rgba(52,199,89,0.5), rgba(52,199,89,0.85))',
          borderRadius: '9999px',
          transition: 'width 700ms var(--ease-smooth)',
        }} />
      </div>
      <span style={{
        fontSize: 'var(--text-micro)',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-secondary)',
        width: '24px',
        textAlign: 'right',
      }}>
        {count}
      </span>
    </div>
  )
}

export default function OptimizationPage() {
  return (
    <PageTransition>
      <div className="min-h-screen pb-12">
        <PageHeader
          title="Optimization"
          eyebrow="Performance"
        />

        <div className="px-8 flex flex-col gap-6">
          <Tabs defaultValue="overview">
            <TabsList style={{
              background:    'var(--glass-fill)',
              border:        '1px solid var(--border-subtle)',
              borderRadius:  'var(--radius-xl)',
              padding:       '3px',
              height:        'auto',
              gap:           '2px',
            }}>
              {['Overview', 'By Mode', 'By Platform', 'Trends'].map(tab => (
                <TabsTrigger
                  key={tab}
                  value={tab.toLowerCase().replace(' ', '-')}
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    fontSize:     'var(--text-subhead)',
                    color:        'var(--text-secondary)',
                    padding:      '6px 16px',
                    fontWeight:   500,
                  }}
                  className="data-[state=active]:bg-[rgba(255,255,255,0.10)] data-[state=active]:text-white"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="mt-6 flex flex-col gap-6">
              {/* Row 1: KPI Cards */}
              <div className="grid grid-cols-4 gap-4">
                <GlassCard>
                  <MetaLabel>Total Score Lift</MetaLabel>
                  <BigNumber value="+1,420" color="var(--score-positive)" />
                </GlassCard>
                <GlassCard>
                  <MetaLabel>Best Mode</MetaLabel>
                  <BigNumber value="Technical" />
                </GlassCard>
                <GlassCard>
                  <MetaLabel>Best Platform</MetaLabel>
                  <BigNumber value="Extension" />
                </GlassCard>
                <GlassCard>
                  <MetaLabel>Peak Day</MetaLabel>
                  <BigNumber value="Tuesday" />
                </GlassCard>
              </div>

              {/* Row 2: Score Distribution */}
              <GlassCard>
                <MetaLabel>Score Distribution</MetaLabel>
                <div className="mt-6 flex flex-col gap-3">
                  <ScoreBar label="90-100" count={8} max={8} pct={100} />
                  <ScoreBar label="70-89" count={5} max={8} pct={62.5} />
                  <ScoreBar label="50-69" count={2} max={8} pct={25} />
                  <ScoreBar label="<50" count={1} max={8} pct={12.5} />
                </div>
              </GlassCard>

              {/* Row 3: Mode Performance Table */}
              <GlassCard noPad>
                <div className="p-6 pb-4">
                  <MetaLabel>Mode Performance</MetaLabel>
                </div>
                <Table>
                  <TableHeader style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-[var(--text-tertiary)] font-mono text-[11px] uppercase tracking-wider pl-6">Mode</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-mono text-[11px] uppercase tracking-wider">Upgrades</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-mono text-[11px] uppercase tracking-wider">Avg Lift</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-mono text-[11px] uppercase tracking-wider">Best Lift</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-mono text-[11px] uppercase tracking-wider pr-6">Avg Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {['Technical', 'Creative', 'General'].map(mode => (
                      <TableRow key={mode} style={{ borderBottom: '1px solid var(--border-dim)' }} className="hover:bg-[rgba(255,255,255,0.03)] border-none">
                        <TableCell className="font-medium text-[var(--text-secondary)] pl-6">{mode}</TableCell>
                        <TableCell className="font-mono text-[var(--text-secondary)]">12</TableCell>
                        <TableCell className="font-mono text-[var(--score-positive)]">+45</TableCell>
                        <TableCell className="font-mono text-[var(--score-positive)]">+82</TableCell>
                        <TableCell className="font-mono text-[var(--text-secondary)] pr-6">88</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </GlassCard>
            </TabsContent>
            
            {/* Other tabs can be empty placeholders for now */}
            <TabsContent value="by-mode">
              <GlassCard>
                <p className="text-[var(--text-secondary)]">Detailed mode breakdown coming soon.</p>
              </GlassCard>
            </TabsContent>
            <TabsContent value="by-platform">
              <GlassCard>
                <p className="text-[var(--text-secondary)]">Detailed platform breakdown coming soon.</p>
              </GlassCard>
            </TabsContent>
            <TabsContent value="trends">
              <GlassCard>
                <p className="text-[var(--text-secondary)]">Historical trends coming soon.</p>
              </GlassCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  )
}
