import { useState, useEffect, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useIpcMutation } from '@/hooks/useIpc'
import { cn } from '@/lib/utils'

interface Article {
  id: number
  feed_id: number
  title: string
  url: string
  author: string | null
  summary: string | null
  thumbnail_url: string | null
  published_at: string | null
  is_read: number
  is_starred: number
  feed_title: string
  feed_category: string | null
}

type DateRange = 'today' | 'week' | 'month' | 'all'

const dateOptions: { value: DateRange; label: string; icon: string }[] = [
  { value: 'today', label: 'Today', icon: 'today' },
  { value: 'week', label: 'This Week', icon: 'date_range' },
  { value: 'month', label: 'This Month', icon: 'calendar_month' },
  { value: 'all', label: 'All', icon: 'all_inclusive' },
]

const categoryColors: Record<string, string> = {
  Tech: 'bg-primary/10 text-primary',
  Design: 'bg-secondary-container text-on-secondary-container',
  AI: 'bg-primary-fixed text-on-primary-fixed-variant',
  News: 'bg-error-container text-error',
  Dev: 'bg-surface-container text-on-surface-variant',
}

export function ArticleFeed({ refreshTrigger, onOpenArticle }: { refreshTrigger?: number; onOpenArticle?: (article: Article) => void }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const isInitialRef = useRef(true)
  const [dateRange, setDateRange] = useState<DateRange>('today')
  const [category, setCategory] = useState<string | null>(null)
  const [starred, setStarred] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const { mutate: markRead } = useIpcMutation('rss:markRead')
  const { mutate: toggleStar } = useIpcMutation('rss:toggleStar')
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: articles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  const fetchArticles = useCallback(async () => {
    if (isInitialRef.current) setLoading(true)
    try {
      const res = await window.electronAPI.invoke('rss:getFilteredArticles', {
        dateRange,
        category: category || undefined,
        starred: starred || undefined,
        limit: 100,
      })
      if (res.success) setArticles(res.data)
    } catch { /* ignore */ }
    if (isInitialRef.current) {
      setLoading(false)
      isInitialRef.current = false
    }
  }, [dateRange, category, starred])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await window.electronAPI.invoke('rss:getArticleCategories')
      if (res.success) setCategories(res.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchArticles() }, [fetchArticles])
  useEffect(() => { fetchCategories() }, [fetchCategories])
  useEffect(() => { if (refreshTrigger) { fetchArticles(); fetchCategories() } }, [refreshTrigger])

  const handleOpen = async (article: Article) => {
    if (!article.is_read) {
      await markRead(article.id)
      setArticles((prev) => prev.map((a) => a.id === article.id ? { ...a, is_read: 1 } : a))
    }
    if (onOpenArticle) {
      onOpenArticle(article)
    } else {
      window.electronAPI.openExternal(article.url)
    }
  }

  const handleStar = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    await toggleStar(id)
    setArticles((prev) => prev.map((a) => a.id === id ? { ...a, is_starred: a.is_starred ? 0 : 1 } : a))
  }

  const handleCopyLink = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(url)
    } catch { /* ignore */ }
  }

  const handleOpenExternal = (e: React.MouseEvent, url: string) => {
    e.stopPropagation()
    window.electronAPI.openExternal(url)
  }

  return (
    <div className="col-span-12 lg:col-span-8 flex flex-col gap-md">
      {/* Header */}
      <div className="flex items-center justify-between pr-2">
        <h2 className="font-headline-lg text-headline-lg">Article Pipeline</h2>
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{articles.length} articles</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-sm flex-wrap">
        {/* Date range */}
        <div className="flex items-center bg-surface-container-low rounded-lg p-0.5">
          {dateOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={cn(
                'flex items-center gap-xs px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors',
                dateRange === opt.value
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              <span className="material-symbols-outlined text-[14px]">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-outline-variant/30" />

        {/* Starred toggle */}
        <button
          onClick={() => setStarred(!starred)}
          className={cn(
            'flex items-center gap-xs px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors',
            starred
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
          )}
        >
          <span className={cn('material-symbols-outlined text-[14px]', starred && 'fill')}>star</span>
          Starred
        </button>

        <div className="w-px h-5 bg-outline-variant/30" />

        {/* Category chips */}
        <div className="flex items-center gap-xs flex-wrap">
          <button
            onClick={() => setCategory(null)}
            className={cn(
              'px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors',
              !category ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(category === cat ? null : cat)}
              className={cn(
                'px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors',
                category === cat ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Article List */}
      {loading ? (
        <div className="space-y-md">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/30 animate-pulse h-28" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-xl border border-outline-variant/30 text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-sm block">
            {starred ? 'star' : 'rss_feed'}
          </span>
          <p className="text-body-md text-on-surface-variant">
            {starred ? 'No starred articles' : 'No articles found'}
          </p>
          <p className="text-body-sm text-on-surface-variant mt-xs">
            {starred ? 'Star articles to see them here' : 'Try a different filter or add RSS feeds'}
          </p>
        </div>
      ) : (
        <div
          ref={parentRef}
          className="overflow-auto pr-2 flex-1 min-h-0"
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const article = articles[virtualRow.index]
              return (
                <div
                  key={article.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="pb-md">
                    <div
                      onClick={() => handleOpen(article)}
                      className={cn(
                        'bg-surface-container-lowest rounded-xl p-md border border-outline-variant/30 group cursor-pointer hover:border-primary/30 transition-colors',
                        article.is_read && 'opacity-60',
                      )}
                    >
                      <div className="flex gap-md">
                        {article.thumbnail_url && (
                          <div className="w-40 h-24 shrink-0 rounded-xl overflow-hidden bg-surface-container-highest">
                            <img src={article.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex flex-col justify-between flex-1 min-w-0">
                          <h3 className="font-headline-sm text-headline-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
                            <span className="inline-flex items-center px-2 py-[1px] bg-primary text-on-primary text-[12px] font-bold rounded-full uppercase tracking-wider align-middle relative -top-[3px] mr-1.5">
                              {article.feed_title}
                            </span>
                            {article.title}
                          </h3>
                          {article.summary && (
                            <p className="text-on-surface-variant text-body-sm line-clamp-2 mt-xs">{article.summary}</p>
                          )}
                          <div className="flex items-center justify-between mt-sm">
                            <div className="flex items-center gap-sm">
                              {article.is_read ? (
                                <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50">drafts</span>
                              ) : (
                                <span className="material-symbols-outlined text-[14px] text-primary">mark_email_unread</span>
                              )}
                              {article.feed_category && (
                                <span className={cn(
                                  'inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-bold leading-none',
                                  categoryColors[article.feed_category] || 'bg-surface-container text-on-surface-variant',
                                )}>
                                  {article.feed_category}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-xs">
                              <button
                                onClick={(e) => handleCopyLink(e, article.url)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                                title="Copy link"
                              >
                                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                              </button>
                              <button
                                onClick={(e) => handleOpenExternal(e, article.url)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                                title="Open in browser"
                              >
                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                              </button>
                              <button
                                onClick={(e) => handleStar(e, article.id)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-secondary transition-colors"
                              >
                                <span className={cn('material-symbols-outlined text-[16px]', article.is_starred && 'fill text-secondary')}>
                                  {article.is_starred ? 'star' : 'star_border'}
                                </span>
                              </button>
                              <div className="w-px h-4 bg-outline-variant/30 mx-0.5" />
                              {article.published_at && (
                                <span className="text-on-surface-variant text-[11px] ml-1">
                                  {new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
