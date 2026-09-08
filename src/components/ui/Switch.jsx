export default function Switch({ checked, onChange, label, description, id }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4">
      <span className="min-w-0">
        {label && <span className="block text-sm font-medium text-fg">{label}</span>}
        {description && <span className="mt-0.5 block text-[12px] text-fg-mute">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`ring-focus relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-brand' : 'bg-surface-hi'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? '-translate-x-0.5' : '-translate-x-[1.375rem]'
          }`}
        />
      </button>
    </label>
  )
}
