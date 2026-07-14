interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-8 text-center rounded-xl"
      style={{
        background: 'var(--surface-inset)',
        border: '1px solid var(--border-dim)',
      }}
    >
      {icon && (
        <div className="mb-4" style={{ color: 'var(--text-quaternary)' }}>
          {icon}
        </div>
      )}
      <p style={{ fontSize: 'var(--text-subhead)', color: 'var(--text-secondary)', fontWeight: 500 }}>
        {title}
      </p>
      <p style={{ fontSize: 'var(--text-footnote)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
        {description}
      </p>
      {action && <div style={{ marginTop: 'var(--space-5)' }}>{action}</div>}
    </div>
  )
}
