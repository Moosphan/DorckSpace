import { useEffect, useCallback, useRef, useState } from 'react'

export interface PanelRefreshConfig {
  autoFetch?: boolean
  interval?: number
  onFetch: () => Promise<void>
}

export interface PanelRefreshStatus {
  refreshing: boolean
  lastRefreshedAt: Date | null
  refresh: () => Promise<void>
}

export function usePanelRefresh(config: PanelRefreshConfig): PanelRefreshStatus {
  const { autoFetch = true, interval, onFetch } = config
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (refreshing) return
    console.log('[usePanelRefresh] Setting refreshing to true')
    setRefreshing(true)
    try {
      await onFetch()
      if (mountedRef.current) setLastRefreshedAt(new Date())
    } finally {
      console.log('[usePanelRefresh] Setting refreshing to false')
      if (mountedRef.current) setRefreshing(false)
    }
  }, [onFetch, refreshing])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (autoFetch) refresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!interval || interval <= 0) return
    const timer = setInterval(() => { refresh() }, interval)
    return () => clearInterval(timer)
  }, [interval, refresh])

  return { refreshing, lastRefreshedAt, refresh }
}
