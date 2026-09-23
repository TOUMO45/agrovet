import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import Modal from './ui/Modal'
import Field from './ui/Field'
import Button from './ui/Button'
import { TYPE_META } from './StockLedger'
import { formatInt } from '../utils/format'

/**
 * Edit one stock movement. What is editable depends on the entry type:
 *  - restock → received qty, dead-on-arrival, note (net = received − dead)
 *  - death   → dead count, note
 *  - adjust  → signed change, note
 *  - sale / return → note only (quantity is tied to the sale record)
 */
export default function EditMovementDialog({ movement, onClose, onSave }) {
  const [received, setReceived] = useState('')
  const [dead, setDead] = useState('')
  const [qty, setQty] = useState('')
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!movement) return
    setError('')
    setNote(movement.note || '')
    setReceived(String(movement.received || movement.delta + movement.dead || ''))
    setDead(String(movement.dead || ''))
    setQty(String(movement.dead || Math.abs(movement.delta) || ''))
    setDelta(String(movement.delta ?? ''))
  }, [movement])

  if (!movement) return null

  const meta = TYPE_META[movement.type] || TYPE_META.adjust
  const isRestock = movement.type === 'restock'
  const isDeath = movement.type === 'death'
  const isAdjust = movement.type === 'adjust'
  const noteOnly = movement.type === 'sale' || movement.type === 'return'

  const submit = async () => {
    setError('')
    const patch = { note: note.trim() }

    if (isRestock) {
      const recv = Math.round(Number(received))
      const deadN = Math.max(0, Math.round(Number(dead)) || 0)
      if (!Number.isFinite(recv) || recv <= 0) return setError('أدخل كمية مستلمة صحيحة')
      if (deadN > recv) return setError('عدد النافق أكبر من الكمية المستلمة')
      patch.received = recv
      patch.dead = deadN
      patch.delta = recv - deadN
    } else if (isDeath) {
      const n = Math.round(Number(qty))
      if (!Number.isFinite(n) || n <= 0) return setError('أدخل عدداً صحيحاً أكبر من 0')
      patch.dead = n
      patch.delta = -n
    } else if (isAdjust) {
      const d = Math.round(Number(delta))
      if (!Number.isFinite(d)) return setError('أدخل قيمة صحيحة')
      patch.delta = d
    }

    setBusy(true)
    const res = await onSave(patch)
    setBusy(false)
    if (res?.error) return setError(res.error)
    onClose()
  }

  const net = isRestock
    ? (Math.round(Number(received)) || 0) - (Math.max(0, Math.round(Number(dead)) || 0) || 0)
    : null

  return (
    <Modal
      isOpen={Boolean(movement)}
      onClose={onClose}
      title={`تعديل حركة · ${meta.label}`}
      icon={Pencil}
      size="sm"
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-[13px] text-danger-bright">
            {error}
          </div>
        )}

        {noteOnly && (
          <p className="rounded-xl border border-line bg-night-raised px-4 py-3 text-[12px] leading-6 text-fg-mute">
            هذه الحركة مرتبطة بعملية بيع، ولا يمكن تغيير كميتها من هنا. لعكس البيع استخدم «إرجاع» في
            صفحة المبيعات. يمكنك تعديل الملاحظة فقط.
          </p>
        )}

        {isRestock && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="الكمية المستلمة"
                type="number"
                inputMode="numeric"
                min="1"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                autoFocus
              />
              <Field
                label="منها نافقة"
                type="number"
                inputMode="numeric"
                min="0"
                value={dead}
                onChange={(e) => setDead(e.target.value)}
              />
            </div>
            <p className="-mt-1 text-[12px] text-fg-mute">
              الصافي المضاف للمخزون: <b className="tnum text-fg-dim">{formatInt(net)}</b>
            </p>
          </>
        )}

        {isDeath && (
          <Field
            label="عدد النافق"
            type="number"
            inputMode="numeric"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            autoFocus
          />
        )}

        {isAdjust && (
          <Field
            label="قيمة التعديل"
            type="number"
            inputMode="numeric"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            hint="رقم موجب يزيد المخزون، وسالب ينقصه."
            autoFocus
          />
        )}

        <Field
          as="textarea"
          rows={2}
          label="ملاحظة"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isRestock ? 'مثال: توريد من المفرخة' : 'اختياري'}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? '...' : 'حفظ'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
