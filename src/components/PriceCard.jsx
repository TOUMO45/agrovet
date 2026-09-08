import { useState } from 'react'
import { Check, Pencil, Tag, X } from 'lucide-react'
import Sparkline from './Sparkline'
import Button from './ui/Button'
import { formatDZD, formatRelative } from '../utils/format'

export default function PriceCard({ price, history = [], onSave, className = '' }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  const open = () => {
    setValue(price ? String(price) : '')
    setEditing(true)
  }

  const save = async () => {
    const n = Number(value)
    if (!value || Number.isNaN(n) || n <= 0) return
    setBusy(true)
    const ok = await onSave(n)
    setBusy(false)
    if (ok) setEditing(false)
  }

  // history comes newest-first from Firestore; sparkline wants oldest-first
  const series = [...history].reverse().map((h) => h.price)
  const lastChanged = history[0]?.date

  return (
    <div className={`rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px] font-medium text-fg-dim">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-brand-bright">
            <Tag className="h-[18px] w-[18px]" aria-hidden />
          </span>
          السعر الحالي · للكتكوت
        </span>
        {!editing && (
          <button
            onClick={open}
            className="ring-focus inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-brand-bright transition-colors hover:bg-brand/10"
          >
            <Pencil className="h-3.5 w-3.5" />
            تعديل
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              className="field tnum pl-14 text-lg font-bold"
              min="0.01"
              step="0.01"
              placeholder="0"
              autoFocus
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-fg-mute">
              د.ج
            </span>
          </div>
          <Button size="sm" variant="primary" icon={Check} onClick={save} disabled={busy}>
            حفظ
          </Button>
          <Button size="sm" variant="ghost" icon={X} onClick={() => setEditing(false)} aria-label="إلغاء" />
        </div>
      ) : (
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="tnum text-3xl font-bold text-brand-bright sm:text-[34px] sm:leading-10">
              {formatDZD(price)}
            </p>
            {lastChanged && (
              <p className="mt-1 text-[12px] text-fg-mute">آخر تحديث {formatRelative(lastChanged)}</p>
            )}
          </div>
          <Sparkline data={series} width={110} height={40} className="mb-1 shrink-0" />
        </div>
      )}
    </div>
  )
}
