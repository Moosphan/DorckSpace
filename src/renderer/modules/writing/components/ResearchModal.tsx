import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface ResearchArticle {
  id: number
  title: string
  url: string
  author: string | null
  summary: string | null
  thumbnail_url: string | null
  published_at: string | null
  is_read: number
  is_starred: number
  feed_name?: string
}

interface ResearchModalProps {
  open: boolean
  onClose: () => void
  onOpenArticle?: (article: ResearchArticle) => void
}

export function ResearchModal({ open, onClose, onOpenArticle }: ResearchModalProps) {
  const { toast } = useToast()
  const [articles, setArticles] = useState<ResearchArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      fetchStarredArticles()
    }
  }, [open])

  const fetchStarredArticles = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.invoke('rss:getFilteredArticles', { starred: true, limit: 100 })
      if (res.success) {
        setArticles(res.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch starred articles:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUnstar = async (id: number) => {
    try {
      await window.electronAPI.invoke('rss:toggleStar', id)
      setArticles(prev => prev.filter(a => a.id !== id))
      toast({ title: 'Removed from research', variant: 'success' })
    } catch {
      toast({ title: 'Failed to remove', variant: 'error' })
    }
  }

  const handleOpenExternal = (url: string) => {
    window.electronAPI.openExternal(url)
  }

  const handleAddToLibrary = async (id: number) => {
    try {
      const res = await window.electronAPI.invoke('research-materials:createFromRss', id)
      if (!res.success) throw new Error(res.error)
      toast({ title: 'Added to research library', variant: 'success' })
    } catch {
      toast({ title: 'Could not add to research library', variant: 'error' })
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-2xl border border-outline-variant/30 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-md py-3 border-b border-outline-variant/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">travel_explore</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Active Research</h3>
            {articles.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                {articles.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-md">
          {loading ? (
            <div className="space-y-sm">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-surface-container animate-pulse rounded-lg" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-xl">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-sm block">travel_explore</span>
              <p className="text-body-md text-on-surface-variant">No saved research yet</p>
              <p className="text-body-sm text-on-surface-variant mt-xs">
                Star articles in the Insights tab to save them here for reference.
              </p>
            </div>
          ) : (
            <div className="space-y-sm">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="group p-sm rounded-lg border border-outline-variant/30 hover:border-outline-variant/60 transition-colors"
                >
                  <div className="flex items-start gap-sm">
                    {article.thumbnail_url && (
                      <img
                        src={article.thumbnail_url}
                        alt=""
                        className="w-16 h-12 rounded object-cover shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-sm">
                        <h4
                          className="font-label-md text-on-surface truncate cursor-pointer hover:text-primary"
                          onClick={() => onOpenArticle?.(article)}
                          title={article.title}
                        >
                          {article.title}
                        </h4>
                        <div className="flex items-center gap-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleAddToLibrary(article.id)}
                            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                            title="Add to research library"
                          >
                            <span className="material-symbols-outlined text-[16px]">library_add</span>
                          </button>
                          <button
                            onClick={() => handleOpenExternal(article.url)}
                            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                            title="Open in browser"
                          >
                            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          </button>
                          <button
                            onClick={() => handleUnstar(article.id)}
                            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
                            title="Remove from research"
                          >
                            <span className="material-symbols-outlined text-[16px]">star</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-xs mt-xs text-[11px] text-on-surface-variant">
                        {article.author && <span>{article.author}</span>}
                        {article.author && article.published_at && <span>·</span>}
                        {article.published_at && <span>{formatDate(article.published_at)}</span>}
                      </div>
                      {article.summary && (
                        <p className="text-[12px] text-on-surface-variant mt-xs line-clamp-2">
                          {article.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
