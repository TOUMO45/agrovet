import {
  doc,
  collection,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

// Single shared stock document + an append-only movement ledger.
export const stockDoc = doc(db, 'settings', 'stock')
export const movementsCol = collection(db, 'stockMovements')

const MSG = 'حدث خطأ أثناء تحديث المخزون'

function mapMovement(snap) {
  const d = snap.data()
  return {
    id: snap.id,
    type: d.type || 'adjust', // restock | sale | adjust | return | death
    delta: Number(d.delta) || 0,
    balanceAfter: Number(d.balanceAfter) || 0,
    received: Number(d.received) || 0, // gross qty received on a restock
    dead: Number(d.dead) || 0, // chicks dead on arrival / recorded mortality
    note: d.note || '',
    ref: d.ref || '', // customer name for sales / returns
    orderId: d.orderId || null,
    createdByName: d.createdByName || '',
    date: d.timestamp?.toDate?.().toISOString() ?? new Date().toISOString(),
  }
}

export function subscribeStock(onData, onError) {
  return onSnapshot(
    stockDoc,
    (snap) => {
      const d = snap.data() || {}
      onData({
        available: Number(d.available) || 0,
        lowThreshold: Number(d.lowThreshold) || 0,
        updatedAt: d.updatedAt?.toDate?.().toISOString() ?? null,
      })
    },
    (err) => {
      console.error('Error listening to stock:', err)
      onError?.('حدث خطأ أثناء الاستماع للمخزون')
    },
  )
}

export function subscribeStockMovements(onData, onError, max = 200) {
  const q = query(movementsCol, orderBy('timestamp', 'desc'), limit(max))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(mapMovement)),
    (err) => {
      console.error('Error listening to stock movements:', err)
      onError?.('حدث خطأ أثناء جلب سجل الحركات')
    },
  )
}

/** Read the stock doc inside a transaction. Missing doc reads as zero. */
export async function readStockInTx(tx) {
  const snap = await tx.get(stockDoc)
  const d = snap.exists() ? snap.data() : {}
  return {
    exists: snap.exists(),
    available: Number(d.available) || 0,
    lowThreshold: Number(d.lowThreshold) || 0,
  }
}

/** Write the new balance inside a transaction, creating the doc if needed. */
export function setStockBalanceInTx(tx, exists, balanceAfter) {
  if (exists) {
    tx.update(stockDoc, { available: balanceAfter, updatedAt: serverTimestamp() })
  } else {
    tx.set(stockDoc, { available: balanceAfter, lowThreshold: 0, updatedAt: serverTimestamp() })
  }
}

/** Append one ledger entry inside a transaction. */
export function writeMovementInTx(tx, payload) {
  const ref = doc(movementsCol)
  tx.set(ref, { ...payload, timestamp: serverTimestamp() })
  return ref
}

/**
 * Re-walk the ledger newest → oldest from the authoritative `available` balance
 * and repair any `balanceAfter` that drifted. Runs after a manual edit/delete
 * so the running-balance column stays coherent. Best-effort: never throws.
 */
export async function recomputeBalances(max = 300) {
  try {
    const stockSnap = await getDoc(stockDoc)
    const available = Number(stockSnap.data()?.available) || 0
    const q = query(movementsCol, orderBy('timestamp', 'desc'), limit(max))
    const snap = await getDocs(q)

    const batch = writeBatch(db)
    let running = available
    let dirty = 0
    snap.docs.forEach((m) => {
      const d = m.data()
      if ((Number(d.balanceAfter) || 0) !== running) {
        batch.update(m.ref, { balanceAfter: running })
        dirty += 1
      }
      running -= Number(d.delta) || 0
    })
    if (dirty) await batch.commit()
    return { error: null, updated: dirty }
  } catch (err) {
    console.error('Error recomputing balances:', err)
    return { error: null, updated: 0 }
  }
}

/**
 * Add received stock (restock). `dead` — chicks that arrived dead — is recorded
 * on the entry and NOT added to the balance, so the net gain is received−dead.
 * Logs a `restock` movement.
 */
export async function addStock(received, dead, note, author) {
  const recv = Math.round(Number(received))
  const deadN = Math.max(0, Math.round(Number(dead)) || 0)
  if (!Number.isFinite(recv) || recv <= 0) return { error: 'أدخل كمية صحيحة أكبر من 0' }
  if (deadN > recv) return { error: 'عدد النافق أكبر من الكمية المستلمة' }
  const net = recv - deadN
  try {
    await runTransaction(db, async (tx) => {
      const { exists, available } = await readStockInTx(tx)
      const balanceAfter = available + net
      setStockBalanceInTx(tx, exists, balanceAfter)
      writeMovementInTx(tx, {
        type: 'restock',
        delta: net,
        received: recv,
        dead: deadN,
        balanceAfter,
        note: note || '',
        ref: '',
        orderId: null,
        createdByName: author?.name || '',
      })
    })
    return { error: null }
  } catch (err) {
    console.error('Error adding stock:', err)
    return { error: MSG }
  }
}

/** Record chick mortality (barn losses / dead on arrival after the fact). Cuts stock. */
export async function recordDeath(amount, note, author) {
  const qty = Math.round(Number(amount))
  if (!Number.isFinite(qty) || qty <= 0) return { error: 'أدخل عدداً صحيحاً أكبر من 0' }
  try {
    const balanceAfter = await runTransaction(db, async (tx) => {
      const { exists, available } = await readStockInTx(tx)
      const bal = available - qty
      setStockBalanceInTx(tx, exists, bal)
      writeMovementInTx(tx, {
        type: 'death',
        delta: -qty,
        dead: qty,
        balanceAfter: bal,
        note: note || '',
        ref: '',
        orderId: null,
        createdByName: author?.name || '',
      })
      return bal
    })
    return { error: null, balanceAfter }
  } catch (err) {
    console.error('Error recording death:', err)
    return { error: MSG }
  }
}

/** Set the exact on-hand balance. Logs the difference as an `adjust` movement. */
export async function setStockAvailable(nextValue, author, reason) {
  const target = Math.round(Number(nextValue))
  if (!Number.isFinite(target) || target < 0) return { error: 'أدخل رقماً صحيحاً' }
  try {
    await runTransaction(db, async (tx) => {
      const { exists, available } = await readStockInTx(tx)
      const delta = target - available
      setStockBalanceInTx(tx, exists, target)
      writeMovementInTx(tx, {
        type: 'adjust',
        delta,
        balanceAfter: target,
        note: reason || 'تعديل يدوي',
        ref: '',
        orderId: null,
        createdByName: author?.name || '',
      })
    })
    return { error: null }
  } catch (err) {
    console.error('Error setting stock:', err)
    return { error: MSG }
  }
}

/**
 * Edit one ledger entry. `patch` may carry `note`, and — for entries whose
 * quantity is not tied to an order (restock / adjust / death) — a new net
 * `delta` (plus optional `received` / `dead` for display). The balance moves by
 * the difference and the running-balance column is repaired afterwards.
 */
export async function updateMovement(movement, patch = {}) {
  if (!movement?.id) return { error: 'حركة غير صالحة' }

  const fields = { note: patch.note ?? movement.note ?? '' }
  if ('received' in patch) fields.received = Math.max(0, Math.round(Number(patch.received)) || 0)
  if ('dead' in patch) fields.dead = Math.max(0, Math.round(Number(patch.dead)) || 0)

  const hasDelta = patch.delta !== undefined && Number.isFinite(Number(patch.delta))
  const nextDelta = hasDelta ? Math.round(Number(patch.delta)) : Number(movement.delta) || 0
  const diff = nextDelta - (Number(movement.delta) || 0)

  try {
    await runTransaction(db, async (tx) => {
      if (diff !== 0) {
        const { exists, available } = await readStockInTx(tx)
        const nextAvailable = available + diff
        setStockBalanceInTx(tx, exists, nextAvailable)
        fields.delta = nextDelta
        fields.balanceAfter = nextAvailable
      }
      tx.update(doc(movementsCol, movement.id), fields)
    })
    await recomputeBalances()
    return { error: null }
  } catch (err) {
    console.error('Error updating movement:', err)
    return { error: MSG }
  }
}

/**
 * Delete one ledger entry and undo its effect on the balance. For sale/return
 * entries this puts the stock back but leaves the matching sales record alone —
 * the caller should steer the user to the Sales page's "إرجاع" instead.
 */
export async function deleteMovement(movement) {
  if (!movement?.id) return { error: 'حركة غير صالحة' }
  try {
    await runTransaction(db, async (tx) => {
      const { exists, available } = await readStockInTx(tx)
      const balanceAfter = available - (Number(movement.delta) || 0)
      setStockBalanceInTx(tx, exists, balanceAfter)
      tx.delete(doc(movementsCol, movement.id))
    })
    await recomputeBalances()
    return { error: null }
  } catch (err) {
    console.error('Error deleting movement:', err)
    return { error: MSG }
  }
}

/** Low-stock alert threshold. 0 disables the alert. */
export async function setLowThreshold(value) {
  const n = Math.max(0, Math.round(Number(value)) || 0)
  try {
    await setDoc(stockDoc, { lowThreshold: n, updatedAt: serverTimestamp() }, { merge: true })
    return { error: null }
  } catch (err) {
    console.error('Error setting low threshold:', err)
    return { error: MSG }
  }
}
