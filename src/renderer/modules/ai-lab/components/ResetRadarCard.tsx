import { useEffect, useRef, useState } from 'react'
import {
  createGuestResetRadarSnapshot,
  getResetRadarTone,
  type ResetRadarSnapshot,
} from '@shared/reset-radar'

interface ResetRadarCardProps {
  onOpenStatus: (url: string) => void
  onOpenAccount: () => void
  onOpenHistory: () => void
  accountSyncError?: string | null
  refreshKey?: number
}

const toneStyles = {
  quiet: {
    dot: 'bg-primary',
    label: '低置信度',
    badge: 'bg-primary-fixed text-on-primary-fixed-variant',
  },
  watch: {
    dot: 'bg-secondary-container',
    label: '留意信号',
    badge: 'bg-secondary-container text-on-secondary-container',
  },
  active: {
    dot: 'bg-error',
    label: '信号活跃',
    badge: 'bg-error-container text-on-error-container',
  },
} as const

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDateTime(value: string | null): string {
  if (!value) return '暂无已观测记录'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getWindowLabel(kind: ResetRadarSnapshot['quotaWindows'][number]['kind']): string {
  if (kind === 'five_hour') return '5 小时窗口'
  if (kind === 'weekly') return '周窗口'
  return '用量窗口'
}

export function ResetRadarCard({ onOpenStatus, onOpenAccount, onOpenHistory, accountSyncError, refreshKey = 0 }: ResetRadarCardProps) {
  const [snapshot, setSnapshot] = useState<ResetRadarSnapshot>(() => createGuestResetRadarSnapshot())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  const tone = getResetRadarTone(snapshot.forecast.confidence, snapshot.activeSignal !== null)
  const toneStyle = toneStyles[tone]

  const loadSnapshot = async (forceRefresh = false) => {
    const currentRequestId = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const response = await window.electronAPI.invoke('reset-radar:getSnapshot', { forceRefresh })
      if (currentRequestId !== requestId.current) return
      if (response.success && response.data) {
        setSnapshot(response.data as ResetRadarSnapshot)
      } else {
        setError(response.error ?? '雷达数据暂不可用')
      }
    } catch (loadError) {
      if (currentRequestId !== requestId.current) return
      setError(loadError instanceof Error ? loadError.message : '雷达数据暂不可用')
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }

  useEffect(() => {
    loadSnapshot(refreshKey > 0).catch(() => {})
  }, [refreshKey])

  const source = snapshot.sources[0]
  const signalLabel = snapshot.activeSignal?.title ?? snapshot.forecast.label
  const accountConnected = snapshot.account.status === 'connected'

  return (
    <article className="h-full min-h-[232px] rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-md shadow-ambient flex flex-col justify-between">
      <header className="flex items-start justify-between gap-sm">
        <div className="flex items-center gap-sm">
          <div className="w-9 h-9 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">radar</span>
          </div>
          <div>
            <h2 className="font-headline-sm text-headline-sm">Codex Reset Radar</h2>
            <p className="text-[11px] text-on-surface-variant mt-[2px]">公开信号 · {accountConnected ? '已连接' : '访客模式'}</p>
          </div>
        </div>
        <div className="flex items-center gap-xs">
          <button
            type="button"
            onClick={onOpenHistory}
            aria-label="查看重置历史"
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
          </button>
          <button
            type="button"
            onClick={() => loadSnapshot(true)}
            aria-label="刷新重置雷达"
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>
      </header>

      <div className="flex items-center gap-md py-sm">
        <div className="relative w-[82px] h-[82px] shrink-0 rounded-full bg-primary-fixed/40 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-[10px] rounded-full border border-primary/25" />
          <div className="absolute inset-[22px] rounded-full border border-primary/30" />
          <div className="absolute left-1/2 top-0 bottom-0 border-l border-primary/20" />
          <div className="absolute top-1/2 left-0 right-0 border-t border-primary/20" />
          <span className={`relative w-3 h-3 rounded-full ${toneStyle.dot} shadow-[0_0_0_5px_rgb(var(--color-primary)/0.12)]`} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-xs mb-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${toneStyle.dot}`} />
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${toneStyle.badge}`}>
              {toneStyle.label}
            </span>
          </div>
          <p className="font-headline-sm text-headline-sm leading-tight">
            {loading ? '正在读取公开信号' : signalLabel}
          </p>
          <p className="text-[11px] text-on-surface-variant mt-xs leading-relaxed">
            未来 {snapshot.forecast.windowHours} 小时 · 估算概率 {Math.round(snapshot.forecast.peakProbability * 100)}%
          </p>
        </div>
      </div>

      {accountConnected && snapshot.quotaWindows.length > 0 ? (
        <div className="grid grid-cols-2 gap-xs pb-sm">
          {snapshot.quotaWindows.slice(0, 2).map((window, index) => (
            <div key={`${window.kind}-${index}`} className="rounded-lg bg-surface-container-low px-sm py-xs">
              <div className="flex items-center justify-between gap-xs text-[10px] text-on-surface-variant">
                <span>{getWindowLabel(window.kind)}</span>
                <span className="font-bold text-on-surface">{window.remainingPercent}% 剩余</span>
              </div>
              <div className="mt-xs h-1 overflow-hidden rounded-full bg-surface-container-highest">
                <div className="h-full rounded-full bg-primary" style={{ width: `${window.remainingPercent}%` }} />
              </div>
            </div>
          ))}
          {snapshot.resetCredits && (
            <div className="col-span-2 flex items-center justify-between rounded-lg bg-primary-fixed/40 px-sm py-xs text-[10px]">
              <span className="text-on-surface-variant">可用重置 credits</span>
              <span className="font-bold text-primary">{snapshot.resetCredits.availableCount}</span>
            </div>
          )}
        </div>
      ) : accountConnected ? (
        <p className="pb-sm text-[11px] text-on-surface-variant">{accountSyncError ?? '已连接，等待 ChatGPT 用量数据同步...'}</p>
      ) : null}

      <div className="border-t border-outline-variant/30 pt-sm">
        <div className="flex items-center justify-between gap-sm mb-sm text-[11px]">
          <span className="text-on-surface-variant">上次重置</span>
          <span className="font-semibold text-on-surface">{formatDateTime(snapshot.account.lastResetAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-sm text-[11px] text-on-surface-variant">
          <span className="truncate" title={error ?? snapshot.advice.detail}>
            {error ?? source?.detail ?? snapshot.advice.title}
          </span>
          <span className="shrink-0">{formatTime(snapshot.generatedAt)} 更新</span>
        </div>
        <div className="flex items-center gap-xs mt-sm">
          <button
            type="button"
            onClick={() => onOpenStatus('https://status.openai.com')}
            className="flex-1 h-8 rounded-full border border-outline-variant/50 text-on-surface-variant text-[11px] font-bold hover:bg-surface-container transition-colors"
          >
            查看公开依据
          </button>
          <button
            type="button"
            onClick={onOpenAccount}
            className="flex-1 h-8 rounded-full bg-primary text-on-primary text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all"
          >
            {accountConnected ? '打开会话' : '应用内登录'}
          </button>
        </div>
      </div>
    </article>
  )
}
