import { useMemo, useState } from 'react'
import { ClipboardList, Search, Trash2 } from 'lucide-react'
import { useOrders } from '../hooks/useOrders'
import { useLists } from '../hooks/useLists'
import { useListEntries } from '../hooks/useListEntries'
import { deleteList, setListArchived } from '../services/lists'
import { deleteAllArchived, deleteArchivedByIds, deleteOrder, restoreOrder } from '../services/orders'
import { usePrice } from '../hooks/usePrice'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmProvider'
import Button from '../components/ui/Button'
import OrdersList from '../components/OrdersList'
import ListCard from '../components/ListCard'
import ListEntriesTable from '../components/ListEntriesTable'
import Modal from '../components/ui/Modal'
import { formatDate, formatInt, formatNumber } from '../utils/format'

function ArchivedLists() {
  const { lists, loading } = useLists()
  const toast = useToast()
  const confirm = useConfirm()
  const archived = useMemo(() => lists.filter((l) => l.archived), [lists])

  const [openId, setOpenId] = useState(null)
  const openList = archived.find((l) => l.id === openId) || null
  const { entries, loading: entriesLoading } = useListEntries(openId)
  const { currentPrice } = usePrice()

  const label = (list) => list.title || formatDate(list.date)

  const handleRestore = async (list) => {
    const ok = await confirm({
      title: 'إعادة اللائحة',
      message: `إعادة «${label(list)}» إلى صفحة القوائم؟`,
      confirmLabel: 'إعادة',
    })
    if (!ok) return
    const { error } = await setListArchived(list, false)
    toast(error || 'تمت إعادة اللائحة', error ? 'error' : 'success')
    if (!error && openId === list.id) setOpenId(null)
  }

  const handleDelete = async (list) => {
    const ok = await confirm({
      title: 'حذف نهائي',
      message: `حذف «${label(list)}» وكل عملائها نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: 'حذف',
      tone: 'danger',
    })
    if (!ok) return
    const { error } = await deleteList(list)
    toast(error || 'تم حذف اللائحة', error ? 'error' : 'success')
    if (!error && openId === list.id) setOpenId(null)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-hi/50" />
        ))}
      </div>
    )
  }

  return (
    <>
      {archived.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-card">
          <ClipboardList className="mx-auto h-8 w-8 text-fg-mute" aria-hidden />
          <p className="mt-3 text-sm text-fg-mute">لا توجد لوائح مؤرشفة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {archived.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              archived
              onOpen={(l) => setOpenId(l.id)}
              onRestore={handleRestore}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(openList)}
        onClose={() => setOpenId(null)}
        title={openList ? label(openList) : ''}
        subtitle={
          openList ? `مؤرشفة · ${formatInt(openList.usedQty)} / ${formatInt(openList.quantity)}` : undefined
        }
        icon={ClipboardList}
        size="lg"
      >
        {openList && <ListEntriesTable entries={entries} loading={entriesLoading} unitPrice={currentPrice} readOnly />}
      </Modal>
    </>
  )
}

export default function Archive() {
  const { archivedOrders, loading } = useOrders()
  const { currentPrice } = usePrice()
  const toast = useToast()
  const confirm = useConfirm()

  const [tab, setTab] = useState('orders') // orders | lists
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? archivedOrders.filter((o) => o.customerName.toLowerCase().includes(term)) : archivedOrders
  }, [archivedOrders, search])

  const visibleIds = filtered.map((o) => o.id)
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const toggle = (id) => setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
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
        </div>
        {tab === 'orders' && (
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={clearAll}
            disabled={busy || archivedOrders.length === 0}
          >
            حذف الكل
          </Button>
        )}
      </div>

      <div className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1" role="tablist">
        {[
          ['orders', 'الطلبات', archivedOrders.length],
          ['lists', 'القوائم', null],
        ].map(([key, text, count]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`ring-focus inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              tab === key ? 'bg-surface-hi text-fg' : 'text-fg-mute hover:text-fg-dim'
            }`}
          >
            {text}
            {count != null && <span className="tnum text-[12px] text-fg-mute">{formatNumber(count)}</span>}
          </button>
        ))}
      </div>

      {tab === 'lists' ? (
        <ArchivedLists />
      ) : (
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
      )}
    </div>
  )
}
