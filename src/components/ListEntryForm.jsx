import { useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import Field from './ui/Field'
import Button from './ui/Button'
import { formatInt } from '../utils/format'
import { isValidDzMobile, normalizePhone } from '../utils/phone'

/**
 * Add / edit a client entry inside a list. `maxQty` is the most this entry can
 * take without exceeding the list's remaining capacity (for a new entry that's
 * `list.remaining`; when editing, the entry's own current quantity is added
 * back in by the caller so it doesn't count against itself).
 */
export default function ListEntryForm({ initialData, maxQty, onSubmit, onClose }) {
  const isEdit = Boolean(initialData)
  const [clientName, setClientName] = useState(initialData?.clientName || '')
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '')
  const [quantity, setQuantity] = useState(
    initialData?.quantity != null ? String(initialData.quantity) : '',
  )
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const phoneWarn = useMemo(
    () => phoneNumber.trim() && !isValidDzMobile(phoneNumber),
    [phoneNumber],
  )

  const qtyNum = parseInt(quantity, 10)
  const limitExceeded = Number.isFinite(qtyNum) && qtyNum > 0 && qtyNum > maxQty

  const validate = () => {
    const e = {}
    if (!clientName.trim()) e.clientName = 'اسم العميل مطلوب'
    if (!quantity || parseInt(quantity, 10) <= 0) e.quantity = 'الكمية يجب أن تكون أكبر من 0'
    else if (parseInt(quantity, 10) > maxQty)
      e.quantity = `تم بلوغ الحدّ الأقصى للائحة — الباقي ${formatInt(maxQty)} فقط`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!validate()) return
    setSaving(true)
    try {
      const typedPhone = phoneNumber.trim()
      await onSubmit({
        clientName: clientName.trim(),
        phoneNumber: isValidDzMobile(typedPhone) ? normalizePhone(typedPhone) : typedPhone,
        quantity: parseInt(quantity, 10),
        notes: notes.trim(),
      })
      onClose?.()
    } catch (err) {
      console.error('Error submitting list entry:', err)
      setFormError(err?.message || 'حدث خطأ أثناء حفظ العميل')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-[13px] text-danger-bright">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <Field
        label="اسم العميل"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        error={errors.clientName}
        autoFocus
      />

      <Field
        label="رقم الهاتف (اختياري)"
        type="tel"
        inputMode="tel"
        dir="ltr"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        hint={phoneWarn ? undefined : 'مثال: 0668000000'}
      />
      {phoneWarn && (
        <p className="-mt-2 text-[12px] text-warn">تحقّق من الرقم — قد لا يكون رقم هاتف جزائري صحيح.</p>
      )}

      <Field
        label="الكمية"
        type="number"
        inputMode="numeric"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        error={errors.quantity}
        hint={errors.quantity ? undefined : `الباقي في اللائحة: ${formatInt(maxQty)}`}
      />
      {limitExceeded && !errors.quantity && (
        <p className="-mt-2 text-[12px] text-danger-bright">
          تم بلوغ الحدّ الأقصى للائحة — الباقي {formatInt(maxQty)} فقط.
        </p>
      )}

      <Field
        as="textarea"
        rows={2}
        label="ملاحظات (اختياري)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'جاري الحفظ...' : isEdit ? 'تحديث العميل' : 'إضافة العميل'}
        </Button>
      </div>
    </form>
  )
}
