import { useEffect, useState } from 'react'
import { subscribeListEntries } from '../services/lists'

export function useListEntries(listId) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!listId) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeListEntries(
      listId,
      (rows) => {
        setEntries(rows)
        setLoading(false)
      },
      (msg) => {
        setError(msg)
        setLoading(false)
      },
    )
    return unsub
  }, [listId])

  return { entries, loading, error, setError }
}
