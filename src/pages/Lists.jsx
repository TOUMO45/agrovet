import { useMemo, useState } from 'react'
import { ClipboardList, Plus, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLists } from '../hooks/useLists'
import { useListEntries } from '../hooks/useListEntries'
import {
  addList,
  addListEntry,
  deleteList,
  deleteListEntry,
  setListArchived,
  setListEntryConfirmed,
  updateList,
  updateListEntry,
} from '../services/lists'
import { formatDate, formatInt } from '../utils/format'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmProvider'
import ListCard from '../components/ListCard'
import ListForm from '../components/ListForm'
import ListEntryForm from '../components/ListEntryForm'
import ListEntriesTable from '../components/ListEntriesTable'
import NotifyClientsDialog from '../components/NotifyClientsDialog'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Fab from '../components/Fab'

export default function Lists() {
  const { lists: allLists, loading } = useLists()
  const lists = useMemo(() => allLists.filter((l) => !l.archived), [allLists])
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()

  const [showAddList, setShowAddList] = useState(false)
  const [editingList, setEditingList] = useState(null)
  const [activeListId, setActiveListId] = useState(null)
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [smsEntry, setSmsEntry] = useState(null)

  const activeList = useMemo(() => lists.find((l) => l.id === activeListId) || null, [lists, activeListId])
  const { entries, loading: entriesLoading } = useListEntries(activeListId)

  const handleAddList = async (payload) => {
    const { error } = await addList(payload, user)
    if (error) throw new Error(error)
    toast('تمت إضافة اللائحة', 'success')
  }

  const handleUpdateList = async (payload) => {
    const existing = lists.find((l) => l.id === editingList.id)
    if (!existing) return
    const { error } = await updateList(editingList.id, payload, existing)
    if (error) throw new Error(error)
    toast('تم تحديث اللائحة', 'success')
  }

  const handleDeleteList = async (list) => {
    const ok = await confirm({
      title: 'حذف اللائحة',
      message: `سيُحذف «${list.title || formatDate(list.date)}» وكل عملائها (${entries.length ? formatInt(entries.length) : ''}) نهائياً.`,
      confirmLabel: 'حذف',
      tone: 'danger',
    })
    if (!ok) return
    const { error } = await deleteList(list)
    toast(error || 'تم حذف اللائحة', error ? 'error' : 'success')
    if (activeListId === list.id) setActiveListId(null)
  }

  const handleArchiveList = async (list) => {
    const ok = await confirm({
      title: 'أرشفة اللائحة',
      message: `نقل «${list.title || formatDate(list.date)}» مع كل عملائها إلى الأرشيف؟ يمكنك إعادتها من صفحة الأرشيف.`,
      confirmLabel: 'أرشفة',
    })
    if (!ok) return
    const { error } = await setListArchived(list, true)
    toast(error || 'تم نقل اللائحة إلى الأرشيف', error ? 'error' : 'success')
    if (!error && activeListId === list.id) setActiveListId(null)
  }

  const handleAddEntry = async (payload) => {
    const { error } = await addListEntry(activeList.id, payload, user)
    if (error) throw new Error(error)
    toast('تمت إضافة العميل', 'success')
  }

  const handleUpdateEntry = async (payload) => {
    const { error } = await updateListEntry(editingEntry, payload)
    if (error) throw new Error(error)
    toast('تم تحديث العميل', 'success')
  }

  const handleConfirmEntry = async (entry, confirmed) => {
    const { error } = await setListEntryConfirmed(entry, confirmed)
    if (error) toast(error, 'error')
  }

  // The SMS dialog is shared with the home page, which works on orders.
  const smsRecipients = useMemo(
    () =>
      smsEntry
        ? [{ id: smsEntry.id, customerName: smsEntry.clientName, phoneNumber: smsEntry.phoneNumber, quantity: smsEntry.quantity }]
        : [],
    [smsEntry],
  )

  const handleDeleteEntry = async (entry) => {
    const ok = await confirm({
      title: 'حذف العميل',
      message: `سيُحذف «${entry.clientName}» من هذه اللائحة، وتُعاد ${formatInt(entry.quantity)} إلى السعة المتاحة.`,
      confirmLabel: 'حذف',
      tone: 'danger',
    })
    if (!ok) return
    const { error } = await deleteListEntry(entry)
    toast(error || 'تم حذف العميل', error ? 'error' : 'success')
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 pb-28 sm:py-8 md:pb-8">
      <div className="mb-4 flex items-center justify-between gap-2 sm:mb-5">
        <h1 className="text-lg font-bold text-fg sm:text-xl">القوائم</h1>
        <Button
          size="sm"
          icon={Plus}
          onClick={() => setShowAddList(true)}
          className="hidden sm:inline-flex"
        >
          لائحة جديدة
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-hi/50" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-card">
          <ClipboardList className="mx-auto h-8 w-8 text-fg-mute" aria-hidden />
          <p className="mt-3 text-sm text-fg-mute">لا توجد لوائح بعد</p>
          <p className="mt-1 text-[12px] text-fg-mute">أضف لائحة جديدة بتاريخ وكمية إجمالية، ثم أضف عملاءها.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onOpen={(l) => setActiveListId(l.id)}
              onEdit={setEditingList}
              onArchive={handleArchiveList}
              onDelete={handleDeleteList}
            />
          ))}
        </div>
      )}

      <Fab label="لائحة جديدة" onClick={() => setShowAddList(true)} />

      <Modal isOpen={showAddList} onClose={() => setShowAddList(false)} title="لائحة جديدة" icon={Plus}>
        <ListForm onSubmit={handleAddList} onClose={() => setShowAddList(false)} />
      </Modal>

      <Modal isOpen={Boolean(editingList)} onClose={() => setEditingList(null)} title="تعديل اللائحة">
        {editingList && (
          <ListForm initialData={editingList} onSubmit={handleUpdateList} onClose={() => setEditingList(null)} />
        )}
      </Modal>

      <Modal
        isOpen={Boolean(activeList)}
        onClose={() => setActiveListId(null)}
        title={activeList?.title || (activeList ? formatDate(activeList.date) : '')}
        subtitle={activeList ? formatDate(activeList.date) : undefined}
        icon={ClipboardList}
        size="lg"
        headerActions={
          activeList && (
            <Button
              size="sm"
              variant="secondary"
              icon={UserPlus}
              onClick={() => setShowAddEntry(true)}
              disabled={activeList.remaining <= 0}
            >
              إضافة عميل
            </Button>
          )
        }
      >
        {activeList && (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-night-raised px-4 py-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-fg-dim">المستعمل من السعة</span>
                <span className="tnum font-semibold text-fg">
                  {formatInt(activeList.usedQty)} / {formatInt(activeList.quantity)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-hi">
                <div
                  className={`h-full rounded-full ${activeList.remaining <= 0 ? 'bg-danger' : 'bg-brand'}`}
                  style={{
                    width: `${activeList.quantity > 0 ? Math.min(100, (activeList.usedQty / activeList.quantity) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-[12px] text-fg-mute">
                {activeList.remaining <= 0
                  ? 'اللائحة ممتلئة — لا يمكن إضافة المزيد.'
                  : `الباقي: ${formatInt(activeList.remaining)}`}
              </p>
            </div>

            <ListEntriesTable
              entries={entries}
              loading={entriesLoading}
              onEdit={setEditingEntry}
              onDelete={handleDeleteEntry}
              onSms={setSmsEntry}
              onConfirm={handleConfirmEntry}
            />
          </div>
        )}
      </Modal>

      <NotifyClientsDialog
        isOpen={Boolean(smsEntry)}
        onClose={() => setSmsEntry(null)}
        orders={smsRecipients}
      />

      <Modal isOpen={showAddEntry} onClose={() => setShowAddEntry(false)} title="إضافة عميل" icon={UserPlus} size="sm">
        {activeList && (
          <ListEntryForm
            maxQty={activeList.remaining}
            onSubmit={handleAddEntry}
            onClose={() => setShowAddEntry(false)}
          />
        )}
      </Modal>

      <Modal isOpen={Boolean(editingEntry)} onClose={() => setEditingEntry(null)} title="تعديل العميل" size="sm">
        {editingEntry && activeList && (
          <ListEntryForm
            initialData={editingEntry}
            maxQty={activeList.remaining + editingEntry.quantity}
            onSubmit={handleUpdateEntry}
            onClose={() => setEditingEntry(null)}
          />
        )}
      </Modal>
    </div>
  )
}
