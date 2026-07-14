import { cn } from '@/lib/utils'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  inset?: boolean
  noPad?: boolean
}

export function GlassCard({
  children, className, elevated, inset, noPad, style, ...props
}: GlassCardProps) {
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        borderRadius: 'var(--radius-xl)',
        background: inset
          ? 'rgba(0,0,0,0.35)'
          : elevated
            ? 'rgba(255,255,255,0.055)'
            : 'rgba(255,255,255,0.038)',
        border: inset
          ? '1px solid rgba(255,255,255,0.03)'
          : '1px solid rgba(255,255,255,0.06)',
        boxShadow: elevated
          ? '0 2px 4px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.4)'
          : '0 1px 1px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
        padding: noPad ? 0 : 'var(--space-6)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
