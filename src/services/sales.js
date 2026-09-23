import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { orderUnitPrice } from '../utils/format'
import { readStockInTx, setStockBalanceInTx, writeMovementInTx } from './stock'

const soldCol = collection(db, 'soldOrders')
const activeCol = collection(db, 'activeOrders')

function mapSale(snap) {
  const d = snap.data()
  return {
    id: snap.id,
    customerName: d.customerName ?? '',
    phoneNumber: d.phoneNumber ?? '',
    quantity: Number(d.quantity) || 0,
    unitPrice: typeof d.unitPrice === 'number' ? d.unitPrice : undefined,
    totalPrice: Number(d.totalPrice) || 0,
    notes: d.notes ?? '',
    confirmed: true,
    createdBy: d.createdBy ?? null,
    createdByName: d.createdByName ?? '',
    soldByName: d.soldByName ?? '',
    date: d.timestamp?.toDate?.().toISOString() ?? new Date().toISOString(),
    soldAt: d.soldAt?.toDate?.().toISOString() ?? null,
  }
}

export function subscribeSoldOrders(onData, onError) {
  const q = query(soldCol, orderBy('soldAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(mapSale)),
    (err) => {
      console.error('Error listening to sales:', err)
      onError?.('حدث خطأ أثناء الاستماع للمبيعات')
    },
  )
}

/**
 * Complete a sale: freeze the unit price, cut stock by the order quantity,
 * append a `sale` ledger entry, move the order into `soldOrders`, and remove it
 * from `activeOrders` — all atomically. Returns { error, balanceAfter }.
 */
export async function sellOrder(order, currentPrice, author) {
  const qty = Number(order.quantity) || 0
  const unitPrice = orderUnitPrice(order, currentPrice)
  const totalPrice = Math.round(qty * unitPrice * 100) / 100

  try {
    const balanceAfter = await runTransaction(db, async (tx) => {
      const { exists, available } = await readStockInTx(tx)
      const bal = available - qty
      setStockBalanceInTx(tx, exists, bal)

      const saleRef = doc(soldCol)
      tx.set(saleRef, {
        customerName: order.customerName ?? '',
        phoneNumber: order.phoneNumber ?? '',
        quantity: qty,
        unitPrice,
        totalPrice,
        notes: order.notes ?? '',
        confirmed: true,
        createdBy: order.createdBy ?? null,
        createdByName: order.createdByName ?? '',
        timestamp: order.date ? Timestamp.fromDate(new Date(order.date)) : serverTimestamp(),
        soldAt: serverTimestamp(),
        soldByName: author?.name ?? '',
        originalOrderId: order.id,
      })

      writeMovementInTx(tx, {
        type: 'sale',
        delta: -qty,
        balanceAfter: bal,
        note: '',
        ref: order.customerName ?? '',
        orderId: saleRef.id,
        createdByName: author?.name ?? '',
      })

      tx.delete(doc(activeCol, order.id))
      return bal
    })
    return { error: null, balanceAfter }
  } catch (err) {
    console.error('Error completing sale:', err)
    return { error: 'حدث خطأ أثناء إتمام البيع', balanceAfter: null }
  }
}

/**
 * Reverse a sale: put the quantity back into stock, recreate the order in
 * `activeOrders` (kept as ready, with its price locked), append a `return`
 * ledger entry, and delete the sale record.
 */
export async function undoSale(sale, author) {
  const qty = Number(sale.quantity) || 0
  try {
    const balanceAfter = await runTransaction(db, async (tx) => {
      const { exists, available } = await readStockInTx(tx)
      const bal = available + qty
      setStockBalanceInTx(tx, exists, bal)

      const backRef = doc(activeCol)
      tx.set(backRef, {
        customerName: sale.customerName ?? '',
        phoneNumber: sale.phoneNumber ?? '',
        quantity: qty,
        unitPrice: orderUnitPrice(sale),
        totalPrice: Number(sale.totalPrice) || 0,
        notes: sale.notes ?? '',
        confirmed: true,
        priceOverridden: true,
        createdBy: sale.createdBy ?? null,
        createdByName: sale.createdByName ?? '',
        timestamp: serverTimestamp(),
      })

      writeMovementInTx(tx, {
        type: 'return',
        delta: qty,
        balanceAfter: bal,
        note: 'إرجاع بيع',
        ref: sale.customerName ?? '',
        orderId: null,
        createdByName: author?.name ?? '',
      })

      tx.delete(doc(soldCol, sale.id))
      return bal
    })
    return { error: null, balanceAfter }
  } catch (err) {
    console.error('Error undoing sale:', err)
    return { error: 'حدث خطأ أثناء إرجاع البيع', balanceAfter: null }
  }
}

/** Delete a sale record only. Stock is left untouched. */
export async function deleteSale(id) {
  try {
    await deleteDoc(doc(soldCol, id))
    return { error: null }
  } catch (err) {
    console.error('Error deleting sale:', err)
    return { error: 'حدث خطأ أثناء حذف السجل' }
  }
}
