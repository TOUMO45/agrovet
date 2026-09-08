import { useEffect } from 'react'
import { X } from 'lucide-react'

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  size = 'md',
  headerActions,
  children,
}) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/70 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[94vh] w-full ${SIZES[size]} animate-slide-up flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-pop sm:animate-scale-in sm:rounded-2xl`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* mobile grab handle */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-line" />
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-bright">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-fg">{title}</h2>
              {subtitle && <p className="mt-0.5 truncate text-[12px] text-fg-mute">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            <button
              onClick={onClose}
              className="ring-focus -m-1.5 rounded-lg p-1.5 text-fg-mute transition-colors hover:bg-surface-hi hover:text-fg"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  )
}
