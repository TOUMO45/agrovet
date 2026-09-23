import { useMemo, useState } from 'react'
import { Coins, Download, ListChecks, Package, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSales } from '../hooks/useSales'
import { deleteSale, undoSale } from '../services/sales'
import { exportSalesToExcel } from '../utils/exportExcel'
import { formatDZD, formatInt } from '../utils/format'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmProvider'
import KpiCard from '../components/KpiCard'
import OrdersList from '../components/OrdersList'
import Button from '../components/ui/Button'
import SegmentedControl from '../components/ui/SegmentedControl'

const RANGES = [
  { value: 'today', label: 'اليوم' },
  { value: '7d', label: '٧ أيام' },
  { value: '30d', label: '٣٠ يوم' },
  { value: 'all', label: 'الكل' },
]

function rangeStart(range) {
  const now = Date.now()
  if (range === 'today') {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  if (range === '7d') return now - 7 * 864e5
  if (range === '30d') return now - 30 * 864e5
  return 0
}

export default function Sales() {
  const { sales, loading } = useSales()
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()

  const [range, setRange] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const from = rangeStart(range)
    const term = search.trim().toLowerCase()
    return sales.filter((s) => {
      const t = s.soldAt ? new Date(s.soldAt).getTime() : 0
      if (from && t < from) return false
      if (term && !s.customerName.toLowerCase().includes(term)) return false
      return true
    })
  }, [sales, range, search])

  const k = useMemo(
    () =>
      filtered.reduce(
        (a, s) => {
          a.revenue += Number(s.totalPrice) || 0
          a.qty += Number(s.quantity) || 0
          a.count += 1
          return a
        },
        { revenue: 0, qty: 0, count: 0 },
      ),
    [filtered],
  )

  const handleUndo = async (s) => {
    const ok = await confirm({
      title: 'إرجاع البيع',
      message: `إرجاع بيع «${s.customerName}» إلى قائمة الطلبات، وإرجاع ${formatInt(s.quantity)} كتكوت إلى المخزون؟`,
      confirmLabel: 'إرجاع',
    })
    if (!ok) return
    const { error, balanceAfter } = await undoSale(s, user)
    if (error) return toast(error, 'error')
    toast(`تم إرجاع البيع · المخزون: ${formatInt(balanceAfter)}`, 'success')
  }

  const handleDelete = async (s) => {
    const ok = await confirm({
      title: 'حذف السجل',
      message: `حذف سجل بيع «${s.customerName}» نهائياً؟ لن يتغيّر المخزون.`,
      confirmLabel: 'حذف',
      tone: 'danger',
    })
    if (!ok) return
    const { error } = await deleteSale(s.id)
    toast(error || 'تم حذف السجل', error ? 'error' : 'success')
  }

  const exportXlsx = () => {
    if (!filtered.length) return toast('لا توجد مبيعات للتصدير', 'info')
    const { error } = exportSalesToExcel(filtered)
    toast(error || 'تم تنزيل ملف Excel', error ? 'error' : 'success')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:py-8 md:pb-8">
      <div className="mb-4 flex items-center justify-between gap-2 sm:mb-5">
        <h1 className="text-lg font-bold text-fg sm:text-xl">المبيعات</h1>
        <Button size="sm" variant="secondary" icon={Download} onClick={exportXlsx}>
          تصدير
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <KpiCard
          label="الإيرادات"
          value={formatDZD(k.revenue)}
          sub={`${k.count} عملية بيع`}
          icon={Coins}
          accent="brand"
          className="col-span-2 lg:col-span-1"
        />
        <KpiCard
          label="الكتاكيت المُباعة"
          value={formatInt(k.qty)}
          sub="ضمن الفترة المحدّدة"
          icon={Package}
          accent="info"
        />
        <KpiCard
          label="متوسط قيمة البيع"
          value={formatDZD(k.count ? k.revenue / k.count : 0)}
          sub="لكل عملية"
          icon={ListChecks}
          accent="warn"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-card sm:mt-6">
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-fg">سجل المبيعات</h2>
            <span className="tnum rounded-full bg-surface-hi px-2 py-0.5 text-[12px] font-semibold text-fg-dim">
              {filtered.length}
            </span>
          </div>
          <SegmentedControl
            options={RANGES}
            value={range}
            onChange={setRange}
            className="w-full sm:w-auto"
          />
        </div>

        <div className="border-b border-line p-3 sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-mute" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم العميل..."
              className="field pr-10"
              aria-label="بحث باسم العميل"
            />
          </div>
        </div>

        <OrdersList
          orders={filtered}
          loading={loading}
          mode="sold"
          onUndoSale={handleUndo}
          onDelete={handleDelete}
          emptyText={search || range !== 'all' ? 'لا مبيعات في هذه الفترة' : 'لا مبيعات بعد'}
          emptyHint={
            search || range !== 'all' ? undefined : 'أكمل بيع طلب من الرئيسية بزر «تم البيع»'
          }
        />
      </div>
    </div>
  )
}
