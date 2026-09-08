import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const priceDoc = doc(db, 'settings', 'currentPrice')
const historyCol = collection(db, 'priceHistory')

export function subscribePrice(onData) {
  return onSnapshot(priceDoc, (snap) => {
    onData(snap.data()?.price || 0)
  })
}

export async function getCurrentPrice() {
  try {
    const snap = await getDoc(priceDoc)
    if (snap.exists()) return snap.data()?.price || 0
    await setDoc(priceDoc, { price: 0, updatedAt: serverTimestamp() })
    return 0
  } catch (err) {
    console.error('Error getting price:', err)
    return 0
  }
}

export async function updateCurrentPrice(price) {
  try {
    await setDoc(priceDoc, { price, updatedAt: serverTimestamp() }, { merge: true })
    await addDoc(historyCol, { price, timestamp: serverTimestamp() })
    return { error: null }
  } catch (err) {
    console.error('Error updating price:', err)
    return { error: 'حدث خطأ أثناء تحديث السعر' }
  }
}

export async function getPriceHistory() {
  try {
    const q = query(historyCol, orderBy('timestamp', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({
      id: d.id,
      price: d.data().price,
      date: d.data().timestamp?.toDate?.().toISOString() || new Date().toISOString(),
    }))
  } catch (err) {
    console.error('Error getting price history:', err)
    return []
  }
}
