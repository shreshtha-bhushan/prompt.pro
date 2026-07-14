interface BigNumberProps {
  value: string | number
  unit?: string
  color?: string
}

export function BigNumber({ value, unit, color }: BigNumberProps) {
  return (
    <div className="flex items-baseline gap-1.5 mt-2">
      <span style={{
        fontSize: 'var(--text-large-title)',
        fontWeight: 700,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        color: color ?? 'var(--text-primary)',
        fontFamily: 'var(--font-geist-sans)',
      }}>
        {value}
      </span>
      {unit && (
        <span style={{
          fontSize: 'var(--text-subhead)',
          color: 'var(--text-tertiary)',
          fontWeight: 500,
        }}>
          {unit}
        </span>
      )}
    </div>
  )
}
