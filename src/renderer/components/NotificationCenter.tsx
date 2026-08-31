import { useEffect, useRef } from 'react'
import type { NotificationCenterMessage } from '@shared/notification-center'

interface NotificationCenterProps {
  messages: NotificationCenterMessage[]
  open: boolean
  onClose: () => void
  onOpenMessage: (message: NotificationCenterMessage) => void
  onMarkAllRead: () => void
}

function formatMessageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function NotificationCenter({ messages, open, onClose, onOpenMessage, onMarkAllRead }: NotificationCenterProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="消息中心"
      className="absolute right-md top-[calc(100%+8px)] z-50 flex w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest shadow-xl titlebar-no-drag"
    >
      <div className="flex items-center justify-between gap-sm border-b border-outline-variant/30 px-md py-sm">
        <div>
          <h2 className="text-[15px] font-semibold text-on-surface">未读消息</h2>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">{messages.length > 0 ? `${messages.length} 条待处理` : '暂时没有未读消息'}</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="h-8 rounded-full px-sm text-[11px] font-semibold text-primary hover:bg-primary-fixed transition-colors"
          >
            全部已读
          </button>
        )}
      </div>

      {messages.length > 0 ? (
        <div className="max-h-[360px] overflow-y-auto p-xs">
          {messages.map((message) => (
            <button
              key={message.id}
              type="button"
              onClick={() => onOpenMessage(message)}
              className="w-full rounded-md px-sm py-sm text-left hover:bg-surface-container transition-colors"
            >
              <div className="flex items-start gap-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary-container" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-on-surface">{message.title}</span>
                  <span className="mt-0.5 block line-clamp-2 text-[12px] leading-relaxed text-on-surface-variant">{message.body}</span>
                  <span className="mt-1 block text-[10px] text-on-surface-variant">{formatMessageTime(message.createdAt)}</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex min-h-32 flex-col items-center justify-center gap-xs px-md text-on-surface-variant">
          <span className="material-symbols-outlined text-[24px]">notifications_off</span>
          <p className="text-[12px]">所有消息都已处理</p>
        </div>
      )}
    </div>
  )
}
