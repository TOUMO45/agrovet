import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import Field from './ui/Field'
import Button from './ui/Button'
import { dateToInputValue } from '../services/lists'

const todayInput = () => dateToInputValue(new Date().toISOString())

/**
 * Add / edit form for a list (a dated batch with a total quantity capacity).
 * `onSubmit({ title, date, quantity, notes })` — `date` is a "YYYY-MM-DD" string.
 */
export default function ListForm({ initialData, onSubmit, onClose }) {
  const isEdit = Boolean(initialData)
  const [title, setTitle] = useState(initialData?.title || '')
  const [date, setDate] = useState(
    initialData ? dateToInputValue(initialData.date) : todayInput(),
  )
  const [quantity, setQuantity] = useState(
    initialData?.quantity != null ? String(initialData.quantity) : '',
  )
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const e = {}
    if (!date) e.date = 'التاريخ مطلوب'
    if (!quantity || parseInt(quantity, 10) <= 0) e.quantity = 'الكمية يجب أن تكون أكبر من 0'
    if (isEdit && parseInt(quantity, 10) < initialData.usedQty)
      e.quantity = `لا يمكن أن تقل عن الكمية المستعملة حالياً (${initialData.usedQty})`
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
        title: title.trim(),
        date,
        quantity: parseInt(quantity, 10),
        notes: notes.trim(),
      })
      onClose?.()
    } catch (err) {
      console.error('Error submitting list:', err)
      setFormError(err?.message || 'حدث خطأ أثناء حفظ اللائحة')
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
        label="عنوان اللائحة (اختياري)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="مثال: شحنة الكتاكيت"
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="التاريخ"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
        />
        <Field
          label="الكمية الإجمالية"
          type="number"
          inputMode="numeric"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          error={errors.quantity}
        />
      </div>

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
          {saving ? 'جاري الحفظ...' : isEdit ? 'تحديث اللائحة' : 'إضافة اللائحة'}
        </Button>
      </div>
    </form>
  )
}
