import { useState, useEffect, useCallback } from 'react'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { cn } from '@/lib/utils'

interface Feed {
  id: number
  title: string
  url: string
  category: string | null
  is_active: number
  last_fetched_at: string | null
}

interface FeedDetail extends Feed {
  article_count: number
  unread_count: number
}

export function FeedManager({ onClose, onFeedAdded }: { onClose: () => void; onFeedAdded?: () => void }) {
  const { data: feeds, refetch } = useIpcData<Feed[]>('rss:getFeeds')
  const { mutate: addFeed, loading: adding } = useIpcMutation('rss:addFeed')
  const { mutate: deleteFeed } = useIpcMutation('rss:deleteFeed')
  const { mutate: toggleActive } = useIpcMutation('rss:toggleFeedActive')
  const { mutate: updateFeed } = useIpcMutation('rss:updateFeed')

  const [showAdd, setShowAdd] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')

  // Detail view
  const [selectedFeed, setSelectedFeed] = useState<FeedDetail | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editCategory, setEditCategory] = useState('')

  useEffect(() => {
    if (selectedFeed) {
      setEditTitle(selectedFeed.title)
      setEditUrl(selectedFeed.url)
      setEditCategory(selectedFeed.category || '')
    }
  }, [selectedFeed])

  const handleAdd = useCallback(async () => {
    if (!newUrl.trim()) return
    setError('')
    try { new URL(newUrl.trim()) } catch { setError('Please enter a valid URL'); return }

    const result = await addFeed({ title: newTitle.trim(), url: newUrl.trim(), category: newCategory.trim() || undefined })
    if (result) {
      setNewUrl(''); setNewTitle(''); setNewCategory(''); setShowAdd(false); refetch()
      setTimeout(() => onFeedAdded?.(), 1500)
    } else {
      setError('Failed to add feed. Check the URL.')
    }
  }, [newUrl, newTitle, newCategory, addFeed, refetch, onFeedAdded])

  const handleToggle = useCallback(async (id: number) => {
    await toggleActive(id)
    refetch()
    onFeedAdded?.()
  }, [toggleActive, refetch, onFeedAdded])

  const handleDelete = useCallback(async (id: number) => {
    await deleteFeed(id)
    setSelectedFeed(null)
    refetch()
    onFeedAdded?.()
  }, [deleteFeed, refetch, onFeedAdded])

  const handleSaveEdit = useCallback(async () => {
    if (!selectedFeed) return
    await updateFeed(selectedFeed.id, { title: editTitle, url: editUrl, category: editCategory || undefined })
    setSelectedFeed(null)
    refetch()
  }, [selectedFeed, editTitle, editCategory, updateFeed, refetch])

  // Detail view
  if (selectedFeed) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md p-md space-y-md">
          <div className="flex items-center gap-sm">
            <button onClick={() => setSelectedFeed(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h3 className="font-headline-sm text-headline-sm flex-1">Feed Details</h3>
            <button onClick={() => handleDelete(selectedFeed.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error/10 transition-colors">
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>

          <div className="space-y-md">
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-xs">Title</label>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none" />
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-xs">URL</label>
              <input type="text" value={editUrl} onChange={(e) => setEditUrl(e.target.value)}
                className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none" />
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-xs">Category</label>
              <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                placeholder="e.g., Tech, Design, AI"
                className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none" />
            </div>
            <div className="flex gap-md">
              <div className="flex-1 bg-surface-container-low rounded-lg p-sm text-center">
                <p className="text-headline-sm text-primary font-bold">{selectedFeed.article_count}</p>
                <p className="text-[10px] text-on-surface-variant uppercase">Articles</p>
              </div>
              <div className="flex-1 bg-surface-container-low rounded-lg p-sm text-center">
                <p className="text-headline-sm text-primary font-bold">{selectedFeed.unread_count}</p>
                <p className="text-[10px] text-on-surface-variant uppercase">Unread</p>
              </div>
            </div>
            {selectedFeed.last_fetched_at && (
              <p className="text-[11px] text-on-surface-variant">Last fetched: {selectedFeed.last_fetched_at}</p>
            )}
          </div>

          <div className="flex justify-end gap-sm pt-sm border-t border-outline-variant/30">
            <button onClick={() => setSelectedFeed(null)} className="px-md py-sm rounded-full font-label-md text-on-surface-variant hover:bg-surface-container">Cancel</button>
            <button onClick={handleSaveEdit} className="px-md py-sm rounded-full bg-primary text-on-primary font-label-md hover:brightness-110 active:scale-95 transition-all">Save</button>
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md p-md space-y-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm">RSS Subscriptions</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-xs">
          {!feeds || feeds.length === 0 ? (
            <div className="text-center py-lg">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 block mb-sm">rss_feed</span>
              <p className="text-body-sm text-on-surface-variant">No subscriptions yet</p>
            </div>
          ) : (
            feeds.map((feed) => (
              <div
                key={feed.id}
                onClick={async () => {
                  const res = await window.electronAPI.invoke('rss:getFeedDetail', feed.id)
                  if (res.success) setSelectedFeed(res.data)
                }}
                className="flex items-center gap-md p-sm rounded-lg hover:bg-surface-container-low cursor-pointer group transition-colors"
              >
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                  feed.is_active ? 'bg-primary-fixed dark:bg-primary-container text-primary dark:text-on-primary-container' : 'bg-surface-container text-on-surface-variant',
                )}>
                  <span className="material-symbols-outlined text-[18px]">rss_feed</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-label-md text-body-sm truncate', feed.is_active ? 'text-on-surface' : 'text-on-surface-variant line-through')}>
                    {feed.title}
                  </p>
                  <p className="text-[11px] text-on-surface-variant truncate">{feed.url}</p>
                </div>
                {feed.category && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant shrink-0">
                    {feed.category}
                  </span>
                )}
                {/* Toggle */}
                <div onClick={(e) => { e.stopPropagation(); handleToggle(feed.id) }} className="shrink-0 cursor-pointer">
                  <div className={cn('w-9 h-5 rounded-full transition-colors relative', feed.is_active ? 'bg-primary' : 'bg-outline-variant/40')}>
                    <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-surface-container-lowest shadow transition-transform', feed.is_active ? 'translate-x-[18px]' : 'translate-x-0.5')} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {showAdd ? (
          <div className="border-t border-outline-variant/30 pt-md space-y-sm">
            {error && <p className="text-body-sm text-error">{error}</p>}
            <div className="flex flex-wrap gap-xs mb-sm">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase self-center">Popular:</span>
              {[
                { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
                { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
                { name: 'GitHub Blog', url: 'https://github.blog/feed/' },
                { name: 'DEV.to', url: 'https://dev.to/feed' },
              ].map((s) => (
                <button key={s.name} onClick={() => { setNewUrl(s.url); setNewTitle(s.name) }}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container text-primary hover:bg-primary hover:text-on-primary transition-colors">
                  {s.name}
                </button>
              ))}
            </div>
            <input type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. https://hnrss.org/frontpage" className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-1.5 text-body-sm outline-none" autoFocus />
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (auto-detected)" className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-1.5 text-body-sm outline-none" />
            <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category (optional)" className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-1.5 text-body-sm outline-none" />
            <div className="flex justify-end gap-sm">
              <button onClick={() => { setShowAdd(false); setNewUrl(''); setError('') }} disabled={adding} className="px-md py-1.5 rounded-full font-label-md text-on-surface-variant hover:bg-surface-container text-body-sm disabled:opacity-50">Cancel</button>
              <button onClick={handleAdd} disabled={!newUrl.trim() || adding} className="px-md py-1.5 rounded-full bg-primary text-on-primary font-label-md disabled:opacity-40 text-body-sm flex items-center gap-xs">
                {adding && <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>}
                {adding ? 'Adding...' : 'Add Feed'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="w-full flex items-center justify-center gap-sm py-md border-2 border-dashed border-primary/20 rounded-xl text-primary hover:bg-primary/5 transition-colors font-label-md text-body-sm">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add RSS Feed
          </button>
        )}
      </div>
    </div>
  )
}
