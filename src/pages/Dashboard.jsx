import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Coins, Download, ListChecks, Package, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../hooks/useOrders'
import { usePrice } from '../hooks/usePrice'
import {
  addOrder,
  archiveMany,
  deleteOrder,
  setOrderConfirmed,
  syncUnconfirmedOrderPrices,
  updateOrder,
} from '../services/orders'
import { exportOrdersToExcel } from '../utils/exportExcel'
import { formatDZD, formatNumber } from '../utils/format'
import Modal from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmProvider'
import KpiCard from '../components/KpiCard'
import PriceCard from '../components/PriceCard'
import OrdersToolbar from '../components/OrdersToolbar'
import OrdersList from '../components/OrdersList'
import SelectionBar from '../components/SelectionBar'
import OrderForm from '../components/OrderForm'
import NotifyClientsDialog from '../components/NotifyClientsDialog'
import Fab from '../components/Fab'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { orders, loading, error, setError } = useOrders()
  const { currentPrice, priceHistory, updatePrice } = usePrice()
  const toast = useToast()
  const confirm = useConfirm()

  const [showAdd, setShowAdd] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
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
      if (statusFilter === 'confirmed' && !o.confirmed) return false
      if (statusFilter === 'pending' && o.confirmed) return false
      return true
    })
  }, [orders, search, statusFilter])

  const stats = useMemo(
    () =>
      orders.reduce(
        (a, o) => {
          a.sales += Number(o.totalPrice) || 0
          a.qty += Number(o.quantity) || 0
          if (o.confirmed) {
            a.confirmedQty += Number(o.quantity) || 0
            a.confirmedCount += 1
          }
          return a
        },
        { sales: 0, qty: 0, confirmedQty: 0, confirmedCount: 0 },
      ),
    [orders],
  )

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

  const handleConfirm = async (order, checked) => {
    const { error: err } = await setOrderConfirmed(order, checked, currentPrice)
    if (err) toast(err, 'error')
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
          label="إجمالي المبيعات"
          value={formatDZD(stats.sales)}
          sub={`${orders.length} طلب نشط`}
          icon={Coins}
          accent="brand"
        />
        <KpiCard label="إجمالي الكمية" value={formatNumber(stats.qty)} sub="كتكوت" icon={Package} accent="info" />
        <KpiCard
          label="الكمية المؤكدة"
          value={formatNumber(stats.confirmedQty)}
          sub={`${stats.confirmedCount} من ${orders.length} طلب`}
          icon={ListChecks}
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
              label: 'تصدير الطلبات المؤكدة',
              icon: Download,
              onClick: () =>
                exportRows(orders.filter((o) => o.confirmed), 'الطلبات_المؤكدة', 'الطلبات المؤكدة'),
            },
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
          onConfirm={handleConfirm}
          onEdit={setEditingOrder}
          onDelete={handleDelete}
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

      <NotifyClientsDialog
        isOpen={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        orders={selectedOrders}
      />
    </div>
  )
}
