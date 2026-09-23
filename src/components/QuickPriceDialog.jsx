import { useEffect, useState } from 'react'
import { CircleDollarSign } from 'lucide-react'
import Modal from './ui/Modal'
import Field from './ui/Field'
import Button from './ui/Button'
import { formatDZD, formatInt, orderUnitPrice } from '../utils/format'

/**
 * Small dialog to override (or reset) a single order's unit price before it is
 * sold. `onSave(patch)` should return truthy on success; patch is either
 * `{ unitPrice, priceOverridden: true }` or `{ priceOverridden: false }`.
 */
export default function QuickPriceDialog({ order, currentPrice = 0, onClose, onSave }) {
  const open = Boolean(order)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (order) {
      setValue(String(Math.round(orderUnitPrice(order, currentPrice))))
      setErr('')
    }
  }, [order, currentPrice])

  if (!order) return null

  const qty = Number(order.quantity) || 0
  const n = Number(value)
  const effective = Number.isFinite(n) && n > 0 ? n : orderUnitPrice(order, currentPrice)

  const submit = async (reset) => {
    setErr('')
    if (!reset && (!value || Number.isNaN(n) || n <= 0)) {
      setErr('أدخل سعراً صحيحاً')
      return
    }
    setBusy(true)
    const ok = await onSave(reset ? { priceOverridden: false } : { unitPrice: n, priceOverridden: true })
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="سعر العميل"
      subtitle={order.customerName}
      icon={CircleDollarSign}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-line bg-night-raised px-4 py-3 text-[13px]">
          <span className="text-fg-dim">السعر العام</span>
          <span className="tnum font-semibold text-fg">{formatDZD(currentPrice)}</span>
        </div>

        <Field
          label="سعر الوحدة لهذا العميل"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={err}
          hint={
            order.priceOverridden
              ? 'لهذا العميل سعر مخصّص حالياً.'
              : 'يصبح سعراً ثابتاً لا يتأثّر بتغيّر السعر العام.'
          }
          autoFocus
        />

        <div className="flex items-center justify-between rounded-xl border border-line bg-night-raised px-4 py-3 text-[13px]">
          <span className="tnum text-fg-dim">
            {formatDZD(effective)} × {formatInt(qty)}
          </span>
          <span className="tnum text-base font-bold text-brand-bright">
            {formatDZD(effective * qty)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {order.priceOverridden ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => submit(true)} disabled={busy}>
              إرجاع للسعر العام
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="button" onClick={() => submit(false)} disabled={busy}>
              {busy ? '...' : 'حفظ'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
