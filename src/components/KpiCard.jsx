const ACCENTS = {
  brand: 'bg-brand/15 text-brand-bright',
  info: 'bg-info/15 text-info',
  warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger-bright',
  neutral: 'bg-surface-hi text-fg-dim',
}

export default function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'neutral',
  className = '',
  onClick,
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`rounded-2xl border border-line bg-surface p-4 text-right shadow-card sm:p-5 ${
        onClick
          ? 'ring-focus w-full transition-colors hover:border-line/70 hover:bg-surface-hi/40'
          : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-fg-dim">{label}</span>
        {Icon && (
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${ACCENTS[accent]}`}>
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
        )}
      </div>
      <p className="tnum mt-3 text-2xl font-bold text-fg sm:text-[28px] sm:leading-9">{value}</p>
      {sub && <p className="mt-1 text-[12px] text-fg-mute">{sub}</p>}
    </Tag>
  )
}
