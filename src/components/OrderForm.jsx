import { useEffect, useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import Field from './ui/Field'
import Button from './ui/Button'
import Switch from './ui/Switch'
import { formatDZD, orderUnitPrice } from '../utils/format'
import { isValidDzMobile, normalizePhone } from '../utils/phone'

/**
 * Add / edit form for a single order. Purely controlled: it validates, then
 * calls `onSubmit(payload)` and lets the parent decide add vs. update.
 * A per-client price can be set here; when off, the order tracks the global price.
 */
export default function OrderForm({ currentPrice = 0, initialData, onSubmit, onClose }) {
  const isEdit = Boolean(initialData)
  const priceLocked = isEdit && initialData.confirmed
  const [customerName, setCustomerName] = useState(initialData?.customerName || '')
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '')
  const [quantity, setQuantity] = useState(
    initialData?.quantity != null ? String(initialData.quantity) : '',
  )
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [customPrice, setCustomPrice] = useState(Boolean(initialData?.priceOverridden))
  const [priceInput, setPriceInput] = useState(
    initialData?.priceOverridden ? String(orderUnitPrice(initialData, currentPrice)) : '',
  )
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!initialData) return
    setCustomerName(initialData.customerName)
    setPhoneNumber(initialData.phoneNumber)
    setQuantity(String(initialData.quantity))
    setNotes(initialData.notes || '')
    setCustomPrice(Boolean(initialData.priceOverridden))
    setPriceInput(
      initialData.priceOverridden ? String(orderUnitPrice(initialData, currentPrice)) : '',
    )
  }, [initialData, currentPrice])

  const priceNum = Number(priceInput)
  const unitPrice = priceLocked
    ? orderUnitPrice(initialData, currentPrice)
    : customPrice && Number.isFinite(priceNum) && priceNum > 0
      ? priceNum
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
    if (!priceLocked && customPrice && (!priceInput || !(priceNum > 0)))
      e.price = 'أدخل سعراً صحيحاً أو أوقف السعر المخصّص'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!validate()) return
    setSaving(true)
    try {
      // Store the number in a canonical local form when it parses as a DZ
      // mobile (+213…, Arabic digits, spaces all normalise here); otherwise
      // keep whatever the user typed so nothing is silently lost.
      const typedPhone = phoneNumber.trim()
      const payload = {
        customerName: customerName.trim(),
        phoneNumber: isValidDzMobile(typedPhone) ? normalizePhone(typedPhone) : typedPhone,
        quantity: parseInt(quantity, 10),
        notes: notes.trim(),
      }
      if (!priceLocked) {
        if (customPrice) {
          payload.unitPrice = priceNum
          payload.priceOverridden = true
        } else {
          payload.priceOverridden = false
        }
      }
      await onSubmit(payload)
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
          تحقّق من الرقم — قد لا تصله الرسائل إن لم يكن رقم هاتف جزائري صحيح.
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

      {priceLocked ? (
        <p className="rounded-xl border border-line bg-night-raised px-4 py-3 text-[12px] leading-6 text-fg-mute">
          السعر مجمّد على <b className="tnum text-fg-dim">{formatDZD(unitPrice)}</b> لأن الطلب مؤكّد.
          ألغِ التأكيد لتعديله.
        </p>
      ) : (
        <div className="rounded-xl border border-line bg-night-raised p-3">
          <Switch
            id="order-custom-price"
            checked={customPrice}
            onChange={setCustomPrice}
            label="سعر مخصّص لهذا العميل"
            description={`بدون تخصيص يتبع السعر العام (${formatDZD(currentPrice)}).`}
          />
          {customPrice && (
            <div className="relative mt-3">
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="سعر الوحدة"
                className="field tnum pl-12"
                autoFocus
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-fg-mute">
                د.ج
              </span>
            </div>
          )}
          {errors.price && <p className="mt-1.5 text-[12px] text-danger-bright">{errors.price}</p>}
        </div>
      )}

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
