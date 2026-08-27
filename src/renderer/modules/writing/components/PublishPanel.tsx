import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useIpcMutation } from '@/hooks/useIpc'

interface PublishPanelProps {
  articleId: number
  articleTitle: string
  content: string
  onClose: () => void
}

interface Platform {
  id: string
  name: string
  icon: string
  color: string
  description: string
}

const platforms: Platform[] = [
  { id: 'blog', name: 'Blog', icon: 'language', color: 'bg-primary', description: 'Push to Git repo as HTML' },
  { id: 'notion', name: 'Notion', icon: 'description', color: 'bg-on-surface', description: 'Publish to Notion database' },
  { id: 'juejin', name: 'Juejin', icon: 'articles', color: 'bg-blue-500', description: 'Post to Juejin column' },
  { id: 'wechat', name: 'WeChat', icon: 'chat', color: 'bg-green-500', description: 'Copy rich text for WeChat' },
  { id: 'medium', name: 'Medium', icon: 'edit_note', color: 'bg-gray-800', description: 'Publish via Medium API' },
]

type PublishStatus = 'idle' | 'converting' | 'publishing' | 'done' | 'error'

function convertToHTML(markdown: string): string {
  // Basic Markdown to HTML conversion
  const html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/gim, '</p><p>')
  return `<p>${html}</p>`
}

function convertToJuejin(markdown: string): string {
  // Juejin uses standard Markdown with some extensions
  return markdown
}

function convertToWeChatHTML(markdown: string): string {
  const html = convertToHTML(markdown)
  // WeChat requires inline styles
  return html
    .replace(/<h1>/g, '<h1 style="font-size:24px;font-weight:bold;color:#333;margin:20px 0 10px;">')
    .replace(/<h2>/g, '<h2 style="font-size:20px;font-weight:bold;color:#333;margin:16px 0 8px;">')
    .replace(/<h3>/g, '<h3 style="font-size:18px;font-weight:bold;color:#333;margin:12px 0 6px;">')
    .replace(/<p>/g, '<p style="font-size:16px;line-height:1.8;color:#333;margin:8px 0;">')
    .replace(/<code>/g, '<code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:14px;">')
}

export function PublishPanel({ articleId, articleTitle, content, onClose }: PublishPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<PublishStatus>('idle')
  const [results, setResults] = useState<Record<string, string>>({})
  const { mutate: updateStatus } = useIpcMutation<boolean>('articles:updateStatus')
  const { mutate: addPublishRecord } = useIpcMutation('articlePublish:create')

  const togglePlatform = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleCopy = useCallback(async (platformId: string) => {
    let text = ''
    switch (platformId) {
      case 'wechat':
        text = convertToWeChatHTML(content)
        break
      case 'juejin':
        text = convertToJuejin(content)
        break
      default:
        text = content
    }
    await navigator.clipboard.writeText(text)
    setResults((prev) => ({ ...prev, [platformId]: 'Copied to clipboard' }))
  }, [content])

  const handlePublish = useCallback(async () => {
    if (selected.size === 0) return

    setStatus('converting')
    await updateStatus(articleId, 'publishing')

    const newResults: Record<string, string> = {}

    for (const platformId of selected) {
      try {
        setStatus('publishing')

        if (platformId === 'wechat') {
          // WeChat: copy to clipboard
          await handleCopy('wechat')
          newResults[platformId] = 'Copied - paste into WeChat editor'
        } else if (platformId === 'blog') {
          // Blog: copy HTML
          const html = convertToHTML(content)
          await navigator.clipboard.writeText(html)
          newResults[platformId] = 'HTML copied - push to your blog repo'
        } else if (platformId === 'juejin') {
          // Juejin: copy markdown
          await handleCopy('juejin')
          newResults[platformId] = 'Markdown copied - paste into Juejin editor'
        } else {
          // Other platforms: show placeholder
          newResults[platformId] = 'Ready - configure API in Settings > Integrations'
        }
      } catch (err) {
        newResults[platformId] = `Error: ${(err as Error).message}`
      }
    }

    setResults(newResults)
    setStatus('done')
    await updateStatus(articleId, 'published')
  }, [selected, articleId, content, updateStatus, handleCopy])

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg p-md space-y-md">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-sm text-headline-sm">Publish Article</h3>
            <p className="text-body-sm text-on-surface-variant mt-xs">{articleTitle}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Platform Selection */}
        <div className="space-y-sm">
          <p className="font-label-md text-on-surface-variant">Select platforms:</p>
          {platforms.map((platform) => {
            const isSelected = selected.has(platform.id)
            const result = results[platform.id]
            return (
              <div
                key={platform.id}
                onClick={() => status === 'idle' && togglePlatform(platform.id)}
                className={cn(
                  'flex items-center gap-md p-md rounded-xl border cursor-pointer transition-colors',
                  isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-outline-variant',
                  status !== 'idle' && 'pointer-events-none',
                )}
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white', platform.color)}>
                  <span className="material-symbols-outlined text-[20px]">{platform.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="font-label-md text-on-surface">{platform.name}</p>
                  <p className="text-body-sm text-on-surface-variant">{platform.description}</p>
                </div>
                {result ? (
                  <span className={cn(
                    'text-[11px] font-bold px-sm py-xs rounded-full',
                    result.startsWith('Error') ? 'bg-error-container text-error' : 'bg-primary/10 text-primary',
                  )}>
                    {result.startsWith('Error') ? 'Failed' : 'Done'}
                  </span>
                ) : (
                  <div className={cn(
                    'w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-colors',
                    isSelected ? 'border-primary bg-primary' : 'border-outline-variant',
                  )}>
                    {isSelected && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Results */}
        {status === 'done' && Object.keys(results).length > 0 && (
          <div className="bg-surface-container-low rounded-xl p-md space-y-xs">
            <p className="font-label-md text-on-surface-variant mb-xs">Results:</p>
            {Object.entries(results).map(([platformId, result]) => {
              const platform = platforms.find((p) => p.id === platformId)
              return (
                <div key={platformId} className="flex items-center gap-sm text-body-sm">
                  <span className="font-bold text-on-surface">{platform?.name}:</span>
                  <span className="text-on-surface-variant">{result}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-sm pt-sm border-t border-outline-variant/30">
          <button
            onClick={onClose}
            className="px-md py-sm rounded-full font-label-md text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            {status === 'done' ? 'Close' : 'Cancel'}
          </button>
          {status === 'idle' && (
            <button
              onClick={handlePublish}
              disabled={selected.size === 0}
              className="px-md py-sm rounded-full bg-primary text-on-primary font-label-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
            >
              Publish to {selected.size} platform{selected.size !== 1 ? 's' : ''}
            </button>
          )}
          {(status === 'converting' || status === 'publishing') && (
            <button disabled className="px-md py-sm rounded-full bg-primary text-on-primary font-label-md opacity-70">
              {status === 'converting' ? 'Converting...' : 'Publishing...'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
