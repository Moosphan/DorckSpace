import { useState } from 'react'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { cn } from '@/lib/utils'

interface HighlightWithArticle {
  id: number
  article_id: number
  selected_text: string
  note: string | null
  color: string
  created_at: string
  article_title: string
  article_url: string
  feed_title: string
}

interface HighlightsModalProps {
  open: boolean
  onClose: () => void
}

export function HighlightsModal({ open, onClose }: HighlightsModalProps) {
  const { data: highlights, loading, refetch } = useIpcData<HighlightWithArticle[]>('highlights:getAll', 200)
  const { mutate: deleteHighlight } = useIpcMutation<boolean>('highlights:delete')
  const { mutate: updateNote } = useIpcMutation<boolean>('highlights:updateNote')
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')

  if (!open) return null

  const handleDelete = async (id: number) => {
    await deleteHighlight(id)
    refetch()
  }

  const handleStartEdit = (id: number, currentNote: string | null) => {
    setEditingNoteId(id)
    setNoteText(currentNote || '')
  }

  const handleSaveNote = async (id: number) => {
    await updateNote(id, noteText)
    setEditingNoteId(null)
    setNoteText('')
    refetch()
  }

  const handleOpenArticle = (url: string) => {
    window.electronAPI.openExternal(url)
  }

  const handleExport = async () => {
    if (!highlights || highlights.length === 0) return
    const lines = highlights.map((h) => {
      let line = `> ${h.selected_text}`
      if (h.note) line += `\n\n*Note: ${h.note}*`
      line += `\n\nSource: [${h.article_title}](${h.article_url})`
      return line
    })
    const md = `# Bookmarks Export\n\n${lines.join('\n\n---\n\n')}`
    try {
      await navigator.clipboard.writeText(md)
    } catch { /* ignore */ }
  }

  // Group highlights by article
  const grouped = highlights?.reduce<Record<string, HighlightWithArticle[]>>((acc, h) => {
    const key = h.article_title
    if (!acc[key]) acc[key] = []
    acc[key].push(h)
    return acc
  }, {}) ?? {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-md" onClick={onClose}>
      <div
        className="bg-surface-container-lowest w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-md py-3 border-b border-outline-variant/30 shrink-0">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">bookmarks</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Saved Highlights</h2>
            <span className="text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full font-bold">
              {highlights?.length ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-xs">
            <button
              onClick={handleExport}
              className="flex items-center gap-xs px-2.5 py-1 rounded-md text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors"
              title="Export as Markdown"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              Export
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-md">
          {loading ? (
            <div className="space-y-md">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface-container rounded-lg p-md animate-pulse h-20" />
              ))}
            </div>
          ) : !highlights || highlights.length === 0 ? (
            <div className="text-center py-xl">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-sm block">bookmarks</span>
              <p className="text-body-md text-on-surface-variant">No highlights yet</p>
              <p className="text-body-sm text-on-surface-variant mt-xs">Select text in articles to create highlights</p>
            </div>
          ) : (
            <div className="space-y-md">
              {Object.entries(grouped).map(([articleTitle, items]) => (
                <div key={articleTitle} className="space-y-sm">
                  {/* Article group header */}
                  <div className="flex items-center gap-sm pb-xs border-b border-outline-variant/20">
                    <span className="material-symbols-outlined text-[16px] text-primary">description</span>
                    <button
                      onClick={() => handleOpenArticle(items[0].article_url)}
                      className="font-label-md text-on-surface hover:text-primary transition-colors truncate text-left"
                    >
                      {articleTitle}
                    </button>
                    <span className="text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-full font-bold shrink-0">
                      {items[0].feed_title}
                    </span>
                  </div>

                  {/* Highlights for this article */}
                  {items.map((h) => (
                    <div key={h.id} className="bg-surface-container rounded-lg p-sm group">
                      <p className="text-body-sm text-on-surface italic leading-relaxed">"{h.selected_text}"</p>

                      {editingNoteId === h.id ? (
                        <div className="mt-xs flex gap-xs">
                          <input
                            type="text"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveNote(h.id)}
                            className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded px-2 py-1 text-body-sm text-on-surface outline-none focus:border-primary"
                            placeholder="Add a note..."
                            autoFocus
                          />
                          <button onClick={() => handleSaveNote(h.id)} className="text-primary text-label-sm font-bold">Save</button>
                          <button onClick={() => setEditingNoteId(null)} className="text-on-surface-variant text-label-sm">Cancel</button>
                        </div>
                      ) : h.note ? (
                        <p className="text-[11px] text-on-surface-variant mt-xs flex items-center gap-xs">
                          <span className="material-symbols-outlined text-[12px]">edit_note</span>
                          {h.note}
                        </p>
                      ) : null}

                      <div className="flex items-center justify-between mt-xs">
                        <span className="text-[10px] text-on-surface-variant">
                          {new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <div className="flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEdit(h.id, h.note)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                            title="Edit note"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit_note</span>
                          </button>
                          <button
                            onClick={() => handleOpenArticle(h.article_url)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                            title="Open article"
                          >
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          </button>
                          <button
                            onClick={() => handleDelete(h.id)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
