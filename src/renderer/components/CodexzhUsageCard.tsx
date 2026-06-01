import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface CodexzhStats {
  todayCalls: number
  totalCalls: number
  todayUsed: number
  todayUsedFormatted: string
  weekUsed: number
  weekUsedFormatted: string
  totalUsed: number
  totalUsedFormatted: string
  rpm: number
  tpm: number
  dailyQuota: number
  weeklyQuota: number
  subscriptionStart: string
  subscriptionEnd: string
}

export function CodexzhUsageCard() {
  const [stats, setStats] = useState<CodexzhStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.electronAPI.invoke('plugin:codexzh-usage:getUsageFromDb')
      if (res.success) {
        setStats(res.data)
      } else {
        setError(res.error ?? 'Unknown error')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 h-full flex items-center justify-center">
        <div className="flex items-center gap-sm text-on-surface-variant text-body-sm">
          <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
          Loading CodexZh usage...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 h-full flex flex-col justify-center">
        <p className="text-error text-body-sm">{error}</p>
        <button onClick={fetchStats} className="text-primary text-body-sm mt-sm hover:underline text-left">
          Retry
        </button>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 h-full">
      <div className="flex items-center justify-between mb-md">
        <h3 className="font-headline-sm text-headline-sm">CodexZh Usage</h3>
        <button
          onClick={fetchStats}
          className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
          title="Refresh"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
        </button>
      </div>

      <div className="space-y-sm">
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant text-body-sm">Today</span>
          <span className="font-bold text-primary text-body-sm">{stats.todayUsedFormatted}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant text-body-sm">This Week</span>
          <span className="font-bold text-on-surface text-body-sm">{stats.weekUsedFormatted}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant text-body-sm">Total</span>
          <span className="font-bold text-on-surface text-body-sm">{stats.totalUsedFormatted}</span>
        </div>
      </div>

      <div className="pt-md border-t border-outline-variant/30 mt-md space-y-xs">
        <div className="flex justify-between text-[11px] text-on-surface-variant">
          <span>Calls: {stats.todayCalls} today / {stats.totalCalls} total</span>
          <span>RPM: {stats.rpm}</span>
        </div>
        {stats.dailyQuota > 0 && (
          <div className="text-[11px] text-on-surface-variant">
            Quota: {(stats.dailyQuota / 500000).toFixed(1)}$/day, {(stats.weeklyQuota / 500000).toFixed(1)}$/week
          </div>
        )}
        {stats.subscriptionEnd && (
          <div className="text-[11px] text-on-surface-variant">
            Expires: {stats.subscriptionEnd}
          </div>
        )}
      </div>
    </div>
  )
}
