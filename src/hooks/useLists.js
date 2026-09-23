import { useEffect, useState } from 'react'
import { subscribeLists } from '../services/lists'

export function useLists() {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = subscribeLists(
      (rows) => {
        setLists(rows)
        setLoading(false)
      },
      (msg) => {
        setError(msg)
        setLoading(false)
      },
    )
    return unsub
  }, [])

  return { lists, loading, error, setError }
}
