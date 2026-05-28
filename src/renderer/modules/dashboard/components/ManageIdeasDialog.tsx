import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { cn } from '@/lib/utils'

interface Idea {
  id: number
  content: string
  category: string
  is_pinned: number
  created_at: string
}

interface ManageIdeasDialogProps {
  open: boolean
  onClose: () => void
  onCreateNew?: () => void
  onChanged?: () => void
}

export function ManageIdeasDialog({ open, onClose, onCreateNew, onChanged }: ManageIdeasDialogProps) {
  const { data: ideas, refetch } = useIpcData<Idea[]>('ideas:getRecent', 100)
  const { mutate: togglePin } = useIpcMutation<boolean>('ideas:togglePin')
  const { mutate: deleteIdea } = useIpcMutation<boolean>('ideas:delete')

  if (!open) return null

  const pinned = ideas?.filter((i) => i.is_pinned) ?? []
  const others = ideas?.filter((i) => !i.is_pinned) ?? []

  const handleTogglePin = async (id: number) => {
    await togglePin(id)
    refetch()
    onChanged?.()
  }

  const handleDelete = async (id: number) => {
    await deleteIdea(id)
    refetch()
    onChanged?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-md" onClick={onClose}>
      <div
        className="bg-surface-container-lowest w-full max-w-[600px] max-h-[75vh] rounded-2xl shadow-xl border border-outline-variant/30 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-md py-4 border-b border-outline-variant/30 shrink-0">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Manage Ideas</h2>
          <button
            onClick={onClose}
            className="text-primary hover:bg-primary-container/10 px-3 py-1 rounded-full transition-colors font-semibold font-label-md"
          >
            Done
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-md space-y-md">
          {pinned.length > 0 && (
            <div className="space-y-sm">
              {pinned.map((idea) => (
                <div
                  key={idea.id}
                  className="bg-surface-container-lowest border-2 border-primary-container p-sm relative shadow-ambient hover:scale-[1.01] transition-transform cursor-pointer rounded-lg group"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-body-md font-bold text-on-surface pr-8 line-clamp-1">{idea.content}</p>
                    <div className="flex items-center gap-xs shrink-0">
                      <button
                        onClick={() => handleTogglePin(idea.id)}
                        className="text-primary"
                        title="Unpin"
                      >
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>push_pin</span>
                      </button>
                      <button
                        onClick={() => handleDelete(idea.id)}
                        className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-body-sm text-on-surface-variant mt-1 line-clamp-2">{idea.content}</p>
                </div>
              ))}
            </div>
          )}

          {others.length > 0 && (
            <div className="space-y-sm">
              {pinned.length > 0 && (
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Other Ideas</p>
              )}
              {others.map((idea) => (
                <div
                  key={idea.id}
                  className="bg-surface-container-lowest border border-outline-variant/30 p-sm hover:border-primary/40 transition-colors cursor-pointer group rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-body-md font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1 pr-8">
                      {idea.content}
                    </p>
                    <div className="flex items-center gap-xs shrink-0">
                      <button
                        onClick={() => handleTogglePin(idea.id)}
                        className="text-on-surface-variant hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Pin"
                      >
                        <span className="material-symbols-outlined text-[18px]">push_pin</span>
                      </button>
                      <button
                        onClick={() => handleDelete(idea.id)}
                        className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-body-sm text-on-surface-variant mt-1 line-clamp-2">{idea.content}</p>
                </div>
              ))}
            </div>
          )}

          {(!ideas || ideas.length === 0) && (
            <div className="text-center py-lg">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 block mb-sm">lightbulb</span>
              <p className="text-body-sm text-on-surface-variant">No ideas yet</p>
            </div>
          )}

          <div className="h-4" />
        </div>

        <div className="p-md flex justify-center border-t border-outline-variant/30 shrink-0">
          <button
            onClick={() => { onClose(); onCreateNew?.() }}
            className="bg-primary text-on-primary font-bold py-2.5 px-6 rounded-lg shadow-lg flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all font-label-md"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create New Idea
          </button>
        </div>
      </div>
    </div>
  )
}
