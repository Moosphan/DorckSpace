import { useCallback, useEffect, useState } from 'react'
import type { CodexUsageDashboard } from '@shared/codex-usage'

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours} 小时 ${remainingMinutes} 分钟` : `${hours} 小时`
}

function formatDateTime(value: string | null): string {
  if (!value) return '暂无记录'
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatPlan(plan: string | null): string {
  if (!plan) return '未连接 ChatGPT'
  const labels: Record<string, string> = {
    free: 'ChatGPT Free',
    plus: 'ChatGPT Plus',
    pro: 'ChatGPT Pro',
    team: 'ChatGPT Team',
    enterprise: 'ChatGPT Enterprise',
  }
  return labels[plan.toLowerCase()] ?? plan
}

function getWindow(kind: 'five_hour' | 'weekly', dashboard: CodexUsageDashboard) {
  return dashboard.quotaWindows.find((item) => item.kind === kind)
}

function QuotaWindow({
  label,
  remainingPercent,
  resetAt,
}: {
  label: string
  remainingPercent: number | null
  resetAt: string | null
}) {
  const hasData = remainingPercent !== null
  const safePercent = Math.max(0, Math.min(100, remainingPercent ?? 0))

  return (
    <div className="rounded-lg bg-surface-container-low px-sm py-xs">
      <div className="flex items-center justify-between gap-xs text-[10px]">
        <span className="font-semibold text-on-surface-variant">{label}</span>
        <span className="font-bold text-on-surface">{hasData ? `${safePercent}% 剩余` : '暂无数据'}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${safePercent}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-on-surface-variant">
        {hasData ? `重置于 ${formatDateTime(resetAt)}` : '登录后刷新用量'}
      </p>
    </div>
  )
}

function ActivityMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-outline-variant/20 bg-surface-container-low px-sm py-xs">
      <p className="truncate text-[10px] text-on-surface-variant">{label}</p>
      <p className="mt-0.5 truncate text-[14px] font-bold leading-tight text-on-surface">{value}</p>
    </div>
  )
}

export function TokenUsage({ refreshKey = 0 }: { refreshKey?: number }) {
  const [dashboard, setDashboard] = useState<CodexUsageDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async (forceRefresh = false) => {
    setError(null)
    if (forceRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const response = await window.electronAPI.invoke('ai:getCodexUsageDashboard', { forceRefresh })
      if (response.success && response.data) {
        setDashboard(response.data as CodexUsageDashboard)
      } else {
        setError(response.error ?? '使用统计暂不可用')
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '使用统计暂不可用')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard(refreshKey > 0).catch(() => {})
  }, [loadDashboard, refreshKey])

  if (loading && !dashboard) {
    return (
      <div className="h-full min-h-[190px] rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-md flex items-center justify-center">
        <div className="flex items-center gap-xs text-body-sm text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
          正在读取使用统计...
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="h-full min-h-[190px] rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-md flex flex-col justify-center">
        <p className="text-body-sm text-error">{error ?? '使用统计暂不可用'}</p>
        <button type="button" onClick={() => loadDashboard(true)} className="mt-sm self-start text-body-sm font-semibold text-primary hover:underline">
          重新加载
        </button>
      </div>
    )
  }

  const fiveHourWindow = getWindow('five_hour', dashboard)
  const weeklyWindow = getWindow('weekly', dashboard)
  const activity = dashboard.activity
  const recentUsage = dashboard.dailyUsage.slice(-7)
  const maxDailyTokens = Math.max(...recentUsage.map((item) => item.totalTokens), 1)
  const planLabel = formatPlan(dashboard.plan)

  return (
    <article className="h-full min-h-[190px] flex-1 rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-md shadow-ambient flex flex-col gap-sm">
      <header className="flex items-start justify-between gap-sm">
        <div className="flex min-w-0 items-center gap-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
            <span className="material-symbols-outlined text-[20px]">data_usage</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-headline-sm text-headline-sm truncate">使用统计</h3>
            <p className="mt-[2px] truncate text-[10px] text-on-surface-variant">
              {planLabel}{dashboard.subscriptionExpiresAt ? ` · 到期 ${formatDateTime(dashboard.subscriptionExpiresAt)}` : ''} · {dashboard.accountStatus === 'connected' ? '已连接' : '等待连接'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          aria-label="刷新使用统计"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </header>

      <div className="flex items-center justify-between gap-sm border-b border-outline-variant/20 pb-sm text-[10px]">
        <div className="min-w-0">
          <span className="text-on-surface-variant">套餐时间</span>
          <p className="truncate font-semibold text-on-surface">按 5 小时 / 每周窗口计算</p>
        </div>
        <span className="shrink-0 text-on-surface-variant" title={dashboard.lastSyncedAt ?? undefined}>
          {dashboard.lastSyncedAt ? `同步 ${formatDateTime(dashboard.lastSyncedAt)}` : '等待同步'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-xs">
        <QuotaWindow label="5 小时额度" remainingPercent={fiveHourWindow?.remainingPercent ?? null} resetAt={fiveHourWindow?.resetAt ?? null} />
        <QuotaWindow label="每周额度" remainingPercent={weeklyWindow?.remainingPercent ?? null} resetAt={weeklyWindow?.resetAt ?? null} />
      </div>

      <div className="rounded-md border border-outline-variant/20 bg-surface-container-low px-sm py-xs">
        <div className="flex items-center justify-between gap-sm">
          <span className="text-[10px] font-semibold text-on-surface-variant">近 7 天使用节奏</span>
          <span className="text-[10px] text-on-surface-variant">本地日志</span>
        </div>
        {recentUsage.length > 0 ? (
          <div className="mt-xs grid h-14 grid-cols-7 items-end gap-xs">
            {recentUsage.map((day) => {
              const barHeight = Math.max(8, Math.round((day.totalTokens / maxDailyTokens) * 100))
              return (
                <div key={day.date} className="flex h-full min-w-0 flex-col items-center justify-end gap-[2px]" title={`${day.date} · ${formatTokens(day.totalTokens)} tokens`}>
                  <div className="w-full max-w-5 rounded-sm bg-primary transition-[height] duration-500" style={{ height: `${barHeight}%` }} />
                  <span className="text-[9px] text-on-surface-variant">{day.date.slice(5).replace('-', '/')}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mt-xs text-[10px] text-on-surface-variant">暂无近 7 天用量日志</p>
        )}
      </div>

      <div className="mt-auto">
        <div className="mb-xs flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">活跃度</span>
          {error && <span className="truncate text-[10px] text-error" title={error}>同步异常</span>}
        </div>
        <div className="grid grid-cols-2 gap-xs sm:grid-cols-5">
          <ActivityMetric label="累计 Token" value={formatTokens(activity.totalTokens)} />
          <ActivityMetric label="峰值 Token" value={formatTokens(activity.peakTokens)} />
          <ActivityMetric label="累计工作时长" value={formatDuration(activity.totalDurationMinutes)} />
          <ActivityMetric label="连续活跃" value={`${activity.currentStreakDays} 天`} />
          <ActivityMetric label="最长连续" value={`${activity.longestStreakDays} 天`} />
        </div>
      </div>
    </article>
  )
}
