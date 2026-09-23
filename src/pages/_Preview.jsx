/**
 * DEV-ONLY visual harness. Renders the redesigned dashboard chrome with mock
 * data so the UI can be reviewed without a Firebase session. Not included in
 * the production build (route is gated on import.meta.env.DEV in App.jsx).
 */
import { useMemo, useState } from 'react'
import { Archive, Boxes, Coins, Download, Hourglass, Plus } from 'lucide-react'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import Fab from '../components/Fab'
import Modal from '../components/ui/Modal'
import KpiCard from '../components/KpiCard'
import PriceCard from '../components/PriceCard'
import OrdersToolbar from '../components/OrdersToolbar'
import OrdersList from '../components/OrdersList'
import SelectionBar from '../components/SelectionBar'
import OrderForm from '../components/OrderForm'
import QuickPriceDialog from '../components/QuickPriceDialog'
import NotifyClientsDialog from '../components/NotifyClientsDialog'
import { formatDZD, formatInt } from '../utils/format'

const MOCK = [
  { id: '1', customerName: 'سليم', phoneNumber: '000', quantity: 200, unitPrice: 80, totalPrice: 16000, notes: '', confirmed: false, priceOverridden: false, date: '2026-09-05T09:00:00Z' },
  { id: '2', customerName: 'مجيد بوعلام', phoneNumber: '0668938144', quantity: 500, unitPrice: 78, totalPrice: 39000, notes: 'يمر بعد الظهر', confirmed: true, priceOverridden: true, date: '2026-09-05T10:20:00Z' },
  { id: '3', customerName: 'حساوي عبد القادر', phoneNumber: '0665057188', quantity: 100, unitPrice: 80, totalPrice: 8000, notes: '', confirmed: false, priceOverridden: false, date: '2026-09-03T08:15:00Z' },
  { id: '4', customerName: 'داودي', phoneNumber: '0665174519', quantity: 500, unitPrice: 80, totalPrice: 40000, notes: '', confirmed: true, priceOverridden: false, date: '2026-09-03T08:40:00Z' },
  { id: '5', customerName: 'قندو', phoneNumber: '0666896402', quantity: 120, unitPrice: 80, totalPrice: 9600, notes: 'كتاكيت بيّاضة', confirmed: false, priceOverridden: false, date: '2026-09-03T11:05:00Z' },
]
const HISTORY = [
  { price: 80, date: '2026-09-05T10:00:00Z' },
  { price: 76, date: '2026-09-03T10:00:00Z' },
  { price: 78, date: '2026-09-01T10:00:00Z' },
  { price: 72, date: '2026-08-28T10:00:00Z' },
  { price: 70, date: '2026-08-25T10:00:00Z' },
]

export default function Preview() {
  const [orders] = useState(MOCK)
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [priceOrder, setPriceOrder] = useState(null)
  const [notify, setNotify] = useState(false)

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (search && !o.customerName.includes(search)) return false
        if (status === 'ready' && !o.confirmed) return false
        if (status === 'pending' && o.confirmed) return false
        return true
      }),
    [orders, search, status],
  )
  const pending = orders.reduce(
    (a, o) => {
      a.value += o.totalPrice
      a.qty += o.quantity
      if (o.confirmed) {
        a.ready += 1
        a.readyQty += o.quantity
      }
      return a
    },
    { value: 0, qty: 0, ready: 0, readyQty: 0 },
  )
  const selected = orders.filter((o) => selectedIds.includes(o.id))
  const visibleIds = filtered.map((o) => o.id)
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const toggle = (id) =>
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div dir="rtl" className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:py-8 md:pb-8">
        <h1 className="mb-4 text-lg font-bold text-fg sm:mb-5 sm:text-xl">نظرة عامة</h1>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <PriceCard price={80} history={HISTORY} onSave={async () => true} className="col-span-2 lg:col-span-1" />
          <KpiCard label="المخزون المتاح" value={formatInt(340)} sub="الحدّ الأدنى: 200" icon={Boxes} accent="brand" onClick={() => {}} />
          <KpiCard label="الإيرادات المحقّقة" value={formatDZD(214000)} sub="اليوم: 54 000 د.ج · 3 بيع" icon={Coins} accent="brand" onClick={() => {}} />
          <KpiCard label="طلبات منتظرة" value={formatDZD(pending.value)} sub={`${orders.length} طلب · ${formatInt(pending.qty)} كتكوت · ${pending.ready} مؤكّد (${formatInt(pending.readyQty)} كتكوت)`} icon={Hourglass} accent="warn" className="col-span-2 lg:col-span-1" />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-card sm:mt-6">
          <OrdersToolbar
            count={filtered.length}
            search={search}
            onSearch={setSearch}
            status={status}
            onStatus={setStatus}
            onNew={() => setShowAdd(true)}
            menuItems={[
              { label: 'تصدير الطلبات الجاهزة', icon: Download, onClick: () => {} },
              { label: 'فتح المبيعات', icon: Coins, onClick: () => {} },
              { label: 'فتح الأرشيف', icon: Archive, onClick: () => {} },
              null,
              { label: 'أرشفة كل الطلبات', icon: Archive, onClick: () => {}, tone: 'danger' },
            ]}
          />
          <OrdersList
            orders={filtered}
            loading={false}
            mode="active"
            selectedIds={selectedIds}
            allSelected={allSelected}
            onToggle={toggle}
            onToggleAll={() => setSelectedIds(allSelected ? [] : visibleIds)}
            onSell={() => {}}
            onConfirm={() => {}}
            onEdit={() => {}}
            onPrice={setPriceOrder}
            onDelete={() => {}}
          />
        </div>
      </div>

      <SelectionBar
        count={selected.length}
        onNotify={() => setNotify(true)}
        onExport={() => {}}
        onArchive={() => {}}
        onClear={() => setSelectedIds([])}
      />
      <Fab onClick={() => setShowAdd(true)} hidden={selected.length > 0} />
      <BottomNav />

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="طلب جديد">
        <OrderForm currentPrice={80} onSubmit={async () => {}} onClose={() => setShowAdd(false)} />
      </Modal>
      <QuickPriceDialog order={priceOrder} currentPrice={80} onClose={() => setPriceOrder(null)} onSave={async () => true} />
      <NotifyClientsDialog isOpen={notify} onClose={() => setNotify(false)} orders={selected} />
    </div>
  )
}
