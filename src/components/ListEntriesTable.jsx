import { AlertTriangle, Check, MessageSquare, Pencil, Phone, Trash2 } from 'lucide-react'
import IconButton from './ui/IconButton'
import { formatDate, formatInt } from '../utils/format'
import { isValidDzMobile, toLocal } from '../utils/phone'

/** Tap-to-call link, same behaviour as the home orders table. */
function PhoneLink({ value, small }) {
  if (!value) return <span className="text-fg-mute">—</span>
  const size = small ? 'text-[11px]' : 'text-[13px]'
  const icon = small ? 'h-3 w-3' : 'h-3.5 w-3.5'
  if (!isValidDzMobile(value)) {
    return (
      <span className={`tnum inline-flex items-center gap-1 ${size} text-warn`} dir="ltr">
        <AlertTriangle className={icon} aria-hidden />
        {value}
      </span>
    )
  }
  const local = toLocal(value)
  return (
    <a
      href={`tel:${local}`}
      className={`ring-focus tnum inline-flex items-center gap-1.5 rounded-md ${size} text-fg-dim transition-colors hover:text-brand-bright`}
      dir="ltr"
    >
      <Phone className={icon} aria-hidden />
      {local}
    </a>
  )
}

function ConfirmToggle({ entry, onConfirm }) {
  const on = entry.confirmed
  return (
    <button
      type="button"
      onClick={() => onConfirm(entry, !on)}
      aria-pressed={on}
      aria-label={on ? 'إلغاء التأكيد' : 'تأكيد الطلب النهائي'}
      title={on ? 'مؤكّد — اضغط للإلغاء' : 'تأكيد الطلب النهائي'}
      className={`ring-focus grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors ${
        on
          ? 'border-brand bg-brand text-brand-ink shadow-glow-brand'
          : 'border-line text-transparent hover:border-brand-bright hover:text-brand-bright/40'
      }`}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </button>
  )
}

function Actions({ entry, onEdit, onDelete, onSms, vertical }) {
  return (
    <div className={`flex ${vertical ? 'flex-col' : 'items-center justify-center'} gap-0.5`}>
      <IconButton
        icon={MessageSquare}
        tone="brand"
        size="sm"
        label="إرسال رسالة تذكير"
        onClick={() => onSms(entry)}
        disabled={!isValidDzMobile(entry.phoneNumber)}
        className="disabled:pointer-events-none disabled:opacity-30"
      />
      <IconButton icon={Pencil} size="sm" label="تعديل العميل" onClick={() => onEdit(entry)} />
      <IconButton
        icon={Trash2}
        tone="danger"
        size="sm"
        label="حذف العميل"
        onClick={() => onDelete(entry)}
      />
    </div>
  )
}

const confirmedRow = 'bg-brand/[0.13] shadow-[inset_-3px_0_0_0_#34D399]'

/** Client entries inside one list: table on desktop, card list on mobile. */
export default function ListEntriesTable({ entries, loading, onEdit, onDelete, onSms, onConfirm }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      {loading ? (
        <div className="space-y-2 p-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-surface-hi/50" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-fg-mute">لا يوجد عملاء في هذه اللائحة بعد</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="scroll-thin hidden overflow-x-auto md:block">
            <table className="w-full min-w-[620px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-right [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:border-b [&>th]:border-line [&>th]:bg-surface [&>th]:px-3 [&>th]:py-2 [&>th]:text-[12px] [&>th]:font-semibold [&>th]:text-fg-mute">
                  <th className="w-12">مؤكّد</th>
                  <th>العميل</th>
                  <th className="w-36">الهاتف</th>
                  <th className="w-24 text-left">الكمية</th>
                  <th className="w-32">التاريخ</th>
                  <th className="w-28 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`group transition-colors [&>td]:border-b [&>td]:border-line/60 [&>td]:px-3 [&>td]:py-2 ${
                      entry.confirmed ? confirmedRow : 'odd:bg-white/[0.015]'
                    } hover:bg-surface-hi/60`}
                  >
                    <td>
                      <ConfirmToggle entry={entry} onConfirm={onConfirm} />
                    </td>
                    <td className="max-w-[220px] truncate font-medium text-fg" title={entry.clientName}>
                      {entry.clientName}
                    </td>
                    <td>
                      <PhoneLink value={entry.phoneNumber} />
                    </td>
                    <td className="tnum text-left text-[13px] font-semibold text-fg-dim">
                      {formatInt(entry.quantity)}
                    </td>
                    <td className="tnum whitespace-nowrap text-[12px] text-fg-mute">
                      {formatDate(entry.date)}
                    </td>
                    <td>
                      <div className="opacity-80 transition-opacity group-hover:opacity-100">
                        <Actions entry={entry} onEdit={onEdit} onDelete={onDelete} onSms={onSms} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-line/60 md:hidden">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${entry.confirmed ? confirmedRow : ''}`}
              >
                <ConfirmToggle entry={entry} onConfirm={onConfirm} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-fg">{entry.clientName}</p>
                  <p className="tnum mt-0.5 flex items-center gap-2 text-[11px] text-fg-mute">
                    {entry.phoneNumber ? <PhoneLink value={entry.phoneNumber} small /> : null}
                    <span>{formatDate(entry.date)}</span>
                  </p>
                </div>
                <span className="tnum shrink-0 text-[13px] font-semibold text-fg-dim">
                  {formatInt(entry.quantity)}
                </span>
                <Actions entry={entry} onEdit={onEdit} onDelete={onDelete} onSms={onSms} vertical />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
