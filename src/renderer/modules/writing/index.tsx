import { useState, useCallback, useRef, useEffect } from 'react'
import { Editor } from './components/Editor'
import { ArticleList } from './components/ArticleList'
import { CategorySelector } from './components/CategorySelector'
import { PublishPanel } from './components/PublishPanel'
import { HighlightsModal } from './components/HighlightsModal'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'

interface Article {
  id: number
  title: string
  content: string | null
  status: string
  word_count: number
  category: string | null
}

export default function Writing() {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState('Untitled')
  const [newCategory, setNewCategory] = useState<string | null>(null)
  const [showPublish, setShowPublish] = useState(false)
  const [showHighlights, setShowHighlights] = useState(false)
  const createdIdRef = useRef<number | null>(null)

  const { data: article, refetch } = useIpcData<Article | null>(
    editingId && editingId > 0 ? 'articles:getById' : '',
    editingId ?? 0,
  )
  const { mutate: createArticle } = useIpcMutation<number>('articles:create')
  const { mutate: updateContent } = useIpcMutation<boolean>('articles:updateContent')
  const { mutate: updateArticle } = useIpcMutation<boolean>('articles:update')

  // Sync article DB data → local state (only on initial load / article change)
  useEffect(() => {
    if (article) {
      setNewTitle(article.title)
      setNewCategory(article.category)
    }
  }, [article?.id])

  /**
   * Ensure article exists in DB. Returns the real article ID.
   * If already created (via ref), returns cached ID without re-creating.
   */
  const ensureArticle = useCallback(async (): Promise<number> => {
    if (createdIdRef.current) return createdIdRef.current

    const id = await createArticle({
      title: newTitle,
      category: newCategory ?? undefined,
    })
    if (id) {
      createdIdRef.current = id
      setEditingId(id)
    }
    return id ?? 0
  }, [newTitle, newCategory, createArticle])

  const handleOpenArticle = useCallback((id: number) => {
    setEditingId(id)
    setNewTitle('Untitled')
    setNewCategory(null)
    createdIdRef.current = id > 0 ? id : null
  }, [])

  const handleBack = useCallback(async () => {
    // Save before leaving
    if (createdIdRef.current) {
      await updateArticle(createdIdRef.current, { title: newTitle, category: newCategory ?? undefined })
    } else if (editingId === 0) {
      // New unsaved article - try to persist
      await ensureArticle()
    }
    setEditingId(null)
    setNewCategory(null)
    createdIdRef.current = null
  }, [editingId, newTitle, newCategory, ensureArticle, updateArticle])

  const handleUpdateContent = useCallback(
    async (content: string) => {
      const id = await ensureArticle()
      if (id > 0) await updateContent(id, content)
    },
    [ensureArticle, updateContent],
  )

  const handleTitleChange = useCallback(
    async (title: string) => {
      setNewTitle(title)
      const id = await ensureArticle()
      if (id > 0) await updateArticle(id, { title })
    },
    [ensureArticle, updateArticle],
  )

  const handleCategoryChange = useCallback(
    async (category: string | null) => {
      setNewCategory(category)
      const id = await ensureArticle()
      if (id > 0) await updateArticle(id, { category })
    },
    [ensureArticle, updateArticle],
  )

  // Editor view
  if (editingId !== null) {
    const displayTitle = newTitle
    const displayContent = article?.content ?? ''
    const wordCount = article?.word_count ?? 0
    const displayCategory = newCategory

    return (
      <div className="p-lg space-y-lg animate-fade-in max-w-[1024px] mx-auto w-full">
        {/* Back button + Title */}
        <div className="flex items-center gap-md">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <input
            type="text"
            value={displayTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="flex-1 font-headline-xl text-headline-xl bg-transparent outline-none text-on-surface placeholder-on-surface-variant/50"
            placeholder="Article title..."
          />
        </div>

        {/* Meta: Category + Word Count + Publish */}
        <div className="flex items-center gap-md">
          <CategorySelector value={displayCategory} onChange={handleCategoryChange} />
          <span className="text-body-sm text-on-surface-variant">
            {wordCount.toLocaleString()} words
          </span>
          <div className="flex-1" />
          {createdIdRef.current && (
            <button
              onClick={() => setShowPublish(true)}
              className="h-9 px-5 bg-primary text-on-primary rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-[18px]">publish</span>
              Publish
            </button>
          )}
        </div>

        {/* Editor */}
        <Editor
          content={displayContent}
          onUpdate={handleUpdateContent}
          placeholder="Start writing your article..."
          autofocus
        />

        {/* Publish Panel */}
        {showPublish && createdIdRef.current && (
          <PublishPanel
            articleId={createdIdRef.current}
            articleTitle={displayTitle}
            content={displayContent}
            onClose={() => setShowPublish(false)}
          />
        )}
      </div>
    )
  }

  // List view
  return (
    <div className="p-lg space-y-lg animate-fade-in max-w-[1280px] mx-auto w-full">
      <div>
        <h2 className="font-headline-xl text-headline-xl">Writing Studio</h2>
        <p className="text-body-lg text-on-surface-variant mt-2">
          Manage your drafts, research, and creative assets.
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-md">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">inventory_2</span>
            Material Box
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-ambient h-48 flex flex-col cursor-pointer hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary mb-4">
              <span className="material-symbols-outlined fill">travel_explore</span>
            </div>
            <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1">Active Research</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-auto">Saved articles and threads</p>
          </div>
          <div
            onClick={() => setShowHighlights(true)}
            className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-ambient h-48 flex flex-col cursor-pointer hover:-translate-y-1 transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary mb-4">
              <span className="material-symbols-outlined fill">bookmarks</span>
            </div>
            <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1">Saved Links</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-auto">Bookmarks and references</p>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-ambient h-48 flex flex-col cursor-pointer hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary mb-4">
              <span className="material-symbols-outlined fill">palette</span>
            </div>
            <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1">Moodboards</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-auto">Visual inspiration spaces</p>
          </div>
        </div>
      </section>

      <ArticleList onOpenArticle={handleOpenArticle} />

      <HighlightsModal
        open={showHighlights}
        onClose={() => setShowHighlights(false)}
      />
    </div>
  )
}
