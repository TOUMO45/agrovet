import { Pencil, Trash2 } from 'lucide-react'
import IconButton from './ui/IconButton'
import { formatDate, formatInt } from '../utils/format'

export default function ListCard({ list, onOpen, onEdit, onDelete }) {
  const pct = list.quantity > 0 ? Math.min(100, Math.round((list.usedQty / list.quantity) * 100)) : 0
  const full = list.remaining <= 0

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line/70">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => onOpen(list)} className="ring-focus min-w-0 flex-1 rounded-lg text-right">
          <p className="truncate font-bold text-fg">{list.title || `لائحة ${formatDate(list.date)}`}</p>
          <p className="mt-0.5 text-[12px] text-fg-mute">{formatDate(list.date)}</p>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton icon={Pencil} size="sm" label="تعديل اللائحة" onClick={() => onEdit(list)} />
          <IconButton icon={Trash2} tone="danger" size="sm" label="حذف اللائحة" onClick={() => onDelete(list)} />
        </div>
      </div>

      <button onClick={() => onOpen(list)} className="ring-focus mt-3 block w-full rounded-lg text-right">
        <div className="flex items-center justify-between text-[12px]">
          <span className="tnum text-fg-dim">
            {formatInt(list.usedQty)} / {formatInt(list.quantity)}
          </span>
          <span className={`tnum font-semibold ${full ? 'text-danger-bright' : 'text-brand-bright'}`}>
            {full ? 'ممتلئة' : `باقي ${formatInt(list.remaining)}`}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-hi">
          <div
            className={`h-full rounded-full transition-all ${full ? 'bg-danger' : 'bg-brand'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>
    </div>
  )
}
