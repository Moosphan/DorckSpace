import { useState } from 'react'
import { useIpcMutation } from '@/hooks/useIpc'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'writing', label: 'Writing', icon: 'edit_note', bg: 'bg-primary-fixed text-on-primary-fixed-variant', ring: 'ring-primary/30' },
  { value: 'coding', label: 'Coding', icon: 'code', bg: 'bg-blue-100 text-blue-700', ring: 'ring-blue-300' },
  { value: 'design', label: 'Design', icon: 'palette', bg: 'bg-pink-100 text-pink-700', ring: 'ring-pink-300' },
  { value: 'research', label: 'Research', icon: 'science', bg: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-300' },
  { value: 'work', label: 'Work', icon: 'work', bg: 'bg-amber-100 text-amber-800', ring: 'ring-amber-300' },
  { value: 'social', label: 'Social Media', icon: 'share', bg: 'bg-sky-100 text-sky-700', ring: 'ring-sky-300' },
]

interface CreateIdeaDialogProps {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

export function CreateIdeaDialog({ open, onClose, onCreated }: CreateIdeaDialogProps) {
  const { mutate: createIdea } = useIpcMutation<number>('ideas:create')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('writing')
  const [isPrivate, setIsPrivate] = useState(false)

  if (!open) return null

  const handleSave = async () => {
    if (!content.trim()) return
    await createIdea({ content: content.trim(), category, is_private: isPrivate ? 1 : 0 })
    setContent('')
    setCategory('writing')
    setIsPrivate(false)
    onCreated?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-md" onClick={onClose}>
      <div
        className="bg-surface-container-lowest w-full max-w-[560px] rounded-2xl shadow-xl border border-outline-variant/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-md py-sm border-b border-outline-variant/30 flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Create New Idea</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-error transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-md space-y-md">
          <div className="space-y-xs">
            <label className="font-label-md text-label-md text-on-surface">What's your idea?</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg p-md font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 outline-none resize-none transition-all"
              placeholder="Start typing your breakthrough concept..."
              rows={5}
              autoFocus
            />
          </div>

          <div className="space-y-xs">
            <label className="font-label-md text-label-md text-on-surface">Category</label>
            <div className="flex flex-wrap gap-xs">
              {CATEGORIES.map((cat) => (
                <label key={cat.value} className="cursor-pointer group">
                  <input
                    type="radio"
                    name="category"
                    value={cat.value}
                    checked={category === cat.value}
                    onChange={() => setCategory(cat.value)}
                    className="hidden peer"
                  />
                  <span className={cn(
                    'px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-xs',
                    category === cat.value
                      ? cn(cat.bg, cat.ring, 'ring-1 border-transparent')
                      : 'border border-outline-variant bg-surface text-on-surface-variant group-hover:bg-surface-container-high',
                  )}>
                    <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>
                    {cat.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-xs">
            <input
              type="checkbox"
              id="idea-private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-outline text-primary focus:ring-primary w-4 h-4"
            />
            <label htmlFor="idea-private" className="font-body-sm text-body-sm text-on-surface-variant">
              Make this idea private
            </label>
          </div>
        </div>

        <div className="px-md py-sm bg-surface-container border-t border-outline-variant/30 flex items-center justify-end gap-sm rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-md py-xs rounded-full font-label-md text-label-md text-on-surface-variant hover:bg-surface-variant transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!content.trim()}
            className="px-lg py-xs rounded-full font-label-md text-label-md bg-primary text-on-primary hover:brightness-110 active:scale-95 transition-all shadow-md disabled:opacity-40"
          >
            Save Idea
          </button>
        </div>
      </div>
    </div>
  )
}
