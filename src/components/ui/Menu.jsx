import { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'

/**
 * Lightweight dropdown. `items`: [{ label, icon, onClick, tone }] — a null entry
 * renders a divider.
 */
export default function Menu({ items = [], label = 'خيارات', align = 'end' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="ring-focus grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface-hi text-fg-dim transition-colors hover:bg-line hover:text-fg"
      >
        <MoreVertical className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute ${align === 'end' ? 'left-0' : 'right-0'} z-30 mt-1.5 w-56 animate-scale-in overflow-hidden rounded-xl border border-line bg-surface shadow-pop`}
        >
          {items.map((it, i) =>
            it === null ? (
              <div key={i} className="my-1 border-t border-line" />
            ) : (
              <button
                key={i}
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  it.onClick?.()
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-right text-[13px] transition-colors hover:bg-surface-hi ${
                  it.tone === 'danger' ? 'text-danger-bright' : 'text-fg-dim hover:text-fg'
                }`}
              >
                {it.icon && <it.icon className="h-4 w-4 shrink-0" aria-hidden />}
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
