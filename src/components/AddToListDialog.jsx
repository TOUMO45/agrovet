import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import Modal from './ui/Modal'
import Field from './ui/Field'
import Button from './ui/Button'
import { formatDate, formatInt } from '../utils/format'

/**
 * Pushes one order (from the home order list) into a list's client entries,
 * respecting that list's remaining capacity. `onSave(listId, payload)` should
 * return truthy on success.
 */
export default function AddToListDialog({ order, lists = [], onClose, onSave }) {
  const open = Boolean(order)
  const [listId, setListId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!order) return
    setListId(lists[0]?.id || '')
    setQuantity(String(order.quantity || ''))
    setErr('')
  }, [order, lists])

  if (!order) return null

  const selectedList = lists.find((l) => l.id === listId) || null
  const qtyNum = parseInt(quantity, 10)
  const maxQty = selectedList?.remaining ?? 0
  const limitExceeded = selectedList && Number.isFinite(qtyNum) && qtyNum > 0 && qtyNum > maxQty

  const submit = async () => {
    setErr('')
    if (!listId) return setErr('اختر لائحة')
    if (!quantity || !(qtyNum > 0)) return setErr('أدخل كمية صحيحة أكبر من 0')
    if (qtyNum > maxQty) return setErr(`تم بلوغ الحدّ الأقصى للائحة — الباقي ${formatInt(maxQty)} فقط`)
    setSaving(true)
    const ok = await onSave(listId, {
      clientName: order.customerName,
      phoneNumber: order.phoneNumber,
      quantity: qtyNum,
      notes: order.notes,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="إضافة إلى لائحة"
      subtitle={order.customerName}
      icon={ClipboardList}
      size="sm"
    >
      <div className="space-y-4">
        {lists.length === 0 ? (
          <p className="rounded-xl border border-line bg-night-raised px-4 py-3 text-[13px] text-fg-mute">
            لا توجد لوائح بعد. أنشئ لائحة أولاً من صفحة «القوائم».
          </p>
        ) : (
          <>
            <Field as="select" label="اللائحة" value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title || formatDate(l.date)} — باقي {formatInt(l.remaining)}
                </option>
              ))}
            </Field>

            <Field
              label="الكمية"
              type="number"
              inputMode="numeric"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              hint={selectedList ? `الباقي في اللائحة: ${formatInt(maxQty)}` : undefined}
            />
            {limitExceeded && (
              <p className="-mt-2 text-[12px] text-danger-bright">
                تم بلوغ الحدّ الأقصى للائحة — الباقي {formatInt(maxQty)} فقط.
              </p>
            )}

            {err && <p className="text-[12px] text-danger-bright">{err}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={onClose}>
                إلغاء
              </Button>
              <Button type="button" onClick={submit} disabled={saving}>
                {saving ? '...' : 'إضافة'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
