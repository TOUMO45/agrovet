import { Check, Phone, Pencil, Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import Badge from './ui/Badge'
import IconButton from './ui/IconButton'
import { formatDate, formatDZD, formatNumber } from '../utils/format'
import { isValidDzMobile, toLocal } from '../utils/phone'

/**
 * Mobile row for one order. Two tight lines: identity + actions on top,
 * phone · date · quantity · total underneath. Confirmed rows get a brand
 * edge and a faint tint.
 */
export default function OrderCard({
  order: o,
  mode = 'active',
  selected = false,
  onToggle,
  onConfirm,
  onEdit,
  onDelete,
  onRestore,
}) {
  const isArchive = mode === 'archive'
  const selectable = typeof onToggle === 'function'
  const validPhone = isValidDzMobile(o.phoneNumber)
  const local = toLocal(o.phoneNumber)
  const indent = selectable ? 'ps-6' : ''

  return (
    <div
      className={`rounded-xl border bg-surface px-3 py-2.5 transition-colors ${
        o.confirmed ? 'border-line border-r-2 border-r-brand bg-brand/[0.05]' : 'border-line'
      } ${selected ? 'ring-2 ring-brand/50' : ''}`}
    >
      {/* line 1 — checkbox · name · status · actions */}
      <div className="flex items-center gap-2">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(o.id)}
            className="h-4 w-4 shrink-0 rounded border-line bg-surface-hi text-brand focus:ring-brand/40"
            aria-label={`تحديد طلب ${o.customerName}`}
          />
        )}

        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-fg">
          {o.customerName || '—'}
        </p>

        {!isArchive ? (
          <button
            onClick={() => onConfirm(o, !o.confirmed)}
            aria-pressed={o.confirmed}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              o.confirmed
                ? 'border-brand bg-brand text-brand-ink'
                : 'border-line text-fg-dim hover:border-brand-bright hover:text-brand-bright'
            }`}
          >
            <Check className="h-3 w-3" strokeWidth={3} />
            {o.confirmed ? 'مؤكد' : 'تأكيد'}
          </button>
        ) : (
          o.confirmed && (
            <Badge tone="brand">
              <Check className="h-3 w-3" strokeWidth={3} />
              مؤكد
            </Badge>
          )
        )}

        <div className="flex shrink-0 items-center">
          {isArchive ? (
            <IconButton icon={RotateCcw} tone="brand" size="sm" label="إعادة" onClick={() => onRestore(o)} />
          ) : (
            <IconButton icon={Pencil} tone="info" size="sm" label="تعديل" onClick={() => onEdit(o)} />
          )}
          <IconButton icon={Trash2} tone="danger" size="sm" label="حذف" onClick={() => onDelete(o)} />
        </div>
      </div>

      {/* line 2 — phone · date · quantity · total */}
      <div className={`mt-1 flex items-center justify-between gap-2 text-[12px] ${indent}`}>
        <div className="flex min-w-0 items-center gap-1.5 text-fg-mute">
          {validPhone ? (
            <a
              href={`tel:${local}`}
              dir="ltr"
              className="tnum inline-flex items-center gap-1 truncate hover:text-brand-bright"
            >
              <Phone className="h-3 w-3 shrink-0" />
              {local}
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-warn">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              رقم غير صالح
            </span>
          )}
          <span aria-hidden className="text-fg-mute/50">·</span>
          <span className="tnum whitespace-nowrap">{formatDate(o.date)}</span>
        </div>

        <div className="tnum shrink-0 whitespace-nowrap text-fg-dim">
          {formatNumber(o.quantity)}
          <span className="text-fg-mute"> · </span>
          <span className="font-bold text-brand-bright">{formatDZD(o.totalPrice)}</span>
        </div>
      </div>

      {o.notes && (
        <p className={`mt-1 line-clamp-1 text-[12px] leading-5 text-fg-dim ${indent}`}>{o.notes}</p>
      )}
    </div>
  )
}
