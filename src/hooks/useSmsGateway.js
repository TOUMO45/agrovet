import { useEffect, useState } from 'react'
import {
  emptyGatewayConfig,
  saveGatewayConfig,
  subscribeGatewayConfig,
} from '../services/smsGateway'

export function useSmsGateway() {
  const [config, setConfig] = useState(emptyGatewayConfig)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeGatewayConfig((cfg) => {
      setConfig(cfg)
      setLoading(false)
    })
    return unsub
  }, [])

  return { config, loading, save: saveGatewayConfig }
}
