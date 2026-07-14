export function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 'var(--text-micro)',
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.09em',
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
      margin: 0,
    }}>
      {children}
    </p>
  )
}
