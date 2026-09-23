import { useEffect, useState } from 'react'
import { subscribeSoldOrders } from '../services/sales'

export function useSales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = subscribeSoldOrders(
      (list) => {
        setSales(list)
        setLoading(false)
      },
      (msg) => {
        setError(msg)
        setLoading(false)
      },
    )
    return unsub
  }, [])

  return { sales, loading, error, setError }
}
