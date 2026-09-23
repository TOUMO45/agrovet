import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Pencil,
  Phone,
  RotateCcw,
  Tag,
  Trash2,
  Undo2,
} from 'lucide-react'
import IconButton from './ui/IconButton'
import { formatDate, formatDZD, formatInt, orderUnitPrice } from '../utils/format'
import { isValidDzMobile, toLocal } from '../utils/phone'

function SmallBtn({ icon: Icon, tone, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
        tone === 'danger'
          ? 'border-danger/30 text-danger-bright hover:bg-danger/10'
          : 'border-line text-fg-dim hover:bg-surface-hi hover:text-fg'
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {children}
    </button>
  )
}

/**
 * Compact, tap-to-expand order row. One line collapsed (name · qty · total ·
 * primary action); details + actions revealed on tap. `mode`:
 *  - active  → pending order awaiting "تم البيع"
 *  - sold    → completed sale (Sales page)
 *  - archive → archived pending order
 */
export default function OrderCard({
  order: o,
  mode = 'active',
  selected = false,
  onToggle,
  onSell,
  onConfirm,
  onEdit,
  onPrice,
  onDelete,
  onRestore,
  onUndoSale,
  onAddToList,
}) {
  const [open, setOpen] = useState(false)
  const isActive = mode === 'active'
  const isSold = mode === 'sold'
  const isArchive = mode === 'archive'
  const selectable = typeof onToggle === 'function'
  const validPhone = isValidDzMobile(o.phoneNumber)
  const local = toLocal(o.phoneNumber)
  const unit = orderUnitPrice(o)

  return (
    <div
      className={`overflow-hidden rounded-lg border transition-colors ${
        isActive && o.confirmed
          ? 'border-brand/50 border-r-4 border-r-brand bg-brand/[0.12]'
          : isSold
            ? 'border-brand/25 bg-surface'
            : 'border-line bg-surface'
      } ${selected ? 'ring-2 ring-brand/50' : ''}`}
    >
      {/* collapsed line */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(o.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 shrink-0 rounded border-line bg-surface-hi text-brand focus:ring-brand/40"
            aria-label={`تحديد طلب ${o.customerName}`}
          />
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-right"
          aria-expanded={open}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-fg-mute transition-transform ${open ? 'rotate-180' : ''}`}
          />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-fg">
            {o.customerName || '—'}
          </span>
          {isActive && o.confirmed && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-bright">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
              مؤكّد
            </span>
          )}
          {isActive && o.priceOverridden && (
            <Tag className="h-3 w-3 shrink-0 text-warn" title="سعر مخصّص" aria-label="سعر مخصّص" />
          )}
          <span className="tnum shrink-0 text-[12px] text-fg-dim">
            {formatInt(o.quantity)}
            <span className="text-fg-mute">×</span>
          </span>
          <span className="tnum shrink-0 text-[12.5px] font-bold text-brand-bright">
            {formatDZD(o.totalPrice)}
          </span>
        </button>

        {isActive && (
          <button
            type="button"
            onClick={() => onSell?.(o)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand px-2 py-1 text-[11px] font-bold text-brand-ink transition-colors hover:bg-brand-bright"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
            تم البيع
          </button>
        )}
        {isArchive && (
          <IconButton
            icon={RotateCcw}
            tone="brand"
            size="sm"
            label="إعادة إلى القائمة"
            onClick={() => onRestore?.(o)}
          />
        )}
        {isSold && (
          <span className="tnum shrink-0 whitespace-nowrap text-[11px] text-fg-mute">
            {formatDate(o.soldAt || o.date)}
          </span>
        )}
      </div>

      {/* expanded details */}
      {open && (
        <div className="space-y-1.5 border-t border-line/60 px-2.5 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-mute">
            {validPhone ? (
              <a
                href={`tel:${local}`}
                dir="ltr"
                className="tnum inline-flex items-center gap-1 hover:text-brand-bright"
              >
                <Phone className="h-3 w-3" />
                {local}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 text-warn">
                <AlertTriangle className="h-3 w-3" />
                {o.phoneNumber ? `${o.phoneNumber} · تحقّق منه` : 'لا يوجد رقم'}
              </span>
            )}
            <span className="tnum whitespace-nowrap">
              {isSold ? 'طلب ' : ''}
              {formatDate(o.date)}
            </span>
            <span className="tnum whitespace-nowrap">{formatDZD(unit)} / وحدة</span>
          </div>

          {o.notes && <p className="text-[12px] leading-5 text-fg-dim">{o.notes}</p>}

          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            {isActive && (
              <>
                <SmallBtn icon={ClipboardList} onClick={() => onAddToList?.(o)}>
                  إضافة إلى لائحة
                </SmallBtn>
                <SmallBtn icon={CircleDollarSign} onClick={() => onPrice?.(o)}>
                  تعديل السعر
                </SmallBtn>
                <SmallBtn icon={Pencil} onClick={() => onEdit?.(o)}>
                  تعديل
                </SmallBtn>
                <SmallBtn icon={Check} onClick={() => onConfirm?.(o, !o.confirmed)}>
                  {o.confirmed ? 'إلغاء التأكيد' : 'تأكيد الطلب'}
                </SmallBtn>
                <SmallBtn icon={Trash2} tone="danger" onClick={() => onDelete?.(o)}>
                  حذف
                </SmallBtn>
              </>
            )}
            {isSold && (
              <>
                <SmallBtn icon={Undo2} onClick={() => onUndoSale?.(o)}>
                  إرجاع
                </SmallBtn>
                <SmallBtn icon={Trash2} tone="danger" onClick={() => onDelete?.(o)}>
                  حذف السجل
                </SmallBtn>
              </>
            )}
            {isArchive && (
              <SmallBtn icon={Trash2} tone="danger" onClick={() => onDelete?.(o)}>
                حذف نهائي
              </SmallBtn>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
