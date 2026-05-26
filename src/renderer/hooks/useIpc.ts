import { useState, useEffect, useCallback } from 'react'
import type { IPCResponse } from '@shared/types/ipc'

/**
 * Generic hook for IPC data fetching
 */
export function useIpcData<T>(channel: string, ...args: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response: IPCResponse<T> = await window.electronAPI.invoke(channel, ...args)
      if (response.success) {
        setData(response.data as T)
      } else {
        setError(response.error ?? 'Unknown error')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [channel])

  useEffect(() => {
    if (channel) refetch()
    else {
      setData(null)
      setLoading(false)
    }
  }, [refetch, channel])

  return { data, loading, error, refetch }
}

/**
 * Generic hook for IPC mutations
 */
export function useIpcMutation<T>(channel: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      setLoading(true)
      setError(null)
      try {
        const response: IPCResponse<T> = await window.electronAPI.invoke(channel, ...args)
        if (response.success) {
          return response.data as T
        } else {
          setError(response.error ?? 'Unknown error')
          return null
        }
      } catch (err) {
        setError((err as Error).message)
        return null
      } finally {
        setLoading(false)
      }
    },
    [channel],
  )

  return { mutate, loading, error }
}
