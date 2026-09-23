import { useEffect, useState } from 'react'
import { subscribeStock, subscribeStockMovements } from '../services/stock'

export function useStock() {
  const [stock, setStock] = useState({ available: 0, lowThreshold: 0, updatedAt: null })
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubStock = subscribeStock(
      (s) => {
        setStock(s)
        setLoading(false)
      },
      (msg) => {
        setError(msg)
        setLoading(false)
      },
    )
    const unsubMoves = subscribeStockMovements(setMovements, setError)
    return () => {
      unsubStock()
      unsubMoves()
    }
  }, [])

  return { ...stock, movements, loading, error, setError }
}
