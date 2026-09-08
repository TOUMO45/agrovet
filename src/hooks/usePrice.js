import { useCallback, useEffect, useState } from 'react'
import { getPriceHistory, subscribePrice, updateCurrentPrice } from '../services/price'

export function usePrice() {
  const [currentPrice, setCurrentPrice] = useState(0)
  const [priceHistory, setPriceHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = subscribePrice((price) => {
      setCurrentPrice(price)
      setLoading(false)
    })
    getPriceHistory()
      .then(setPriceHistory)
      .catch((err) => {
        console.error('Error fetching price history:', err)
        setError('حدث خطأ أثناء جلب سجل الأسعار')
      })
    return unsub
  }, [])

  const updatePrice = useCallback(async (price) => {
    setError(null)
    const { error: err } = await updateCurrentPrice(price)
    if (err) {
      setError(err)
      return { error: err }
    }
    getPriceHistory().then(setPriceHistory).catch(() => {})
    return { error: null }
  }, [])

  return { currentPrice, priceHistory, loading, error, updatePrice }
}
