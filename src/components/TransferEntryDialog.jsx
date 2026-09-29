import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, ClipboardList, Home } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { formatDate, formatInt } from '../utils/format'

export const HOME_TARGET = 'home'

function TargetOption({ active, icon: Icon, title, meta, disabled, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onSelect}
      className={`ring-focus flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-right transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        active ? 'border-brand bg-brand/10 text-fg' : 'border-line bg-night-raised text-fg-dim hover:bg-surface-hi'
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          active ? 'bg-brand text-brand-ink' : 'bg-surface-hi text-fg-mute'
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{title}</span>
        {meta && <span className="tnum block text-[11px] text-fg-mute">{meta}</span>}
      </span>
    </button>
  )
}

/**
 * Move one client entry out of its current list — either to the home orders
 * page or into another open list (capacity permitting). The whole entry moves;
 * its quantity is freed from the source list. `onSave(target)` returns truthy
 * on success; `target` is `'home'` or a list id.
 */
export default function TransferEntryDialog({ entry, currentList, lists = [], onClose, onSave }) {
  const open = Boolean(entry)
  const [target, setTarget] = useState(HOME_TARGET)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const otherLists = useMemo(
    () => lists.filter((l) => !l.archived && l.id !== currentList?.id),
    [lists, currentList],
  )

  useEffect(() => {
    if (!entry) return
    setTarget(HOME_TARGET)
    setErr('')
  }, [entry])

  if (!entry) return null

  const qty = Number(entry.quantity) || 0
  const targetList = target === HOME_TARGET ? null : otherLists.find((l) => l.id === target) || null
  const fits = !targetList || qty <= targetList.remaining

  const submit = async () => {
    setErr('')
    if (!fits) return setErr(`تم بلوغ الحدّ الأقصى للائحة الوجهة — الباقي ${formatInt(targetList.remaining)} فقط`)
    setSaving(true)
    const ok = await onSave(target)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="نقل العميل"
      subtitle={`${entry.clientName} · ${formatInt(qty)}`}
      icon={ArrowRightLeft}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-[13px] text-fg-dim">
          سيُنقل العميل بكامل كميته من «{currentList?.title || formatDate(currentList?.date)}» وتُعاد{' '}
          {formatInt(qty)} إلى سعتها.
        </p>

        <div role="radiogroup" aria-label="الوجهة" className="space-y-2">
          <TargetOption
            active={target === HOME_TARGET}
            onSelect={() => setTarget(HOME_TARGET)}
            icon={Home}
            title="الصفحة الرئيسية (الطلبات)"
            meta="يُضاف كطلب جديد بالسعر الحالي"
          />
          {otherLists.length > 0 && (
            <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-fg-mute">
              أو إلى لائحة أخرى
            </p>
          )}
          {otherLists.map((l) => {
            const full = qty > l.remaining
            return (
              <TargetOption
                key={l.id}
                active={target === l.id}
                onSelect={() => setTarget(l.id)}
                icon={ClipboardList}
                title={l.title || formatDate(l.date)}
                meta={`${formatDate(l.date)} — باقي ${formatInt(l.remaining)}${full ? ' (لا يتّسع)' : ''}`}
                disabled={full}
              />
            )
          })}
        </div>

        {err && <p className="text-[12px] text-danger-bright">{err}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="button" icon={ArrowRightLeft} onClick={submit} disabled={saving || !fits}>
            {saving ? '...' : 'نقل'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
