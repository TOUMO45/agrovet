import { useEffect, useState } from 'react'
import { getBackendStatus } from '../services/smsBackend'

/** One health check per mount: does this deploy have a working SMS backend? */
export function useSmsBackend() {
  const [status, setStatus] = useState({ configured: false, provider: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getBackendStatus().then((s) => {
      if (!alive) return
      setStatus(s)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  return { ...status, loading }
}
