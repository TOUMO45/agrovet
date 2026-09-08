import { Check, Phone, Pencil, Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import Badge from './ui/Badge'
import IconButton from './ui/IconButton'
import { formatDate, formatDZD, formatNumber } from '../utils/format'
import { isValidDzMobile, toLocal } from '../utils/phone'

function PhoneCell({ value }) {
  const local = toLocal(value)
  if (!isValidDzMobile(value)) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-warn">
        <AlertTriangle className="h-3.5 w-3.5" />
        {value || '—'} · غير صالح
      </span>
    )
  }
  return (
    <a
      href={`tel:${local}`}
      className="ring-focus tnum inline-flex items-center gap-1.5 rounded-md text-[13px] text-fg-dim transition-colors hover:text-brand-bright"
      dir="ltr"
    >
      <Phone className="h-3.5 w-3.5" />
      {local}
    </a>
  )
}

export default function OrdersTable({
  orders,
  mode = 'active',
  selectedIds = [],
  allSelected = false,
  onToggle,
  onToggleAll,
  onConfirm,
  onEdit,
  onDelete,
  onRestore,
}) {
  const isArchive = mode === 'archive'
  const selectable = typeof onToggle === 'function'

  return (
    <table className="w-full border-separate border-spacing-0 text-sm">
      <thead>
        <tr className="text-right [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:border-b [&>th]:border-line [&>th]:bg-surface [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-[12px] [&>th]:font-semibold [&>th]:text-fg-mute">
          {selectable && (
            <th className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="h-4 w-4 rounded border-line bg-surface-hi text-brand focus:ring-brand/40"
                aria-label="تحديد الكل"
              />
            </th>
          )}
          {!isArchive && <th className="w-12">مؤكد</th>}
          <th>العميل</th>
          <th>الهاتف</th>
          <th>التاريخ</th>
          <th className="text-left">الكمية</th>
          <th className="text-left">الإجمالي</th>
          <th>ملاحظات</th>
          <th className="w-24 text-center">إجراءات</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => {
          const selected = selectedIds.includes(o.id)
          return (
            <tr
              key={o.id}
              className={`group transition-colors [&>td]:border-b [&>td]:border-line/60 [&>td]:px-3 [&>td]:py-3 ${
                o.confirmed ? 'bg-brand/[0.06]' : 'odd:bg-white/[0.015]'
              } hover:bg-surface-hi/60`}
            >
              {selectable && (
                <td>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle(o.id)}
                    className="h-4 w-4 rounded border-line bg-surface-hi text-brand focus:ring-brand/40"
                    aria-label={`تحديد طلب ${o.customerName}`}
                  />
                </td>
              )}

              {!isArchive && (
                <td>
                  <button
                    onClick={() => onConfirm(o, !o.confirmed)}
                    aria-pressed={o.confirmed}
                    aria-label={o.confirmed ? 'إلغاء التأكيد' : 'تأكيد الطلب'}
                    className={`ring-focus grid h-6 w-6 place-items-center rounded-full border transition-colors ${
                      o.confirmed
                        ? 'border-brand bg-brand text-brand-ink'
                        : 'border-line text-transparent hover:border-brand-bright hover:text-brand-bright/40'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                </td>
              )}

              <td>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-fg">{o.customerName || '—'}</span>
                  {isArchive && o.confirmed && (
                    <Badge tone="brand">
                      <Check className="h-3 w-3" strokeWidth={3} />
                      مؤكد
                    </Badge>
                  )}
                </div>
              </td>

              <td>
                <PhoneCell value={o.phoneNumber} />
              </td>

              <td className="tnum whitespace-nowrap text-[13px] text-fg-dim">
                {formatDate(o.date)}
              </td>

              <td className="tnum text-left text-[13px] text-fg">{formatNumber(o.quantity)}</td>

              <td className="tnum whitespace-nowrap text-left font-semibold text-brand-bright">
                {formatDZD(o.totalPrice)}
              </td>

              <td className="max-w-[180px] truncate text-[13px] text-fg-mute" title={o.notes}>
                {o.notes || '—'}
              </td>

              <td>
                <div className="flex items-center justify-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                  {isArchive ? (
                    <IconButton
                      icon={RotateCcw}
                      tone="brand"
                      size="sm"
                      label="إعادة إلى القائمة"
                      onClick={() => onRestore(o)}
                    />
                  ) : (
                    <IconButton
                      icon={Pencil}
                      tone="info"
                      size="sm"
                      label="تعديل"
                      onClick={() => onEdit(o)}
                    />
                  )}
                  <IconButton
                    icon={Trash2}
                    tone="danger"
                    size="sm"
                    label="حذف"
                    onClick={() => onDelete(o)}
                  />
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
