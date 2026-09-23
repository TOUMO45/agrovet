import { Pencil, Phone, Trash2 } from 'lucide-react'
import IconButton from './ui/IconButton'
import { formatDate, formatInt } from '../utils/format'

function Actions({ entry, onEdit, onDelete, vertical }) {
  return (
    <div className={`flex ${vertical ? 'flex-col' : 'items-center justify-center'} gap-0.5`}>
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

/** Client entries inside one list: table on desktop, card list on mobile. */
export default function ListEntriesTable({ entries, loading, onEdit, onDelete }) {
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
            <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-right [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:border-b [&>th]:border-line [&>th]:bg-surface [&>th]:px-3 [&>th]:py-2 [&>th]:text-[12px] [&>th]:font-semibold [&>th]:text-fg-mute">
                  <th>العميل</th>
                  <th className="w-36">الهاتف</th>
                  <th className="w-24 text-left">الكمية</th>
                  <th className="w-32">التاريخ</th>
                  <th className="w-24 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="group odd:bg-white/[0.015] hover:bg-surface-hi/60 [&>td]:border-b [&>td]:border-line/60 [&>td]:px-3 [&>td]:py-2"
                  >
                    <td className="max-w-[220px] truncate font-medium text-fg" title={entry.clientName}>
                      {entry.clientName}
                    </td>
                    <td className="tnum text-[13px] text-fg-dim" dir="ltr">
                      {entry.phoneNumber || '—'}
                    </td>
                    <td className="tnum text-left text-[13px] font-semibold text-fg-dim">
                      {formatInt(entry.quantity)}
                    </td>
                    <td className="tnum whitespace-nowrap text-[12px] text-fg-mute">
                      {formatDate(entry.date)}
                    </td>
                    <td>
                      <div className="opacity-80 transition-opacity group-hover:opacity-100">
                        <Actions entry={entry} onEdit={onEdit} onDelete={onDelete} />
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
              <li key={entry.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-fg">{entry.clientName}</p>
                  <p className="tnum mt-0.5 flex items-center gap-2 text-[11px] text-fg-mute">
                    {entry.phoneNumber ? (
                      <span className="inline-flex items-center gap-1" dir="ltr">
                        <Phone className="h-3 w-3" aria-hidden />
                        {entry.phoneNumber}
                      </span>
                    ) : null}
                    <span>{formatDate(entry.date)}</span>
                  </p>
                </div>
                <span className="tnum shrink-0 text-[13px] font-semibold text-fg-dim">
                  {formatInt(entry.quantity)}
                </span>
                <Actions entry={entry} onEdit={onEdit} onDelete={onDelete} vertical />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
