import { useEffect, useState } from 'react'
import { subscribeActiveOrders, subscribeArchivedOrders } from '../services/orders'

export function useOrders() {
  const [orders, setOrders] = useState([])
  const [archivedOrders, setArchivedOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubActive = subscribeActiveOrders(
      (list) => {
        setOrders(list)
        setLoading(false)
      },
      (msg) => {
        setError(msg)
        setLoading(false)
      },
    )
    const unsubArchived = subscribeArchivedOrders(setArchivedOrders, setError)
    return () => {
      unsubActive()
      unsubArchived()
    }
  }, [])

  return { orders, archivedOrders, loading, error, setError }
}
