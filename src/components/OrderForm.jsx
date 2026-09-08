import { useEffect, useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import Field from './ui/Field'
import Button from './ui/Button'
import { formatDZD, orderUnitPrice } from '../utils/format'
import { isValidDzMobile } from '../utils/phone'

/**
 * Add / edit form for a single order. Purely controlled: it validates, then
 * calls `onSubmit(payload)` and lets the parent decide add vs. update.
 */
export default function OrderForm({ currentPrice = 0, initialData, onSubmit, onClose }) {
  const isEdit = Boolean(initialData)
  const [customerName, setCustomerName] = useState(initialData?.customerName || '')
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '')
  const [quantity, setQuantity] = useState(
    initialData?.quantity != null ? String(initialData.quantity) : '',
  )
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!initialData) return
    setCustomerName(initialData.customerName)
    setPhoneNumber(initialData.phoneNumber)
    setQuantity(String(initialData.quantity))
    setNotes(initialData.notes || '')
  }, [initialData])

  const unitPrice =
    isEdit && initialData.confirmed
      ? orderUnitPrice(initialData, currentPrice)
      : Number(currentPrice) || 0
  const qtyNum = parseInt(quantity, 10)
  const previewTotal = Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum * unitPrice : 0

  const phoneWarn = useMemo(
    () => phoneNumber.trim() && !isValidDzMobile(phoneNumber),
    [phoneNumber],
  )

  const validate = () => {
    const e = {}
    if (!customerName.trim()) e.customerName = 'اسم العميل مطلوب'
    if (!phoneNumber.trim()) e.phoneNumber = 'رقم الهاتف مطلوب'
    if (!quantity || parseInt(quantity, 10) <= 0) e.quantity = 'الكمية يجب أن تكون أكبر من 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!validate()) return
    setSaving(true)
    try {
      await onSubmit({
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        quantity: parseInt(quantity, 10),
        notes: notes.trim(),
      })
      onClose?.()
    } catch (err) {
      console.error('Error submitting order:', err)
      setFormError(err?.message || 'حدث خطأ أثناء حفظ الطلب')
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
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        error={errors.customerName}
        autoFocus
      />

      <Field
        label="رقم الهاتف"
        type="tel"
        inputMode="tel"
        dir="ltr"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        error={errors.phoneNumber}
        hint={phoneWarn ? undefined : 'مثال: 0668000000'}
      />
      {phoneWarn && !errors.phoneNumber && (
        <p className="-mt-2 text-[12px] text-warn">
          رقم غير معتاد — لن يستقبل الرسائل الجماعية إن لم يكن صحيحاً.
        </p>
      )}

      <Field
        label="الكمية"
        type="number"
        inputMode="numeric"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        error={errors.quantity}
      />

      <Field
        as="textarea"
        rows={2}
        label="ملاحظات"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex items-center justify-between rounded-xl border border-line bg-night-raised px-4 py-3 text-[13px]">
        <span className="tnum text-fg-dim">
          {formatDZD(unitPrice)} × {Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 0}
        </span>
        <span className="tnum text-base font-bold text-brand-bright">{formatDZD(previewTotal)}</span>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'جاري الحفظ...' : isEdit ? 'تحديث الطلب' : 'إضافة الطلب'}
        </Button>
      </div>
    </form>
  )
}
