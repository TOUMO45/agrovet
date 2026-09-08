/** iOS-style segmented control. `options`: [{ value, label }]. */
export default function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div
      role="tablist"
      className={`inline-flex rounded-xl border border-line bg-night-raised p-1 ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`ring-focus flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active ? 'bg-brand text-brand-ink shadow-sm' : 'text-fg-dim hover:text-fg'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
