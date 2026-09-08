const TONES = {
  neutral: 'bg-surface-hi text-fg-dim',
  brand: 'bg-brand/15 text-brand-bright',
  info: 'bg-info/15 text-info',
  warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger-bright',
}

export default function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5 ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
