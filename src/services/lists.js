import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

// A "list" is a dated batch with a total quantity capacity (e.g. a shipment of
// chicks received on a given date). `listEntries` are the individual clients
// drawn against that capacity; their quantities can never push the list's
// running `usedQty` past its `quantity`.
const listsCol = collection(db, 'lists')
const entriesCol = collection(db, 'listEntries')

const MSG = 'حدث خطأ أثناء حفظ اللائحة'

/** Parse a "YYYY-MM-DD" input value as a local-midnight Date (avoids UTC day-shift). */
export function dateInputToDate(value) {
  const [y, m, d] = String(value)
    .split('-')
    .map((n) => parseInt(n, 10))
  if (!y || !m || !d) return new Date()
  return new Date(y, m - 1, d)
}

/** Inverse of dateInputToDate — for pre-filling a <input type="date">. */
export function dateToInputValue(iso) {
  try {
    const d = new Date(iso)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return ''
  }
}

function mapList(snap) {
  const d = snap.data()
  const quantity = Number(d.quantity) || 0
  const usedQty = Number(d.usedQty) || 0
  return {
    id: snap.id,
    title: d.title ?? '',
    quantity,
    usedQty,
    remaining: quantity - usedQty,
    archived: d.archived === true,
    notes: d.notes ?? '',
    createdByName: d.createdByName ?? '',
    date: d.date?.toDate?.().toISOString() ?? new Date().toISOString(),
    createdAt: d.timestamp?.toDate?.().toISOString() ?? new Date().toISOString(),
  }
}

function mapEntry(snap) {
  const d = snap.data()
  return {
    id: snap.id,
    listId: d.listId ?? '',
    clientName: d.clientName ?? '',
    phoneNumber: d.phoneNumber ?? '',
    quantity: Number(d.quantity) || 0,
    confirmed: d.confirmed === true,
    notes: d.notes ?? '',
    createdByName: d.createdByName ?? '',
    date: d.timestamp?.toDate?.().toISOString() ?? new Date().toISOString(),
  }
}

export function subscribeLists(onData, onError) {
  const q = query(listsCol, orderBy('date', 'desc'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(mapList)),
    (err) => {
      console.error('Error listening to lists:', err)
      onError?.('حدث خطأ أثناء الاستماع للوائح')
    },
  )
}

/**
 * Entries for one list. Filtered by `listId` only (no orderBy) so it doesn't
 * need a composite index — sorted newest-first client-side instead.
 */
export function subscribeListEntries(listId, onData, onError) {
  const q = query(entriesCol, where('listId', '==', listId))
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map(mapEntry)
      rows.sort((a, b) => new Date(b.date) - new Date(a.date))
      onData(rows)
    },
    (err) => {
      console.error('Error listening to list entries:', err)
      onError?.('حدث خطأ أثناء الاستماع لعملاء اللائحة')
    },
  )
}

export async function addList({ title, date, quantity, notes }, author) {
  const qty = Math.max(0, Math.round(Number(quantity)) || 0)
  if (qty <= 0) return { id: null, error: 'أدخل كمية صحيحة أكبر من 0' }
  try {
    const ref = await addDoc(listsCol, {
      title: title?.trim() || '',
      date: dateInputToDate(date),
      quantity: qty,
      usedQty: 0,
      notes: notes?.trim() || '',
      createdByName: author?.name ?? '',
      timestamp: serverTimestamp(),
    })
    return { id: ref.id, error: null }
  } catch (err) {
    console.error('Error adding list:', err)
    return { id: null, error: MSG }
  }
}

export async function updateList(id, { title, date, quantity, notes }, existing) {
  const qty = Math.max(0, Math.round(Number(quantity)) || 0)
  if (qty <= 0) return { error: 'أدخل كمية صحيحة أكبر من 0' }
  if (qty < existing.usedQty)
    return {
      error: `لا يمكن تصغير السعة إلى أقل من الكمية المستعملة حالياً (${existing.usedQty})`,
    }
  try {
    await updateDoc(doc(db, 'lists', id), {
      title: title?.trim() || '',
      date: dateInputToDate(date),
      quantity: qty,
      notes: notes?.trim() || '',
    })
    return { error: null }
  } catch (err) {
    console.error('Error updating list:', err)
    return { error: MSG }
  }
}

/** Move a whole list (with its clients) to the archive, or bring it back. */
export async function setListArchived(list, archived) {
  try {
    await updateDoc(doc(db, 'lists', list.id), { archived })
    return { error: null }
  } catch (err) {
    console.error('Error archiving list:', err)
    return { error: archived ? 'حدث خطأ أثناء أرشفة اللائحة' : 'حدث خطأ أثناء إعادة اللائحة' }
  }
}

const BATCH_LIMIT = 400

export async function deleteList(list) {
  try {
    const snap = await getDocs(query(entriesCol, where('listId', '==', list.id)))
    for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db)
      snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref))
      // eslint-disable-next-line no-await-in-loop
      await batch.commit()
    }
    await deleteDoc(doc(db, 'lists', list.id))
    return { error: null }
  } catch (err) {
    console.error('Error deleting list:', err)
    return { error: 'حدث خطأ أثناء حذف اللائحة' }
  }
}

/**
 * Add a client entry to a list. Runs as a transaction so the capacity check
 * (`usedQty + qty <= quantity`) is race-safe against concurrent additions.
 * Returns `{ error: 'اللائحة ممتلئة...' }` without writing anything when the
 * entry would exceed the list's remaining capacity.
 */
export async function addListEntry(listId, { clientName, phoneNumber, quantity, notes }, author) {
  const qty = Math.max(0, Math.round(Number(quantity)) || 0)
  if (!clientName?.trim()) return { error: 'اسم العميل مطلوب' }
  if (qty <= 0) return { error: 'الكمية يجب أن تكون أكبر من 0' }
  try {
    let capacityError = null
    await runTransaction(db, async (tx) => {
      const listRef = doc(db, 'lists', listId)
      const listSnap = await tx.get(listRef)
      if (!listSnap.exists()) throw new Error('اللائحة غير موجودة')
      const d = listSnap.data()
      const capacity = Number(d.quantity) || 0
      const used = Number(d.usedQty) || 0
      const remaining = capacity - used
      if (qty > remaining) {
        capacityError = `تم بلوغ الحدّ الأقصى للائحة — الباقي ${remaining} فقط`
        return
      }
      tx.set(doc(entriesCol), {
        listId,
        clientName: clientName.trim(),
        phoneNumber: phoneNumber?.trim() || '',
        quantity: qty,
        notes: notes?.trim() || '',
        createdByName: author?.name ?? '',
        timestamp: serverTimestamp(),
      })
      tx.update(listRef, { usedQty: used + qty })
    })
    if (capacityError) return { error: capacityError }
    return { error: null }
  } catch (err) {
    console.error('Error adding list entry:', err)
    return { error: err?.message || 'حدث خطأ أثناء إضافة العميل' }
  }
}

/** Edit an entry's fields. Quantity changes re-check capacity against the list. */
export async function updateListEntry(entry, { clientName, phoneNumber, quantity, notes }) {
  const qty = Math.max(0, Math.round(Number(quantity)) || 0)
  if (!clientName?.trim()) return { error: 'اسم العميل مطلوب' }
  if (qty <= 0) return { error: 'الكمية يجب أن تكون أكبر من 0' }
  try {
    let capacityError = null
    await runTransaction(db, async (tx) => {
      const listRef = doc(db, 'lists', entry.listId)
      const listSnap = await tx.get(listRef)
      if (!listSnap.exists()) throw new Error('اللائحة غير موجودة')
      const d = listSnap.data()
      const capacity = Number(d.quantity) || 0
      const used = Number(d.usedQty) || 0
      const remaining = capacity - used + (Number(entry.quantity) || 0)
      if (qty > remaining) {
        capacityError = `تم بلوغ الحدّ الأقصى للائحة — الباقي ${remaining} فقط`
        return
      }
      tx.update(doc(db, 'listEntries', entry.id), {
        clientName: clientName.trim(),
        phoneNumber: phoneNumber?.trim() || '',
        quantity: qty,
        notes: notes?.trim() || '',
      })
      tx.update(listRef, { usedQty: used - (Number(entry.quantity) || 0) + qty })
    })
    if (capacityError) return { error: capacityError }
    return { error: null }
  } catch (err) {
    console.error('Error updating list entry:', err)
    return { error: err?.message || 'حدث خطأ أثناء تحديث العميل' }
  }
}

/** Mark a client's final order as confirmed (or undo it). Doesn't touch capacity. */
export async function setListEntryConfirmed(entry, confirmed) {
  try {
    await updateDoc(doc(db, 'listEntries', entry.id), { confirmed })
    return { error: null }
  } catch (err) {
    console.error('Error confirming list entry:', err)
    return { error: 'حدث خطأ أثناء تأكيد العميل' }
  }
}

export async function deleteListEntry(entry) {
  try {
    await runTransaction(db, async (tx) => {
      const listRef = doc(db, 'lists', entry.listId)
      const listSnap = await tx.get(listRef)
      if (listSnap.exists()) {
        const used = Number(listSnap.data().usedQty) || 0
        tx.update(listRef, { usedQty: Math.max(0, used - (Number(entry.quantity) || 0)) })
      }
      tx.delete(doc(db, 'listEntries', entry.id))
    })
    return { error: null }
  } catch (err) {
    console.error('Error deleting list entry:', err)
    return { error: 'حدث خطأ أثناء حذف العميل' }
  }
}
