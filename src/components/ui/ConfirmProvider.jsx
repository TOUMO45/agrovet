import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Button from './Button'

const ConfirmContext = createContext(() => Promise.resolve(false))

/** const confirm = useConfirm(); if (await confirm({ title, message, tone })) {...} */
export const useConfirm = () => useContext(ConfirmContext)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const resolverRef = useRef(null)

  const confirm = useCallback((opts) => {
    setState({
      title: 'تأكيد',
      message: '',
      confirmLabel: 'تأكيد',
      cancelLabel: 'إلغاء',
      tone: 'brand',
      ...opts,
    })
    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const close = (result) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-night/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm animate-scale-in rounded-2xl border border-line bg-surface p-5 shadow-pop"
          >
            <div className="flex items-start gap-3">
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  state.tone === 'danger'
                    ? 'bg-danger/15 text-danger-bright'
                    : 'bg-brand/15 text-brand-bright'
                }`}
              >
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-fg">{state.title}</h2>
                {state.message && (
                  <p className="mt-1 text-[13px] leading-6 text-fg-dim">{state.message}</p>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => close(false)}>
                {state.cancelLabel}
              </Button>
              <Button
                variant={state.tone === 'danger' ? 'danger-solid' : 'primary'}
                size="sm"
                onClick={() => close(true)}
                autoFocus
              >
                {state.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
