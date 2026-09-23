import { useMemo } from 'react'
import { ArrowDownRight, ArrowUpRight, Pencil, RotateCcw, Skull, Trash2 } from 'lucide-react'
import IconButton from './ui/IconButton'
import { formatDate, formatInt } from '../utils/format'

export const TYPE_META = {
  restock: { label: 'توريد', tone: 'text-brand-bright', Icon: ArrowUpRight },
  sale: { label: 'بيع', tone: 'text-danger-bright', Icon: ArrowDownRight },
  return: { label: 'إرجاع بيع', tone: 'text-brand-bright', Icon: RotateCcw },
  adjust: { label: 'تعديل يدوي', tone: 'text-info', Icon: Pencil },
  death: { label: 'نفوق', tone: 'text-danger-bright', Icon: Skull },
}

const FILTERS = [
  { value: 'all', label: 'الكل' },
  { value: 'restock', label: 'توريد' },
  { value: 'sale', label: 'بيع' },
  { value: 'death', label: 'نفوق' },
  { value: 'adjust', label: 'تعديل' },
]

const matchesFilter = (m, f) => {
  if (f === 'all') return true
  if (f === 'sale') return m.type === 'sale' || m.type === 'return'
  return m.type === f
}

/** One-line human description of a movement. */
export function movementDetail(m) {
  if (m.type === 'restock') {
    const received = m.received || m.delta + m.dead
    const parts = [`استلام ${formatInt(received)}`]
    if (m.dead) parts.push(`نافق ${formatInt(m.dead)}`)
    if (m.note) parts.push(m.note)
    return parts.join(' · ')
  }
  if (m.type === 'death') {
    return [`نفوق ${formatInt(m.dead || Math.abs(m.delta))}`, m.note].filter(Boolean).join(' · ')
  }
  const base = [m.ref, m.note].filter(Boolean).join(' · ')
  return base || (m.type === 'adjust' ? 'تعديل يدوي' : '—')
}

function Delta({ value }) {
  return (
    <span className={`tnum font-bold ${value >= 0 ? 'text-brand-bright' : 'text-danger-bright'}`}>
      {value >= 0 ? '+' : ''}
      {formatInt(value)}
    </span>
  )
}

function Actions({ m, onEdit, onDelete, vertical }) {
  return (
    <div className={`flex ${vertical ? 'flex-col' : 'items-center justify-center'} gap-0.5`}>
      <IconButton icon={Pencil} size="sm" label="تعديل الحركة" onClick={() => onEdit(m)} />
      <IconButton icon={Trash2} tone="danger" size="sm" label="حذف الحركة" onClick={() => onDelete(m)} />
    </div>
  )
}

/**
 * Stock movement ledger: filter chips + a table on desktop and a card list on
 * mobile. Every row can be edited or deleted from here.
 */
export default function StockLedger({ movements, loading, filter, onFilter, onEdit, onDelete }) {
  const rows = useMemo(
    () => movements.filter((m) => matchesFilter(m, filter)),
    [movements, filter],
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-fg">سجل الحركات</h2>
          <span className="tnum rounded-full bg-surface-hi px-2 py-0.5 text-[12px] font-semibold text-fg-dim">
            {rows.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`ring-focus rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                filter === f.value
                  ? 'bg-brand text-brand-ink'
                  : 'bg-surface-hi text-fg-dim hover:text-fg'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-hi/50" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-6 py-14 text-center text-sm text-fg-mute">
          {filter === 'all' ? 'لا حركات بعد' : 'لا حركات من هذا النوع'}
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="scroll-thin hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-right [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:border-b [&>th]:border-line [&>th]:bg-surface [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-[12px] [&>th]:font-semibold [&>th]:text-fg-mute">
                  <th className="w-28">النوع</th>
                  <th>التفاصيل</th>
                  <th className="w-24">بواسطة</th>
                  <th className="w-36">التاريخ</th>
                  <th className="w-20 text-left">التغيّر</th>
                  <th className="w-20 text-left">الرصيد</th>
                  <th className="w-24 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const meta = TYPE_META[m.type] || TYPE_META.adjust
                  return (
                    <tr
                      key={m.id}
                      className="group odd:bg-white/[0.015] hover:bg-surface-hi/60 [&>td]:border-b [&>td]:border-line/60 [&>td]:px-3 [&>td]:py-2.5"
                    >
                      <td>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-hi ${meta.tone}`}
                          >
                            <meta.Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="text-[12px] font-medium text-fg-dim">{meta.label}</span>
                        </span>
                      </td>
                      <td className="max-w-[280px] truncate text-[13px] text-fg-dim" title={movementDetail(m)}>
                        {movementDetail(m)}
                      </td>
                      <td className="truncate text-[12px] text-fg-mute">{m.createdByName || '—'}</td>
                      <td className="tnum whitespace-nowrap text-[12px] text-fg-mute">
                        {formatDate(m.date, 'dd MMM yyyy · HH:mm')}
                      </td>
                      <td className="text-left text-[13px]">
                        <Delta value={m.delta} />
                      </td>
                      <td className="tnum text-left text-[13px] text-fg-dim">
                        {formatInt(m.balanceAfter)}
                      </td>
                      <td>
                        <div className="opacity-80 transition-opacity group-hover:opacity-100">
                          <Actions m={m} onEdit={onEdit} onDelete={onDelete} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-line/60 md:hidden">
            {rows.map((m) => {
              const meta = TYPE_META[m.type] || TYPE_META.adjust
              const detail = movementDetail(m)
              return (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-hi ${meta.tone}`}
                  >
                    <meta.Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-fg">
                      {meta.label}
                      {detail && detail !== '—' ? ` · ${detail}` : ''}
                    </p>
                    <p className="tnum text-[11px] text-fg-mute">
                      {formatDate(m.date, 'dd MMM yyyy · HH:mm')}
                      {m.createdByName ? ` · ${m.createdByName}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className="text-[13px]">
                      <Delta value={m.delta} />
                    </p>
                    <p className="tnum text-[11px] text-fg-mute">
                      الرصيد: {formatInt(m.balanceAfter)}
                    </p>
                  </div>
                  <Actions m={m} onEdit={onEdit} onDelete={onDelete} vertical />
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
