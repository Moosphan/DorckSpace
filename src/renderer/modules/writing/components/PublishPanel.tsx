import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'

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

interface ContentVariant {
  id: number
  platform: string
  title: string
  content: string
}
interface PublishReceipt {
  id: number
  platform: string
  status: 'prepared' | 'published' | 'failed'
  destinationUrl: string | null
}
interface PublishResult {
  variantId: number
  receiptId: number
  status: 'prepared' | 'published'
  message: string
}

const platforms: Platform[] = [
  {
    id: 'blog',
    name: 'Blog',
    icon: 'language',
    color: 'bg-primary',
    description: 'HTML version for your blog workflow',
  },
  {
    id: 'juejin',
    name: 'Juejin',
    icon: 'articles',
    color: 'bg-secondary',
    description: 'Markdown version for the editor',
  },
  {
    id: 'wechat',
    name: 'WeChat',
    icon: 'chat',
    color: 'bg-tertiary',
    description: 'Rich-text version for the editor',
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: 'description',
    color: 'bg-on-surface',
    description: 'Plain-text source version',
  },
  {
    id: 'medium',
    name: 'Medium',
    icon: 'edit_note',
    color: 'bg-surface-variant',
    description: 'Plain-text source version',
  },
]

type PublishStatus = 'idle' | 'preparing' | 'done'

function convertToHTML(markdown: string): string {
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

function convertToWeChatHTML(markdown: string): string {
  return convertToHTML(markdown)
    .replace(/<h1>/g, '<h1 style="font-size:24px;font-weight:bold;color:#333;margin:20px 0 10px;">')
    .replace(/<h2>/g, '<h2 style="font-size:20px;font-weight:bold;color:#333;margin:16px 0 8px;">')
    .replace(/<h3>/g, '<h3 style="font-size:18px;font-weight:bold;color:#333;margin:12px 0 6px;">')
    .replace(/<p>/g, '<p style="font-size:16px;line-height:1.8;color:#333;margin:8px 0;">')
    .replace(
      /<code>/g,
      '<code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:14px;">',
    )
}

function createPlatformVersion(platformId: string, content: string): string {
  if (platformId === 'blog') return convertToHTML(content)
  if (platformId === 'wechat') return convertToWeChatHTML(content)
  return content
}

export function PublishPanel({ articleId, articleTitle, content, onClose }: PublishPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [versionDrafts, setVersionDrafts] = useState<Record<string, string>>({})
  const [publishUrls, setPublishUrls] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<PublishStatus>('idle')
  const [results, setResults] = useState<Record<string, PublishResult>>({})
  const { data: savedVariants, refetch: refetchVariants } = useIpcData<ContentVariant[]>(
    'content-variants:getByArticle',
    articleId,
  )
  const { data: receipts, refetch: refetchReceipts } = useIpcData<PublishReceipt[]>(
    'publish-receipts:getByArticle',
    articleId,
  )
  const { mutate: upsertVariant } = useIpcMutation<number>('content-variants:upsert')
  const { mutate: createPreparedReceipt } = useIpcMutation<number>(
    'publish-receipts:createPrepared',
  )
  const { mutate: markReceiptPublished } = useIpcMutation<PublishReceipt>(
    'publish-receipts:markPublished',
  )
  const { mutate: updateArticleStatus } = useIpcMutation<boolean>('articles:updateStatus')

  const togglePlatform = useCallback(
    (platformId: string) => {
      setSelected((previous) => {
        const next = new Set(previous)
        if (next.has(platformId)) next.delete(platformId)
        else next.add(platformId)
        return next
      })
      setVersionDrafts((previous) =>
        previous[platformId] !== undefined
          ? previous
          : { ...previous, [platformId]: createPlatformVersion(platformId, content) },
      )
    },
    [content],
  )

  const handlePrepare = useCallback(async () => {
    if (selected.size === 0) return
    setStatus('preparing')
    const nextResults: Record<string, PublishResult> = {}

    for (const platformId of selected) {
      try {
        const variantContent =
          versionDrafts[platformId] ?? createPlatformVersion(platformId, content)
        const variantId = await upsertVariant({
          articleId,
          platform: platformId,
          title: articleTitle,
          content: variantContent,
        })
        if (!variantId) throw new Error('Could not save platform version')
        await navigator.clipboard.writeText(variantContent)
        const receiptId = await createPreparedReceipt({
          articleId,
          platform: platformId,
          variantId,
        })
        if (!receiptId) throw new Error('Could not create publish receipt')
        nextResults[platformId] = {
          variantId,
          receiptId,
          status: 'prepared',
          message: 'Copied to clipboard - waiting for confirmation',
        }
      } catch (err) {
        nextResults[platformId] = {
          variantId: 0,
          receiptId: 0,
          status: 'prepared',
          message: `Error: ${(err as Error).message}`,
        }
      }
    }

    setResults(nextResults)
    setStatus('done')
    await Promise.all([refetchVariants(), refetchReceipts()])
  }, [
    articleId,
    articleTitle,
    content,
    createPreparedReceipt,
    refetchReceipts,
    refetchVariants,
    selected,
    upsertVariant,
    versionDrafts,
  ])

  const handleMarkPublished = async (platformId: string) => {
    const result = results[platformId]
    const destinationUrl = publishUrls[platformId]?.trim()
    if (!result || !destinationUrl || result.receiptId === 0) return
    const receipt = await markReceiptPublished(result.receiptId, destinationUrl)
    if (!receipt) {
      setResults((previous) => ({
        ...previous,
        [platformId]: { ...result, message: 'Error: Could not confirm published URL' },
      }))
      return
    }
    await updateArticleStatus(articleId, 'published')
    setResults((previous) => ({
      ...previous,
      [platformId]: { ...result, status: 'published', message: 'Published receipt confirmed' },
    }))
    await refetchReceipts()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-md">
      <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xl">
        <header className="flex items-center justify-between border-b border-outline-variant/30 px-lg py-md">
          <div>
            <h3 className="font-headline-sm text-headline-sm">Prepare Platform Versions</h3>
            <p className="mt-xs text-body-sm text-on-surface-variant">{articleTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
            aria-label="Close publish panel"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="flex-1 space-y-lg overflow-y-auto p-lg">
          <section className="space-y-sm">
            <p className="font-label-md text-on-surface-variant">Select platforms to prepare:</p>
            <div className="grid gap-sm sm:grid-cols-2">
              {platforms.map((platform) => {
                const isSelected = selected.has(platform.id)
                const saved = savedVariants?.find((variant) => variant.platform === platform.id)
                return (
                  <button
                    key={platform.id}
                    onClick={() => status === 'idle' && togglePlatform(platform.id)}
                    disabled={status !== 'idle'}
                    className={cn(
                      'flex items-center gap-sm rounded-xl border p-sm text-left transition-colors disabled:cursor-default',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/30 hover:border-outline-variant',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-primary',
                        platform.color,
                      )}
                    >
                      <span className="material-symbols-outlined text-[19px]">{platform.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-label-md text-on-surface">{platform.name}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {saved ? 'Saved version available' : platform.description}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-md border-2',
                        isSelected
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-outline-variant',
                      )}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {selected.size > 0 && status === 'idle' && (
            <section className="space-y-sm">
              <p className="font-label-md text-on-surface-variant">
                Review and edit each local version before copying:
              </p>
              {[...selected].map((platformId) => {
                const platform = platforms.find((item) => item.id === platformId)
                return (
                  <label
                    key={platformId}
                    className="block rounded-xl border border-outline-variant/30 bg-surface-container-low p-sm"
                  >
                    <span className="mb-1 block text-[11px] font-bold text-on-surface">
                      {platform?.name} version
                    </span>
                    <textarea
                      value={versionDrafts[platformId] ?? ''}
                      onChange={(event) =>
                        setVersionDrafts((drafts) => ({
                          ...drafts,
                          [platformId]: event.target.value,
                        }))
                      }
                      className="min-h-28 w-full resize-y rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-2 font-mono text-[11px] leading-relaxed text-on-surface outline-none focus:border-primary"
                    />
                  </label>
                )
              })}
            </section>
          )}

          {status === 'done' && Object.keys(results).length > 0 && (
            <section className="space-y-sm rounded-xl bg-surface-container-low p-md">
              <p className="font-label-md text-on-surface">Publishing receipts</p>
              {Object.entries(results).map(([platformId, result]) => {
                const platform = platforms.find((item) => item.id === platformId)
                const failed = result.message.startsWith('Error:')
                return (
                  <div
                    key={platformId}
                    className="rounded-lg border border-outline-variant/25 bg-surface-container-lowest p-sm"
                  >
                    <div className="flex items-center gap-sm">
                      <span className="font-label-md text-on-surface">{platform?.name}</span>
                      <span
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                          failed
                            ? 'bg-error-container text-error'
                            : result.status === 'published'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-secondary-fixed text-secondary',
                        )}
                      >
                        {failed
                          ? 'Failed'
                          : result.status === 'published'
                            ? 'Published'
                            : 'Prepared'}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">{result.message}</span>
                    </div>
                    {!failed && result.status === 'prepared' && (
                      <div className="mt-2 flex gap-xs">
                        <input
                          value={publishUrls[platformId] ?? ''}
                          onChange={(event) =>
                            setPublishUrls((urls) => ({
                              ...urls,
                              [platformId]: event.target.value,
                            }))
                          }
                          placeholder="Paste the real published URL"
                          className="h-8 min-w-0 flex-1 rounded-lg border border-outline-variant/30 bg-surface-container-low px-2 text-[11px] text-on-surface outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => handleMarkPublished(platformId)}
                          disabled={!publishUrls[platformId]?.trim()}
                          className="h-8 rounded-lg bg-primary px-2.5 text-[11px] font-bold text-on-primary disabled:opacity-40"
                        >
                          Confirm
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
          )}

          {savedVariants?.length || receipts?.length ? (
            <section className="border-t border-outline-variant/25 pt-md text-[11px] text-on-surface-variant">
              {savedVariants?.length ? (
                <p>
                  {savedVariants.length} saved platform version
                  {savedVariants.length === 1 ? '' : 's'}.
                </p>
              ) : null}
              {receipts?.length ? (
                <p className="mt-1">
                  {receipts.filter((receipt) => receipt.status === 'published').length} published
                  receipt
                  {receipts.filter((receipt) => receipt.status === 'published').length === 1
                    ? ''
                    : 's'}{' '}
                  recorded.
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <footer className="flex justify-end gap-sm border-t border-outline-variant/30 px-lg py-md">
          <button
            onClick={onClose}
            className="rounded-full px-md py-sm font-label-md text-on-surface-variant hover:bg-surface-container"
          >
            {status === 'done' ? 'Close' : 'Cancel'}
          </button>
          {status === 'idle' && (
            <button
              onClick={handlePrepare}
              disabled={selected.size === 0}
              className="rounded-full bg-primary px-md py-sm font-label-md text-on-primary disabled:opacity-40"
            >
              Save versions and copy
            </button>
          )}
          {status === 'preparing' && (
            <button
              disabled
              className="rounded-full bg-primary px-md py-sm font-label-md text-on-primary opacity-70"
            >
              Preparing...
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
