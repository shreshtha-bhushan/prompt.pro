import { PageHeader } from '@/components/ui/PageHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { PageTransition } from '@/components/layout/PageTransition'
import { Separator } from '@/components/ui/separator'
import { ShieldCheck, Zap, Lock, ExternalLink, MessageSquare } from 'lucide-react'

function FeatureRow({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex gap-4 py-4"
      style={{ borderBottom: '1px solid var(--border-dim)' }}>
      <div style={{
        width: '32px', height: '32px',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        color: 'var(--text-secondary)',
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 'var(--text-subhead)', color: 'var(--text-primary)', fontWeight: 500 }}>
          {title}
        </p>
        <p style={{ fontSize: 'var(--text-footnote)', color: 'var(--text-tertiary)', marginTop: '2px', lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
    </div>
  )
}

export default function AboutPage() {
  return (
    <PageTransition>
      <div className="min-h-screen pb-12 flex flex-col items-center">
        <div className="w-full max-w-[560px]">
          <PageHeader title="About" eyebrow="PromptPro v0.1.0" />

          <div className="flex flex-col gap-6 px-8 pb-12">
            
            {/* Version Info */}
            <GlassCard className="flex flex-col items-center text-center pt-8">
              <div
                className="w-12 h-12 rounded-lg mb-4 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.90)' }}
              />
              <h2 style={{ fontSize: 'var(--text-title-3)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                PromptPro
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.08)] text-[var(--text-secondary)] font-mono text-[11px] uppercase tracking-wider">
                  Version 0.1.0-beta
                </span>
                <span className="text-[var(--text-tertiary)] font-mono text-[11px]">
                  Build 2026.06.22
                </span>
              </div>
              
              <Separator className="my-6 bg-[rgba(255,255,255,0.08)]" />
              
              <div className="w-full flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)] text-[var(--text-footnote)]">Browser Extension</span>
                  <span className="text-[var(--score-positive)] font-mono text-[11px] uppercase tracking-wider">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)] text-[var(--text-footnote)]">Dashboard Servers</span>
                  <span className="text-[var(--score-positive)] font-mono text-[11px] uppercase tracking-wider">Operational</span>
                </div>
              </div>
            </GlassCard>

            {/* Features */}
            <GlassCard noPad>
              <div className="px-6 py-2">
                <FeatureRow
                  icon={<Zap size={16} />}
                  title="Real-time Upgrades"
                  description="Instantly intercepts and refines your prompts before they hit LLM servers."
                />
                <FeatureRow
                  icon={<ShieldCheck size={16} />}
                  title="No-Fluff Engineering"
                  description="Strips conversational padding, apologetic tone, and redundant context."
                />
                <FeatureRow
                  icon={<Lock size={16} />}
                  title="Privacy First"
                  description="Upgrades run locally on your browser. Your prompts are never used for training."
                />
              </div>
            </GlassCard>

            {/* Links */}
            <GlassCard className="flex flex-col gap-2 py-4">
              <a href="#" className="flex items-center justify-between py-2 text-[var(--text-secondary)] hover:text-white transition-colors group">
                <span className="text-[var(--text-subhead)] font-medium">Documentation</span>
                <ExternalLink size={16} className="text-[var(--text-tertiary)] group-hover:text-white transition-colors" />
              </a>
              <Separator className="bg-[rgba(255,255,255,0.04)]" />
              <a href="#" className="flex items-center justify-between py-2 text-[var(--text-secondary)] hover:text-white transition-colors group">
                <span className="text-[var(--text-subhead)] font-medium">Privacy Policy</span>
                <ExternalLink size={16} className="text-[var(--text-tertiary)] group-hover:text-white transition-colors" />
              </a>
              <Separator className="bg-[rgba(255,255,255,0.04)]" />
              <a href="#" className="flex items-center justify-between py-2 text-[var(--text-secondary)] hover:text-white transition-colors group">
                <span className="text-[var(--text-subhead)] font-medium">Beta Feedback</span>
                <MessageSquare size={16} className="text-[var(--text-tertiary)] group-hover:text-white transition-colors" />
              </a>
            </GlassCard>

          </div>
        </div>
      </div>
    </PageTransition>
  )
}
