import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info }
const ACCENT = {
  success: 'text-brand-bright',
  error: 'text-danger-bright',
  info: 'text-info',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = ++idRef.current
      setToasts((list) => [...list, { id, message, type }])
      if (duration) setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border border-line bg-surface-hi/95 p-3 shadow-pop backdrop-blur"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ACCENT[t.type] || ''}`} aria-hidden />
              <p className="flex-1 text-[13px] leading-6 text-fg">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="ring-focus -m-1 rounded-md p-1 text-fg-mute hover:text-fg"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
