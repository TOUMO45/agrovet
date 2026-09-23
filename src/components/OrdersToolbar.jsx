import { Plus, Search } from 'lucide-react'
import Button from './ui/Button'
import Menu from './ui/Menu'
import SegmentedControl from './ui/SegmentedControl'

const STATUS_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'pending', label: 'غير مؤكّد' },
  { value: 'ready', label: 'مؤكّد' },
]

export default function OrdersToolbar({
  count,
  search,
  onSearch,
  status,
  onStatus,
  onNew,
  menuItems = [],
}) {
  return (
    <div className="border-b border-line p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-fg">قائمة الطلبات</h2>
          <span className="tnum rounded-full bg-surface-hi px-2 py-0.5 text-[12px] font-semibold text-fg-dim">
            {count}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {menuItems.length > 0 && <Menu items={menuItems} />}
          {/* mobile uses the FAB instead */}
          <Button icon={Plus} onClick={onNew} className="hidden shrink-0 sm:inline-flex">
            طلب جديد
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-mute" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="بحث باسم العميل..."
            className="field pr-10"
            aria-label="بحث باسم العميل"
          />
        </div>
        <SegmentedControl
          options={STATUS_OPTIONS}
          value={status}
          onChange={onStatus}
          className="w-full sm:w-auto"
        />
      </div>
    </div>
  )
}
