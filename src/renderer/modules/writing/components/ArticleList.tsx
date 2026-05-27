import { useState, useRef, useEffect } from 'react'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Article {
  id: number
  title: string
  status: 'draft' | 'editing' | 'review' | 'published' | 'archived'
  word_count: number
  category: string | null
  updated_at: string
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-surface-variant text-on-surface-variant' },
  editing: { label: 'In Progress', color: 'bg-secondary-fixed/50 text-on-secondary-fixed-variant' },
  review: { label: 'In Review', color: 'bg-primary-fixed text-on-primary-fixed-variant' },
  published: { label: 'Published', color: 'bg-primary/10 text-primary' },
  archived: { label: 'Archived', color: 'bg-surface-container text-on-surface-variant' },
}

const allStatuses: Article['status'][] = ['draft', 'editing', 'review', 'published', 'archived']

interface ArticleListProps {
  onOpenArticle: (id: number) => void
}

function ActionMenu({
  article,
  onAction,
}: {
  article: Article
  onAction: (action: string, id: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setOpen(!open)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors opacity-0 group-hover:opacity-100"
      >
        <span className="material-symbols-outlined text-[18px]">more_vert</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="fixed bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-lg p-1 min-w-[180px] z-[200]"
          style={{ top: pos.top, right: pos.right }}
        >
          <div className="px-md py-sm">
            <p className="font-label-sm text-on-surface-variant text-[10px] uppercase tracking-wider mb-xs">
              Change Status
            </p>
            <div className="flex flex-wrap gap-1">
              {allStatuses.map((status) => {
                const cfg = statusConfig[status]
                return (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation()
                      onAction(`status:${status}`, article.id)
                      setOpen(false)
                    }}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors',
                      article.status === status
                        ? 'ring-1 ring-primary ' + cfg.color
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="border-t border-outline-variant/20 my-1" />
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAction('delete', article.id)
              setOpen(false)
            }}
            className="w-full flex items-center gap-sm px-md py-sm rounded-lg text-error hover:bg-error/10 transition-colors font-label-md"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Delete
          </button>
        </div>
      )}
    </>
  )
}

export function ArticleList({ onOpenArticle }: ArticleListProps) {
  const { data: articles, loading, refetch } = useIpcData<Article[]>('articles:getRecent', 50)
  const { mutate: deleteArticle } = useIpcMutation<boolean>('articles:delete')
  const { mutate: updateStatus } = useIpcMutation<boolean>('articles:updateStatus')

  const handleAction = async (action: string, id: number) => {
    if (action === 'delete') {
      await deleteArticle(id)
    } else if (action.startsWith('status:')) {
      const status = action.replace('status:', '')
      await updateStatus(id, status)
    }
    refetch()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-md">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">description</span>
          Articles
        </h3>
        <button
          onClick={() => onOpenArticle(0)}
          className="h-10 px-5 bg-primary text-on-primary rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Article
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low/50 border-b border-outline-variant/30">
              <th className="font-label-md text-label-md text-on-surface-variant py-4 px-6 font-semibold">Title</th>
              <th className="font-label-md text-label-md text-on-surface-variant py-4 px-6 font-semibold w-40">Status</th>
              <th className="font-label-md text-label-md text-on-surface-variant py-4 px-6 font-semibold w-32">Words</th>
              <th className="font-label-md text-label-md text-on-surface-variant py-4 px-6 font-semibold w-48">Last Edited</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-on-surface-variant">Loading...</td>
              </tr>
            ) : !articles || articles.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                  No articles yet. Create your first one!
                </td>
              </tr>
            ) : (
              articles.map((article) => {
                const config = statusConfig[article.status]
                return (
                  <tr
                    key={article.id}
                    onClick={() => onOpenArticle(article.id)}
                    className="hover:bg-surface-container-low/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-fixed/30 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[20px]">article</span>
                        </div>
                        <div>
                          <p className="font-body-md text-body-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                            {article.title}
                          </p>
                          {article.category && (
                            <p className="font-body-sm text-body-sm text-on-surface-variant">{article.category}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={cn('inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-bold leading-none', config.color)}>
                        {config.label}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-body-sm text-body-sm text-on-surface-variant">
                      {article.word_count.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">
                      {article.updated_at?.replace(/:\d{2}$/, '').replace(' ', ' ')}
                    </td>
                    <td className="py-4 px-2" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu article={article} onAction={handleAction} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
