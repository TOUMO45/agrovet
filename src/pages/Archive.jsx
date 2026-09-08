import { useMemo, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import {
  deleteAllArchived,
  deleteArchivedByIds,
  deleteOrder,
  restoreOrder,
} from '../services/orders'
import { usePrice } from '../hooks/usePrice'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmProvider'
import Button from '../components/ui/Button'
import OrdersList from '../components/OrdersList'
import { formatNumber } from '../utils/format'

export default function Archive() {
  const { archivedOrders, loading } = useOrders()
  const { currentPrice } = usePrice()
  const toast = useToast()
  const confirm = useConfirm()

  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term
      ? archivedOrders.filter((o) => o.customerName.toLowerCase().includes(term))
      : archivedOrders
  }, [archivedOrders, search])

  const visibleIds = filtered.map((o) => o.id)
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const toggle = (id) =>
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleAll = () => setSelectedIds(allSelected ? [] : visibleIds)

  const handleRestore = async (order) => {
    const ok = await confirm({
      title: 'إعادة الطلب',
      message: `إعادة طلب «${order.customerName}» إلى القائمة النشطة؟`,
      confirmLabel: 'إعادة',
    })
    if (!ok) return
    const { error } = await restoreOrder(order, currentPrice)
    toast(error || 'تمت إعادة الطلب', error ? 'error' : 'success')
  }

  const handleDelete = async (order) => {
    const ok = await confirm({
      title: 'حذف نهائي',
      message: `حذف طلب «${order.customerName}» من الأرشيف نهائياً؟`,
      confirmLabel: 'حذف',
      tone: 'danger',
    })
    if (!ok) return
    const { error } = await deleteOrder(order.id, true)
    toast(error || 'تم الحذف', error ? 'error' : 'success')
    setSelectedIds((s) => s.filter((x) => x !== order.id))
  }

  const deleteSelected = async () => {
    if (!selectedIds.length) return
    const ok = await confirm({
      title: 'حذف المحدد',
      message: `حذف ${selectedIds.length} طلباً من الأرشيف نهائياً؟`,
      confirmLabel: 'حذف',
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    const { error } = await deleteArchivedByIds(selectedIds)
    setBusy(false)
    toast(error || `تم حذف ${selectedIds.length} طلباً`, error ? 'error' : 'success')
    setSelectedIds([])
  }

  const clearAll = async () => {
    if (!archivedOrders.length) return
    const ok = await confirm({
      title: 'إفراغ الأرشيف بالكامل',
      message: `سيتم حذف ${formatNumber(archivedOrders.length)} طلب مؤرشف نهائياً. لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: 'حذف الكل',
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    const { deleted, error } = await deleteAllArchived()
    setBusy(false)
    toast(error || `تم حذف ${formatNumber(deleted)} طلباً من الأرشيف`, error ? 'error' : 'success')
    setSelectedIds([])
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:py-8 md:pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-fg sm:text-xl">الأرشيف</h1>
          <span className="tnum rounded-full bg-surface-hi px-2 py-0.5 text-[12px] font-semibold text-fg-dim">
            {formatNumber(archivedOrders.length)}
          </span>
        </div>
        <Button
          variant="danger"
          size="sm"
          icon={Trash2}
          onClick={clearAll}
          disabled={busy || archivedOrders.length === 0}
        >
          حذف الكل
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex items-center gap-2 border-b border-line p-3 sm:p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-mute" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم العميل..."
              className="field pr-10"
              aria-label="بحث باسم العميل"
            />
          </div>
          {selectedIds.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={deleteSelected}
              disabled={busy}
              className="shrink-0"
            >
              حذف ({selectedIds.length})
            </Button>
          )}
        </div>

        <OrdersList
          orders={filtered}
          loading={loading}
          mode="archive"
          selectedIds={selectedIds}
          allSelected={allSelected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onDelete={handleDelete}
          onRestore={handleRestore}
          emptyText={search ? 'لا نتائج مطابقة' : 'الأرشيف فارغ'}
        />
      </div>
    </div>
  )
}
