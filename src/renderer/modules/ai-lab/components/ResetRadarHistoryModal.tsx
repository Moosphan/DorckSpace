import { useCallback, useEffect, useState } from 'react'
import { getResetTypeLabel, type ResetRadarHistoryEntry } from '@shared/reset-radar'

interface ResetRadarHistoryModalProps {
  onClose: () => void
  onOpenUrl?: (url: string) => void
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ResetRadarHistoryModal({ onClose, onOpenUrl }: ResetRadarHistoryModalProps) {
  const [history, setHistory] = useState<ResetRadarHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await window.electronAPI.invoke('reset-radar:getHistory', 50)
      if (response.success) setHistory((response.data as ResetRadarHistoryEntry[]) ?? [])
      else setError(response.error ?? '无法读取重置历史')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '无法读取重置历史')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory().catch(() => {})
  }, [loadHistory])

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/45 p-md pt-[max(72px,9vh)] backdrop-blur-md titlebar-no-drag" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-radar-history-title"
        className="relative flex max-h-[min(680px,80vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-md border-b border-outline-variant/30 px-lg py-md">
          <div>
            <div className="mb-1 flex items-center gap-xs text-label-sm font-semibold text-primary">
              <span className="material-symbols-outlined text-[18px]">history</span>
              Reset Radar
            </div>
            <h2 id="reset-radar-history-title" className="font-headline-lg text-headline-lg text-on-surface">重置历史时间轴</h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">汇总官方 X 公告与本地账户用量观测</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭历史时间轴" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-surface-container-low p-lg">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center text-body-sm text-on-surface-variant">正在读取历史记录...</div>
          ) : error ? (
            <div className="flex min-h-[240px] items-center justify-center text-body-sm text-error">{error}</div>
          ) : history.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-sm text-center">
              <span className="material-symbols-outlined text-[42px] text-on-surface-variant/50">timeline</span>
              <p className="font-label-lg text-on-surface">暂无已观测的重置事件</p>
              <p className="max-w-sm text-body-sm text-on-surface-variant">刷新雷达后会读取官方 X 动态；账户重置则需要保持 ChatGPT 会话并完成连续用量同步。</p>
            </div>
          ) : (
            <div className="relative pl-7">
              <div className="absolute bottom-3 left-[11px] top-3 w-px bg-primary/20" />
              <div className="space-y-md">
                {history.map((entry) => (
                  <article key={entry.id} className="relative rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md shadow-sm">
                    <span className="absolute -left-[27px] top-5 flex h-5 w-5 items-center justify-center rounded-full border-4 border-surface-container-low bg-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-on-primary" />
                    </span>
                    <div className="flex flex-wrap items-start justify-between gap-sm">
                      <div className="min-w-0">
                        <span className="mb-1 inline-flex rounded-full bg-primary-fixed px-2 py-1 text-[10px] font-semibold text-on-primary-fixed-variant">{getResetTypeLabel(entry.resetType)}</span>
                        <h3 className="text-[14px] font-semibold leading-snug text-on-surface">{entry.title}</h3>
                      </div>
                      <time className="shrink-0 text-[11px] font-semibold text-primary">{formatDateTime(entry.occurredAt)}</time>
                    </div>
                    <p className="mt-xs text-body-sm leading-relaxed text-on-surface-variant">{entry.detail}</p>
                    <div className="mt-sm flex items-center justify-between gap-sm text-[11px] text-on-surface-variant">
                      <span>来源：{entry.source}</span>
                      {entry.url && onOpenUrl && (
                        <button type="button" onClick={() => onOpenUrl(entry.url as string)} className="shrink-0 font-semibold text-primary hover:underline">
                          查看原文
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
