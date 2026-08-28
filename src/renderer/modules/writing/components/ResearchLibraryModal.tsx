import { useEffect, useState } from 'react'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { useToast } from '@/components/ui/toast'

interface ResearchMaterial {
  id: number
  sourceType: 'rss_article' | 'highlight' | null
  title: string
  excerpt: string | null
  url: string | null
  author: string | null
  tags: string[]
  projectId: number | null
  projectName: string | null
  articleId: number | null
  articleTitle: string | null
}

interface Project {
  id: number
  name: string
}

interface Article {
  id: number
  title: string
}

interface ResearchLibraryModalProps {
  open: boolean
  onClose: () => void
  highlightedMaterialId?: number | null
}

const sourceLabel: Record<NonNullable<ResearchMaterial['sourceType']>, string> = {
  rss_article: 'RSS 收藏',
  highlight: '书摘',
}

export function ResearchLibraryModal({ open, onClose, highlightedMaterialId }: ResearchLibraryModalProps) {
  const { toast } = useToast()
  const { data: materials, loading, refetch } = useIpcData<ResearchMaterial[]>('research-materials:getAll')
  const { data: projects } = useIpcData<Project[]>('projects:getAll')
  const { data: articles } = useIpcData<Article[]>('articles:getAll', 100)
  const { mutate: createManual, loading: creating } = useIpcMutation<number>('research-materials:createManual')
  const { mutate: updateLinks } = useIpcMutation<boolean>('research-materials:updateLinks')
  const { mutate: deleteMaterial } = useIpcMutation<boolean>('research-materials:delete')
  const [showComposer, setShowComposer] = useState(false)
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [tags, setTags] = useState('')
  const [projectId, setProjectId] = useState('')
  const [articleId, setArticleId] = useState('')

  useEffect(() => {
    if (open) refetch()
  }, [open, refetch])

  if (!open) return null

  const resetComposer = () => {
    setTitle('')
    setExcerpt('')
    setTags('')
    setProjectId('')
    setArticleId('')
    setShowComposer(false)
  }

  const handleCreate = async () => {
    const materialId = await createManual({
      title,
      excerpt,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      projectId: projectId ? Number(projectId) : undefined,
      articleId: articleId ? Number(articleId) : undefined,
    })
    if (!materialId) {
      toast({ title: 'Could not save material', variant: 'error' })
      return
    }
    resetComposer()
    await refetch()
    toast({ title: 'Material saved', variant: 'success' })
  }

  const handleLinksChange = async (material: ResearchMaterial, nextProjectId: string, nextArticleId: string) => {
    const updated = await updateLinks(material.id, {
      projectId: nextProjectId ? Number(nextProjectId) : null,
      articleId: nextArticleId ? Number(nextArticleId) : null,
    })
    if (updated) await refetch()
  }

  const handleDelete = async (id: number) => {
    if (await deleteMaterial(id)) {
      await refetch()
      toast({ title: 'Material removed', variant: 'success' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-md" onClick={onClose}>
      <div className="bg-surface-container-lowest w-full max-w-4xl max-h-[82vh] rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between px-lg py-md border-b border-outline-variant/30 shrink-0">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">auto_stories</span>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Research Library</h2>
              <p className="text-[11px] text-on-surface-variant">Sources, highlights, and working notes with project context.</p>
            </div>
          </div>
          <div className="flex items-center gap-xs">
            <button onClick={() => setShowComposer((value) => !value)} className="h-8 px-3 rounded-lg bg-primary text-on-primary text-label-sm font-bold flex items-center gap-xs hover:brightness-110">
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add note
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </header>

        {showComposer && (
          <section className="px-lg py-md bg-surface-container-low border-b border-outline-variant/30 grid grid-cols-2 gap-sm">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Material title" className="col-span-2 h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-body-sm outline-none focus:border-primary" />
            <textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="What is worth remembering?" className="col-span-2 min-h-16 px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-body-sm outline-none focus:border-primary resize-none" />
            <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Tags, separated by commas" className="h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-body-sm outline-none focus:border-primary" />
            <div className="flex justify-end gap-xs">
              <button onClick={resetComposer} className="h-9 px-3 text-label-sm text-on-surface-variant">Cancel</button>
              <button onClick={handleCreate} disabled={!title.trim() || creating} className="h-9 px-3 rounded-lg bg-primary text-on-primary text-label-sm font-bold disabled:opacity-50">Save material</button>
            </div>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-body-sm">
              <option value="">No project</option>
              {projects?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <select value={articleId} onChange={(event) => setArticleId(event.target.value)} className="h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-body-sm">
              <option value="">No article</option>
              {articles?.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}
            </select>
          </section>
        )}

        <div className="flex-1 overflow-y-auto p-lg">
          {loading ? (
            <div className="space-y-sm">{[1, 2, 3].map((item) => <div key={item} className="h-24 rounded-xl bg-surface-container animate-pulse" />)}</div>
          ) : !materials?.length ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">auto_stories</span>
              <p className="mt-sm text-body-md text-on-surface-variant">No research material yet</p>
              <p className="mt-xs text-body-sm text-on-surface-variant">Add a starred article, saved highlight, or working note.</p>
            </div>
          ) : (
            <div className="space-y-sm">
              {materials.map((material) => (
                <article key={material.id} className={`group rounded-xl border p-md transition-colors ${highlightedMaterialId === material.id ? 'border-primary bg-primary/5' : 'border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/60'}`}>
                  <div className="flex gap-md">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[17px]">{material.sourceType === 'highlight' ? 'format_quote' : material.sourceType === 'rss_article' ? 'rss_feed' : 'edit_note'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-sm">
                        <div className="min-w-0">
                          <h3 className="font-label-lg text-on-surface leading-snug">{material.title}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-on-surface-variant">
                            <span className="rounded-md bg-surface-container px-1.5 py-0.5">{material.sourceType ? sourceLabel[material.sourceType] : '手动素材'}</span>
                            {material.author && <span>{material.author}</span>}
                            {material.tags.map((tag) => <span key={tag} className="rounded-md bg-secondary-fixed/60 px-1.5 py-0.5 text-secondary">{tag}</span>)}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-xs opacity-0 transition-opacity group-hover:opacity-100">
                          {material.url && <button onClick={() => window.electronAPI.openExternal(material.url!)} className="w-7 h-7 rounded-lg text-on-surface-variant hover:bg-surface-container" title="Open source"><span className="material-symbols-outlined text-[16px]">open_in_new</span></button>}
                          <button onClick={() => handleDelete(material.id)} className="w-7 h-7 rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error" title="Delete material"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                        </div>
                      </div>
                      {material.excerpt && <p className="mt-2 text-body-sm leading-relaxed text-on-surface-variant">{material.excerpt}</p>}
                      <div className="mt-3 grid grid-cols-2 gap-sm">
                        <label className="text-[10px] text-on-surface-variant">Project
                          <select value={material.projectId ?? ''} onChange={(event) => handleLinksChange(material, event.target.value, String(material.articleId ?? ''))} className="mt-1 block h-8 w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-2 text-body-sm text-on-surface">
                            <option value="">No project</option>
                            {projects?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                          </select>
                        </label>
                        <label className="text-[10px] text-on-surface-variant">Article
                          <select value={material.articleId ?? ''} onChange={(event) => handleLinksChange(material, String(material.projectId ?? ''), event.target.value)} className="mt-1 block h-8 w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-2 text-body-sm text-on-surface">
                            <option value="">No article</option>
                            {articles?.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
