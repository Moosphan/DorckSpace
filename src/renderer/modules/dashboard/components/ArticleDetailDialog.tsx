import { useIpcData } from '@/hooks/useIpc'

interface ArticleDetail {
  id: number
  title: string
  content: string | null
  status: string
  category: string | null
  word_count: number
  summary: string | null
  updated_at: string
}

interface ArticleDetailDialogProps {
  articleId: number
  onClose: () => void
}

export function ArticleDetailDialog({ articleId, onClose }: ArticleDetailDialogProps) {
  const { data, loading, error } = useIpcData<ArticleDetail>('articles:getById', articleId)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-md titlebar-no-drag" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <article
        className="relative w-full max-w-[760px] max-h-[82vh] rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xl overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-sm px-md py-sm border-b border-outline-variant/30 shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Recent article</p>
            <h2 className="font-headline-sm text-on-surface truncate mt-1">
              {loading ? 'Loading article...' : data?.title || 'Article detail'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            aria-label="Close article detail"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <div className="overflow-y-auto p-md">
          {loading && <div className="h-48 rounded-lg bg-surface-container-low animate-pulse" />}
          {error && <p className="text-body-sm text-error">{error}</p>}
          {!loading && !error && data && (
            <>
              <div className="flex items-center gap-sm flex-wrap text-[11px] text-on-surface-variant mb-md">
                <span className="px-2 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-bold">{data.status}</span>
                {data.category && <span>{data.category}</span>}
                <span>{data.word_count} words</span>
                <span>Updated {new Date(data.updated_at).toLocaleString()}</span>
              </div>
              {data.summary && (
                <p className="rounded-lg bg-surface-container-low p-sm text-body-sm text-on-surface-variant mb-md">
                  {data.summary}
                </p>
              )}
              <div
                className="text-body-sm leading-7 text-on-surface [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-sm [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-md [&_h2]:mb-xs [&_p]:mb-sm [&_ul]:list-disc [&_ul]:pl-lg [&_ol]:list-decimal [&_ol]:pl-lg [&_a]:text-primary [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: data.content || '<p>暂无正文</p>' }}
              />
            </>
          )}
        </div>
      </article>
    </div>
  )
}
