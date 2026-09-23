import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Boxes, Coins, Download, Hourglass, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../hooks/useOrders'
import { usePrice } from '../hooks/usePrice'
import { useSales } from '../hooks/useSales'
import { useStock } from '../hooks/useStock'
import { useLists } from '../hooks/useLists'
import {
  addOrder,
  archiveMany,
  deleteOrder,
  setOrderConfirmed,
  syncUnconfirmedOrderPrices,
  updateOrder,
} from '../services/orders'
import { sellOrder } from '../services/sales'
import { addListEntry } from '../services/lists'
import { exportOrdersToExcel } from '../utils/exportExcel'
import { formatDZD, formatInt, orderUnitPrice } from '../utils/format'
import Modal from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmProvider'
import KpiCard from '../components/KpiCard'
import PriceCard from '../components/PriceCard'
import OrdersToolbar from '../components/OrdersToolbar'
import OrdersList from '../components/OrdersList'
import SelectionBar from '../components/SelectionBar'
import OrderForm from '../components/OrderForm'
import QuickPriceDialog from '../components/QuickPriceDialog'
import NotifyClientsDialog from '../components/NotifyClientsDialog'
import AddToListDialog from '../components/AddToListDialog'
import Fab from '../components/Fab'

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { orders, loading, error, setError } = useOrders()
  const { currentPrice, priceHistory, updatePrice } = usePrice()
  const { sales } = useSales()
  const { available, lowThreshold } = useStock()
  const { lists } = useLists()
  const toast = useToast()
  const confirm = useConfirm()

  const [showAdd, setShowAdd] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [priceOrder, setPriceOrder] = useState(null)
  const [listOrder, setListOrder] = useState(null)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (error) toast(error, 'error')
  }, [error, toast])

  // Keep pending orders in step with the current price — once per real change.
  const ordersRef = useRef(orders)
  ordersRef.current = orders
  const syncedPriceRef = useRef(null)
  useEffect(() => {
    if (loading || !currentPrice) return
    if (syncedPriceRef.current === currentPrice) return
    syncedPriceRef.current = currentPrice
    syncUnconfirmedOrderPrices(ordersRef.current, currentPrice).then(({ error: err }) => {
      if (err) setError(err)
    })
  }, [currentPrice, loading, setError])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (term && !o.customerName.toLowerCase().includes(term)) return false
      if (statusFilter === 'ready' && !o.confirmed) return false
      if (statusFilter === 'pending' && o.confirmed) return false
      return true
    })
  }, [orders, search, statusFilter])

  const pending = useMemo(
    () =>
      orders.reduce(
        (a, o) => {
          const qty = Number(o.quantity) || 0
          a.value += Number(o.totalPrice) || 0
          a.qty += qty
          if (o.confirmed) {
            a.ready += 1
            a.readyQty += qty
          }
          return a
        },
        { value: 0, qty: 0, ready: 0, readyQty: 0 },
      ),
    [orders],
  )

  const revenue = useMemo(() => {
    const from = startOfToday()
    return sales.reduce(
      (a, s) => {
        const total = Number(s.totalPrice) || 0
        a.all += total
        const t = s.soldAt ? new Date(s.soldAt).getTime() : 0
        if (t >= from) {
          a.today += total
          a.todayCount += 1
        }
        return a
      },
      { all: 0, today: 0, todayCount: 0 },
    )
  }, [sales])

  const lowStock = lowThreshold > 0 && available <= lowThreshold

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedIds.includes(o.id)),
    [orders, selectedIds],
  )
  const visibleIds = filtered.map((o) => o.id)
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

  const savePrice = async (n) => {
    const { error: err } = await updatePrice(n)
    toast(err ? 'حدث خطأ أثناء تحديث السعر' : 'تم تحديث السعر', err ? 'error' : 'success')
    return !err
  }

  const handleAdd = async (payload) => {
    if (!currentPrice || currentPrice <= 0) {
      throw new Error('حدّد السعر الحالي أولاً قبل إضافة الطلبات')
    }
    const { error: err } = await addOrder(payload, currentPrice, user)
    if (err) throw new Error(err)
    toast('تمت إضافة الطلب', 'success')
  }

  const handleUpdate = async (payload) => {
    const existing = orders.find((o) => o.id === editingOrder.id)
    if (!existing) return
    const { error: err } = await updateOrder(editingOrder.id, payload, existing, currentPrice)
    if (err) throw new Error(err)
    toast('تم تحديث الطلب', 'success')
  }

  const handleQuickPrice = async (patch) => {
    const existing = orders.find((o) => o.id === priceOrder.id)
    if (!existing) return false
    const { error: err } = await updateOrder(priceOrder.id, patch, existing, currentPrice)
    toast(err || 'تم تحديث السعر', err ? 'error' : 'success')
    return !err
  }

  const handleAddToList = async (listId, payload) => {
    const { error: err } = await addListEntry(listId, payload, user)
    toast(err || 'تمت الإضافة إلى اللائحة', err ? 'error' : 'success')
    return !err
  }

  const handleConfirm = async (order, checked) => {
    const { error: err } = await setOrderConfirmed(order, checked, currentPrice)
    if (err) toast(err, 'error')
  }

  const handleSell = async (order) => {
    const qty = Number(order.quantity) || 0
    const total = qty * orderUnitPrice(order, currentPrice)
    const after = available - qty
    const short = after < 0
    const ok = await confirm({
      title: 'تأكيد البيع',
      message: `بيع ${formatInt(order.quantity)} كتكوت لـ «${order.customerName}» بمبلغ ${formatDZD(total)}. المخزون بعد البيع: ${formatInt(after)}${short ? ' (بالسالب — المخزون غير كافٍ)' : ''}.`,
      confirmLabel: 'تم البيع',
      tone: short ? 'danger' : 'brand',
    })
    if (!ok) return
    const { error: err, balanceAfter } = await sellOrder(order, currentPrice, user)
    if (err) return toast(err, 'error')
    toast(`تم تسجيل البيع · المخزون: ${formatInt(balanceAfter)}`, 'success')
    setSelectedIds((ids) => ids.filter((x) => x !== order.id))
  }

  const handleDelete = async (order) => {
    const ok = await confirm({
      title: 'حذف الطلب',
      message: `سيُحذف طلب «${order.customerName}» نهائياً.`,
      confirmLabel: 'حذف',
      tone: 'danger',
    })
    if (!ok) return
    const { error: err } = await deleteOrder(order.id, false)
    if (err) toast(err, 'error')
    else {
      toast('تم حذف الطلب', 'success')
      setSelectedIds((ids) => ids.filter((x) => x !== order.id))
    }
  }

  const archiveAll = async () => {
    if (!orders.length) return toast('لا توجد طلبات للأرشفة', 'info')
    const ok = await confirm({
      title: 'أرشفة كل الطلبات',
      message: `سيتم نقل ${orders.length} طلباً إلى الأرشيف.`,
      confirmLabel: 'أرشفة الكل',
    })
    if (!ok) return
    const { error: err } = await archiveMany(orders)
    toast(err || 'تمت أرشفة الطلبات', err ? 'error' : 'success')
    setSelectedIds([])
  }

  const archiveSelected = async () => {
    if (!selectedOrders.length) return
    const ok = await confirm({
      title: 'أرشفة المحدد',
      message: `أرشفة ${selectedOrders.length} طلباً محدداً؟`,
      confirmLabel: 'أرشفة',
    })
    if (!ok) return
    const { error: err } = await archiveMany(selectedOrders)
    toast(err || 'تمت أرشفة الطلبات المحددة', err ? 'error' : 'success')
    setSelectedIds([])
  }

  const exportRows = (rows, prefix, sheet) => {
    if (!rows.length) return toast('لا توجد طلبات للتصدير', 'info')
    const { error: err } = exportOrdersToExcel(rows, { filePrefix: prefix, sheetName: sheet })
    toast(err || 'تم تنزيل ملف Excel', err ? 'error' : 'success')
  }

  const toggleSelect = (id) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const toggleAll = () => setSelectedIds(allSelected ? [] : visibleIds)

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:py-8 md:pb-8">
      <h1 className="mb-4 text-lg font-bold text-fg sm:mb-5 sm:text-xl">نظرة عامة</h1>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <PriceCard
          price={currentPrice}
          history={priceHistory}
          onSave={savePrice}
          className="col-span-2 lg:col-span-1"
        />
        <KpiCard
          label="المخزون المتاح"
          value={formatInt(available)}
          sub={lowStock ? '⚠ مخزون منخفض' : lowThreshold > 0 ? `الحدّ الأدنى: ${formatInt(lowThreshold)}` : 'كتكوت'}
          icon={Boxes}
          accent={lowStock ? 'danger' : 'brand'}
          onClick={() => navigate('/stock')}
        />
        <KpiCard
          label="الإيرادات المحقّقة"
          value={formatDZD(revenue.all)}
          sub={`اليوم: ${formatDZD(revenue.today)} · ${revenue.todayCount} بيع`}
          icon={Coins}
          accent="brand"
          onClick={() => navigate('/sales')}
        />
        <KpiCard
          label="طلبات منتظرة"
          value={formatDZD(pending.value)}
          sub={`${orders.length} طلب · ${formatInt(pending.qty)} كتكوت · ${pending.ready} مؤكّد (${formatInt(pending.readyQty)} كتكوت)`}
          icon={Hourglass}
          accent="warn"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-card sm:mt-6">
        <OrdersToolbar
          count={filtered.length}
          search={search}
          onSearch={setSearch}
          status={statusFilter}
          onStatus={setStatusFilter}
          onNew={() => setShowAdd(true)}
          menuItems={[
            {
              label: 'تصدير الطلبات المؤكّدة',
              icon: Download,
              onClick: () =>
                exportRows(orders.filter((o) => o.confirmed), 'الطلبات_المؤكدة', 'الطلبات المؤكدة'),
            },
            { label: 'فتح المبيعات', icon: Coins, onClick: () => navigate('/sales') },
            { label: 'فتح الأرشيف', icon: Archive, onClick: () => navigate('/archive') },
            null,
            { label: 'أرشفة كل الطلبات', icon: Archive, onClick: archiveAll, tone: 'danger' },
          ]}
        />

        <OrdersList
          orders={filtered}
          loading={loading}
          mode="active"
          selectedIds={selectedIds}
          allSelected={allSelected}
          onToggle={toggleSelect}
          onToggleAll={toggleAll}
          onSell={handleSell}
          onConfirm={handleConfirm}
          onEdit={setEditingOrder}
          onPrice={setPriceOrder}
          onDelete={handleDelete}
          onAddToList={setListOrder}
          emptyText={search || statusFilter !== 'all' ? 'لا نتائج مطابقة' : 'لا توجد طلبات بعد'}
          emptyHint={search || statusFilter !== 'all' ? undefined : 'أضف أول طلب من زر +'}
        />
      </div>

      <Fab onClick={() => setShowAdd(true)} hidden={selectedOrders.length > 0} />

      <SelectionBar
        count={selectedOrders.length}
        onNotify={() => selectedOrders.length && setNotifyOpen(true)}
        onExport={() => exportRows(selectedOrders, 'الطلبات_المحددة', 'الطلبات المحددة')}
        onArchive={archiveSelected}
        onClear={() => setSelectedIds([])}
      />

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="طلب جديد" icon={Plus}>
        <OrderForm currentPrice={currentPrice} onSubmit={handleAdd} onClose={() => setShowAdd(false)} />
      </Modal>

      <Modal isOpen={Boolean(editingOrder)} onClose={() => setEditingOrder(null)} title="تعديل الطلب">
        {editingOrder && (
          <OrderForm
            currentPrice={currentPrice}
            initialData={editingOrder}
            onSubmit={handleUpdate}
            onClose={() => setEditingOrder(null)}
          />
        )}
      </Modal>

      <QuickPriceDialog
        order={priceOrder}
        currentPrice={currentPrice}
        onClose={() => setPriceOrder(null)}
        onSave={handleQuickPrice}
      />

      <AddToListDialog
        order={listOrder}
        lists={lists}
        onClose={() => setListOrder(null)}
        onSave={handleAddToList}
      />

      <NotifyClientsDialog
        isOpen={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        orders={selectedOrders}
      />
    </div>
  )
}
