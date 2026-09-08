import { Archive, Download, MessageSquare, X } from 'lucide-react'
import Button from './ui/Button'

export default function SelectionBar({ count, onNotify, onExport, onArchive, onClear }) {
  if (!count) return null
  return (
    <div className="selection-dock pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3">
      <div className="pointer-events-auto flex w-full max-w-2xl animate-slide-up items-center gap-2 rounded-2xl border border-line bg-surface-hi/95 p-2 shadow-pop backdrop-blur">
        <span className="tnum shrink-0 rounded-lg bg-brand/15 px-2.5 py-1.5 text-[13px] font-bold text-brand-bright">
          {count} محدّد
        </span>
        <div className="scroll-thin flex flex-1 items-center gap-1.5 overflow-x-auto">
          <Button size="sm" variant="primary" icon={MessageSquare} onClick={onNotify} className="shrink-0">
            تنبيه العملاء
          </Button>
          <Button size="sm" variant="secondary" icon={Download} onClick={onExport} className="shrink-0">
            تصدير
          </Button>
          <Button size="sm" variant="secondary" icon={Archive} onClick={onArchive} className="shrink-0">
            أرشفة
          </Button>
        </div>
        <button
          onClick={onClear}
          aria-label="إلغاء التحديد"
          className="ring-focus shrink-0 rounded-lg p-2 text-fg-mute hover:bg-surface hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
