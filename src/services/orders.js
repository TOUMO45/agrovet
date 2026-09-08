import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { orderUnitPrice } from '../utils/format'

const activeCol = collection(db, 'activeOrders')
const archivedCol = collection(db, 'archivedOrders')

function mapOrder(snap, { withArchivedAt = false } = {}) {
  const d = snap.data()
  const base = {
    id: snap.id,
    customerName: d.customerName ?? '',
    phoneNumber: d.phoneNumber ?? '',
    quantity: d.quantity ?? 0,
    unitPrice: typeof d.unitPrice === 'number' ? d.unitPrice : undefined,
    totalPrice: d.totalPrice ?? 0,
    notes: d.notes ?? '',
    confirmed: d.confirmed === true,
    createdBy: d.createdBy ?? null,
    createdByName: d.createdByName ?? '',
    date: d.timestamp?.toDate?.().toISOString() ?? new Date().toISOString(),
  }
  if (withArchivedAt) {
    base.archivedAt = d.archivedAt?.toDate?.().toISOString() ?? null
  }
  return base
}

export function subscribeActiveOrders(onData, onError) {
  const q = query(activeCol, orderBy('timestamp', 'desc'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((s) => mapOrder(s))),
    (err) => {
      console.error('Error listening to active orders:', err)
      onError?.('حدث خطأ أثناء الاستماع لتحديثات الطلبات')
    },
  )
}

export function subscribeArchivedOrders(onData, onError) {
  const q = query(archivedCol, orderBy('timestamp', 'desc'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((s) => mapOrder(s, { withArchivedAt: true }))),
    (err) => {
      console.error('Error listening to archived orders:', err)
      onError?.('حدث خطأ أثناء الاستماع لتحديثات الأرشيف')
    },
  )
}

export async function addOrder({ customerName, phoneNumber, quantity, notes }, currentPrice, author) {
  try {
    const qty = Number(quantity)
    const unitPrice = Number(currentPrice) || 0
    const ref = await addDoc(activeCol, {
      customerName,
      phoneNumber,
      quantity: qty,
      unitPrice,
      totalPrice: qty * unitPrice,
      notes: notes || '',
      confirmed: false,
      createdBy: author?.uid ?? null,
      createdByName: author?.name ?? '',
      timestamp: serverTimestamp(),
    })
    return { id: ref.id, error: null }
  } catch (err) {
    console.error('Error adding order:', err)
    return { id: null, error: 'حدث خطأ أثناء حفظ الطلب' }
  }
}

/**
 * Update an order. Unit price is locked once an order is confirmed; while it is
 * still pending it tracks the current global price. Changing the quantity always
 * recomputes the total from the effective unit price.
 */
export async function updateOrder(id, patch, existing, currentPrice) {
  try {
    const quantity = Number(patch.quantity ?? existing.quantity)
    const lockedUnit = orderUnitPrice(existing, currentPrice)
    const unitPrice = existing.confirmed ? lockedUnit : Number(currentPrice) || lockedUnit
    await updateDoc(doc(db, 'activeOrders', id), {
      customerName: patch.customerName ?? existing.customerName,
      phoneNumber: patch.phoneNumber ?? existing.phoneNumber,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
      notes: patch.notes ?? existing.notes,
      confirmed: patch.confirmed ?? existing.confirmed,
    })
    return { error: null }
  } catch (err) {
    console.error('Error updating order:', err)
    return { error: 'حدث خطأ أثناء تحديث الطلب' }
  }
}

export async function setOrderConfirmed(order, confirmed, currentPrice) {
  try {
    const patch = { confirmed }
    if (confirmed) {
      // Freeze the price at the moment of confirmation.
      const unitPrice = orderUnitPrice(order, currentPrice)
      patch.unitPrice = unitPrice
      patch.totalPrice = order.quantity * unitPrice
    }
    await updateDoc(doc(db, 'activeOrders', order.id), patch)
    return { error: null }
  } catch (err) {
    console.error('Error updating order status:', err)
    return { error: 'حدث خطأ أثناء تأكيد الطلب' }
  }
}

export async function deleteOrder(id, fromArchive = false) {
  try {
    await deleteDoc(doc(db, fromArchive ? 'archivedOrders' : 'activeOrders', id))
    return { error: null }
  } catch (err) {
    console.error('Error deleting order:', err)
    return { error: 'حدث خطأ أثناء حذف الطلب' }
  }
}

export async function archiveOrder(order) {
  try {
    await addDoc(archivedCol, {
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      quantity: order.quantity,
      unitPrice: orderUnitPrice(order),
      totalPrice: order.totalPrice,
      notes: order.notes || '',
      confirmed: order.confirmed === true,
      createdBy: order.createdBy ?? null,
      createdByName: order.createdByName ?? '',
      timestamp: serverTimestamp(),
      archivedAt: serverTimestamp(),
    })
    await deleteDoc(doc(db, 'activeOrders', order.id))
    return { error: null }
  } catch (err) {
    console.error('Error archiving order:', err)
    return { error: 'حدث خطأ أثناء أرشفة الطلب' }
  }
}

export async function restoreOrder(order, currentPrice) {
  try {
    const unitPrice = orderUnitPrice(order, currentPrice)
    await addDoc(activeCol, {
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      quantity: order.quantity,
      unitPrice,
      totalPrice: order.quantity * unitPrice,
      notes: order.notes || '',
      confirmed: order.confirmed === true,
      createdBy: order.createdBy ?? null,
      createdByName: order.createdByName ?? '',
      timestamp: serverTimestamp(),
    })
    await deleteDoc(doc(db, 'archivedOrders', order.id))
    return { error: null }
  } catch (err) {
    console.error('Error restoring order:', err)
    return { error: 'حدث خطأ أثناء استعادة الطلب' }
  }
}

export async function archiveMany(orders) {
  const results = await Promise.allSettled(orders.map((o) => archiveOrder(o)))
  const failed = results.filter((r) => r.status === 'rejected' || r.value?.error)
  return { error: failed.length ? 'حدث خطأ أثناء أرشفة بعض الطلبات' : null }
}

const BATCH_LIMIT = 400

async function batchedDelete(refs) {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref))
    // eslint-disable-next-line no-await-in-loop
    await batch.commit()
  }
}

/** Permanently delete every archived order. Returns { deleted, error }. */
export async function deleteAllArchived() {
  try {
    const snap = await getDocs(archivedCol)
    await batchedDelete(snap.docs.map((d) => d.ref))
    return { deleted: snap.size, error: null }
  } catch (err) {
    console.error('Error clearing archive:', err)
    return { deleted: 0, error: 'حدث خطأ أثناء حذف الأرشيف' }
  }
}

/** Permanently delete the given archived order ids. */
export async function deleteArchivedByIds(ids = []) {
  try {
    await batchedDelete(ids.map((id) => doc(db, 'archivedOrders', id)))
    return { deleted: ids.length, error: null }
  } catch (err) {
    console.error('Error deleting archived orders:', err)
    return { deleted: 0, error: 'حدث خطأ أثناء حذف الطلبات المحددة' }
  }
}

/**
 * Keep pending (unconfirmed) orders in step with the current global price.
 * Runs as ONE batched write and only touches docs that are actually stale —
 * this replaces the original per-render write storm.
 */
export async function syncUnconfirmedOrderPrices(orders, currentPrice) {
  const price = Number(currentPrice) || 0
  const stale = orders.filter(
    (o) => !o.confirmed && Math.abs((o.unitPrice ?? -1) - price) > 1e-9,
  )
  if (stale.length === 0) return { error: null, updated: 0 }
  try {
    const batch = writeBatch(db)
    stale.forEach((o) => {
      batch.update(doc(db, 'activeOrders', o.id), {
        unitPrice: price,
        totalPrice: (Number(o.quantity) || 0) * price,
      })
    })
    await batch.commit()
    return { error: null, updated: stale.length }
  } catch (err) {
    console.error('Error syncing order prices:', err)
    return { error: 'حدث خطأ أثناء تحديث أسعار الطلبات', updated: 0 }
  }
}
