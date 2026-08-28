import { useEffect, useState } from 'react'
import { useIpcMutation } from '@/hooks/useIpc'
import { useToast } from '@/components/ui/toast'

interface SelectedMaterial {
  id: number
  title: string
  url: string | null
}

interface ResearchBriefResult {
  id: number
  objective: string
  content: string
  sources: Array<{
    number: number
    materialId: number
    title: string
    url: string | null
  }>
}

interface ResearchAssistantModalProps {
  open: boolean
  materials: SelectedMaterial[]
  onClose: () => void
}

export function ResearchAssistantModal({ open, materials, onClose }: ResearchAssistantModalProps) {
  const { toast } = useToast()
  const { mutate: generate, loading: generating } = useIpcMutation<ResearchBriefResult>('research-assistant:generate')
  const { mutate: saveAsArticle, loading: savingArticle } = useIpcMutation<number>('research-assistant:saveAsArticle')
  const { mutate: saveAsIdea, loading: savingIdea } = useIpcMutation<number>('research-assistant:saveAsIdea')
  const [objective, setObjective] = useState('')
  const [brief, setBrief] = useState<ResearchBriefResult | null>(null)

  useEffect(() => {
    if (open) {
      setObjective('')
      setBrief(null)
    }
  }, [open])

  if (!open) return null

  const handleGenerate = async () => {
    const result = await generate({ materialIds: materials.map((material) => material.id), objective })
    if (!result) {
      toast({ title: 'Research brief could not be generated', variant: 'error' })
      return
    }
    setBrief(result)
  }

  const handleSaveArticle = async () => {
    if (!brief) return
    const articleId = await saveAsArticle(brief.id)
    toast({ title: articleId ? 'Saved as article draft' : 'Could not save article draft', variant: articleId ? 'success' : 'error' })
  }

  const handleSaveIdea = async () => {
    if (!brief) return
    const ideaId = await saveAsIdea(brief.id)
    toast({ title: ideaId ? 'Saved as idea' : 'Could not save idea', variant: ideaId ? 'success' : 'error' })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-sm p-md" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[84vh] overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl flex flex-col" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-md border-b border-outline-variant/30 px-lg py-md">
          <div className="flex gap-sm">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
              <span className="material-symbols-outlined text-[19px]">psychology</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Cited Research</h2>
              <p className="mt-0.5 text-[11px] leading-relaxed text-on-surface-variant">Only these {materials.length} selected materials are sent to the configured AI service.</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container" aria-label="Close research assistant">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-lg space-y-lg">
          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Selected sources</p>
            <div className="flex flex-wrap gap-2">
              {materials.map((material, index) => (
                <span key={material.id} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-surface-container px-2.5 py-1.5 text-[11px] text-on-surface">
                  <span className="font-bold text-primary">[S{index + 1}]</span>
                  <span className="truncate">{material.title}</span>
                </span>
              ))}
            </div>
          </section>

          {!brief ? (
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-md">
              <label className="block text-label-md text-on-surface" htmlFor="research-objective">Research objective</label>
              <textarea id="research-objective" value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="For example: identify product angles for an independent developer launch" className="mt-2 min-h-24 w-full resize-none rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary" autoFocus />
              <div className="mt-3 flex justify-end">
                <button onClick={handleGenerate} disabled={!objective.trim() || generating} className="h-9 rounded-lg bg-primary px-4 text-label-sm font-bold text-on-primary disabled:opacity-50">
                  {generating ? 'Generating...' : 'Generate cited brief'}
                </button>
              </div>
            </section>
          ) : (
            <section className="space-y-md">
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-md">
                <div className="mb-2 flex items-center gap-xs text-[11px] font-bold text-primary">
                  <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                  Research brief
                </div>
                <div className="whitespace-pre-wrap text-body-sm leading-7 text-on-surface">{brief.content}</div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Source references</p>
                <div className="space-y-1.5">
                  {brief.sources.map((source) => (
                    <button key={source.materialId} onClick={() => source.url && window.electronAPI.openExternal(source.url)} disabled={!source.url} className="flex w-full items-center gap-sm rounded-lg bg-surface-container-low px-3 py-2 text-left text-body-sm text-on-surface enabled:hover:bg-surface-container disabled:cursor-default">
                      <span className="font-bold text-primary">[S{source.number}]</span>
                      <span className="flex-1 truncate">{source.title}</span>
                      {source.url && <span className="material-symbols-outlined text-[15px] text-on-surface-variant">open_in_new</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-sm border-t border-outline-variant/25 pt-md">
                <button onClick={() => setBrief(null)} className="h-9 rounded-lg px-3 text-label-sm text-on-surface-variant hover:bg-surface-container">New brief</button>
                <button onClick={handleSaveIdea} disabled={savingIdea} className="h-9 rounded-lg border border-outline-variant/40 px-3 text-label-sm font-bold text-on-surface hover:bg-surface-container disabled:opacity-50">{savingIdea ? 'Saving...' : 'Save as idea'}</button>
                <button onClick={handleSaveArticle} disabled={savingArticle} className="h-9 rounded-lg bg-primary px-3 text-label-sm font-bold text-on-primary disabled:opacity-50">{savingArticle ? 'Saving...' : 'Save as draft'}</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
