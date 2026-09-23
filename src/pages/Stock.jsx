import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownRight, Boxes, Pencil, Plus, Skull } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useStock } from '../hooks/useStock'
import {
  addStock,
  deleteMovement,
  recordDeath,
  setLowThreshold,
  setStockAvailable,
  updateMovement,
} from '../services/stock'
import { formatInt, formatRelative } from '../utils/format'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmProvider'
import KpiCard from '../components/KpiCard'
import Modal from '../components/ui/Modal'
import Field from '../components/ui/Field'
import Button from '../components/ui/Button'
import StockLedger, { TYPE_META } from '../components/StockLedger'
import EditMovementDialog from '../components/EditMovementDialog'

export default function Stock() {
  const { available, lowThreshold, updatedAt, movements, loading } = useStock()
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()

  const [dialog, setDialog] = useState(null) // 'add' | 'set' | 'threshold' | 'death'
  const [amount, setAmount] = useState('')
  const [dead, setDead] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)

  const low = lowThreshold > 0 && available <= lowThreshold

  const todaySold = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return movements
      .filter((m) => m.type === 'sale' && new Date(m.date) >= start)
      .reduce((a, m) => a + Math.abs(m.delta), 0)
  }, [movements])
  const totalDead = useMemo(
    () => movements.reduce((a, m) => a + (Number(m.dead) || 0), 0),
    [movements],
  )

  const openAdd = () => {
    setAmount('')
    setDead('')
    setNote('')
    setDialog('add')
  }
  const openDeath = () => {
    setAmount('')
    setNote('')
    setDialog('death')
  }
  const openSet = () => {
    setAmount(String(available))
    setNote('')
    setDialog('set')
  }
  const openThreshold = () => {
    setAmount(String(lowThreshold))
    setNote('')
    setDialog('threshold')
  }

  const submit = async () => {
    setBusy(true)
    let res
    if (dialog === 'add') res = await addStock(amount, dead, note, user)
    else if (dialog === 'death') res = await recordDeath(amount, note, user)
    else if (dialog === 'set') res = await setStockAvailable(amount, user, note)
    else res = await setLowThreshold(amount)
    setBusy(false)
    if (res?.error) return toast(res.error, 'error')
    toast(
      dialog === 'add'
        ? 'تمت إضافة المخزون'
        : dialog === 'death'
          ? 'تم تسجيل النفوق'
          : dialog === 'set'
            ? 'تم تعديل الرصيد'
            : 'تم تحديث الحدّ الأدنى',
      'success',
    )
    setDialog(null)
  }

  const handleEditSave = async (patch) => {
    const res = await updateMovement(editing, patch)
    if (!res.error) toast('تم تعديل الحركة', 'success')
    return res
  }

  const handleDeleteMovement = async (m) => {
    const meta = TYPE_META[m.type] || TYPE_META.adjust
    const linked = m.type === 'sale' || m.type === 'return'
    const ok = await confirm({
      title: 'حذف حركة',
      message: linked
        ? `ستُحذف حركة «${meta.label}» ويُعاد ${formatInt(Math.abs(m.delta))} كتكوت إلى الرصيد، لكن سجل البيع نفسه لن يُحذف. الأفضل استخدام «إرجاع» في صفحة المبيعات.`
        : `ستُحذف حركة «${meta.label}» (${m.delta >= 0 ? '+' : ''}${formatInt(m.delta)}) ويُعاد أثرها على الرصيد.`,
      confirmLabel: 'حذف',
      tone: 'danger',
    })
    if (!ok) return
    const { error } = await deleteMovement(m)
    toast(error || 'تم حذف الحركة', error ? 'error' : 'success')
  }

  const dialogMeta = {
    add: { title: 'إضافة مخزون', icon: Plus, cta: 'إضافة' },
    death: { title: 'تسجيل نفوق', icon: Skull, cta: 'تسجيل' },
    set: { title: 'تعديل الرصيد', icon: Pencil, cta: 'حفظ' },
    threshold: { title: 'الحدّ الأدنى للمخزون', icon: AlertTriangle, cta: 'حفظ' },
  }[dialog || 'add']

  const netAdded = (Math.round(Number(amount)) || 0) - (Math.max(0, Math.round(Number(dead)) || 0) || 0)

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 pb-28 sm:py-8 md:pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
        <h1 className="text-lg font-bold text-fg sm:text-xl">المخزون</h1>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={Skull} onClick={openDeath}>
            تسجيل نفوق
          </Button>
          <Button size="sm" variant="secondary" icon={Pencil} onClick={openSet}>
            تعديل الرصيد
          </Button>
          <Button size="sm" icon={Plus} onClick={openAdd}>
            إضافة مخزون
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div
          className={`col-span-2 rounded-2xl border p-4 shadow-card sm:p-5 ${
            low ? 'border-danger/40 bg-danger/[0.06]' : 'border-line bg-surface'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] font-medium text-fg-dim">
              <span
                className={`grid h-8 w-8 place-items-center rounded-lg ${
                  low ? 'bg-danger/15 text-danger-bright' : 'bg-brand/15 text-brand-bright'
                }`}
              >
                <Boxes className="h-[18px] w-[18px]" aria-hidden />
              </span>
              المخزون المتاح
            </span>
            <button
              onClick={openThreshold}
              className="ring-focus rounded-lg px-2 py-1 text-[12px] font-medium text-fg-mute transition-colors hover:bg-surface-hi hover:text-fg-dim"
            >
              الحدّ الأدنى: {formatInt(lowThreshold)}
            </button>
          </div>
          <p
            className={`tnum mt-3 text-4xl font-bold sm:text-5xl ${
              low ? 'text-danger-bright' : 'text-fg'
            }`}
          >
            {formatInt(available)}
          </p>
          <p className="mt-1 text-[12px] text-fg-mute">
            {low ? (
              <span className="inline-flex items-center gap-1 text-danger-bright">
                <AlertTriangle className="h-3.5 w-3.5" />
                المخزون منخفض — يُنصح بإضافة مخزون
              </span>
            ) : updatedAt ? (
              `آخر تحديث ${formatRelative(updatedAt)}`
            ) : (
              'لم يُسجَّل مخزون بعد'
            )}
          </p>
        </div>

        <KpiCard
          label="مُباع اليوم"
          value={formatInt(todaySold)}
          sub="كتكوت"
          icon={ArrowDownRight}
          accent="warn"
        />
        <KpiCard
          label="النافق (مُسجَّل)"
          value={formatInt(totalDead)}
          sub="توريد + نفوق"
          icon={Skull}
          accent="danger"
        />
      </div>

      <div className="mt-5 sm:mt-6">
        <StockLedger
          movements={movements}
          loading={loading}
          filter={filter}
          onFilter={setFilter}
          onEdit={setEditing}
          onDelete={handleDeleteMovement}
        />
      </div>

      <Modal
        isOpen={Boolean(dialog)}
        onClose={() => setDialog(null)}
        title={dialogMeta.title}
        icon={dialogMeta.icon}
        size="sm"
      >
        <div className="space-y-4">
          {dialog === 'add' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="الكمية المستلمة"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
                <Field
                  label="منها نافقة"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={dead}
                  onChange={(e) => setDead(e.target.value)}
                  hint="اختياري"
                />
              </div>
              {dead !== '' && Number(dead) > 0 && (
                <p className="-mt-1 text-[12px] text-fg-mute">
                  يُضاف للمخزون <b className="tnum text-fg-dim">{formatInt(netAdded)}</b> كتكوت، ويُسجَّل{' '}
                  <b className="tnum text-danger-bright">{formatInt(Number(dead))}</b> نافقاً.
                </p>
              )}
              <Field
                label="ملاحظة (اختياري)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: توريد من المفرخة"
              />
            </>
          )}
          {dialog === 'death' && (
            <>
              <Field
                label="عدد النافق"
                type="number"
                inputMode="numeric"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                hint="يُخصم من المخزون المتاح."
                autoFocus
              />
              <Field
                label="السبب (اختياري)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: نفوق أثناء النقل"
              />
            </>
          )}
          {dialog === 'set' && (
            <>
              <Field
                label="الرصيد الفعلي"
                type="number"
                inputMode="numeric"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                hint="يُسجَّل الفرق كحركة تعديل."
                autoFocus
              />
              <Field
                label="السبب (اختياري)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: جرد"
              />
            </>
          )}
          {dialog === 'threshold' && (
            <Field
              label="نبّهني عندما ينزل المخزون إلى"
              type="number"
              inputMode="numeric"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              hint="ضع 0 لإيقاف التنبيه."
              autoFocus
            />
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setDialog(null)}>
              إلغاء
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? '...' : dialogMeta.cta}
            </Button>
          </div>
        </div>
      </Modal>

      <EditMovementDialog
        movement={editing}
        onClose={() => setEditing(null)}
        onSave={handleEditSave}
      />
    </div>
  )
}
