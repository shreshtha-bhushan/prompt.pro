interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between px-8 pt-8 pb-6">
      <div>
        {eyebrow && (
          <p style={{
            fontSize: 'var(--text-micro)',
            color: 'var(--text-tertiary)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)',
            marginBottom: 'var(--space-1)',
            fontWeight: 500,
          }}>
            {eyebrow}
          </p>
        )}
        <h1 style={{
          fontSize: 'var(--text-title-1)',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.025em',
          lineHeight: 1.15,
          margin: 0,
        }}>
          {title}
        </h1>
        {description && (
          <p style={{
            fontSize: 'var(--text-subhead)',
            color: 'var(--text-tertiary)',
            marginTop: 'var(--space-2)',
          }}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0 ml-6">{action}</div>}
    </div>
  )
}
