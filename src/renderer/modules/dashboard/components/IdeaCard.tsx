import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react'
import { useIpcData } from '@/hooks/useIpc'
import { cn } from '@/lib/utils'

interface Idea {
  id: number
  content: string
  category: string
  is_pinned: number
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  writing: 'WRITING',
  coding: 'CODING',
  design: 'DESIGN',
  research: 'RESEARCH',
}

interface IdeaCardProps {
  onCreateNew?: () => void
  onManage?: () => void
}

export interface IdeaCardHandle {
  refresh: () => void
}

export const IdeaCard = forwardRef<IdeaCardHandle, IdeaCardProps>(function IdeaCard({ onCreateNew, onManage }, ref) {
  const { data: pinned, refetch: refetchPinned } = useIpcData<Idea[]>('ideas:getPinned')
  const { data: recent, refetch: refetchRecent } = useIpcData<Idea[]>('ideas:getRecent', 10)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  const items = (pinned && pinned.length > 0 ? pinned : recent) ?? []

  useImperativeHandle(ref, () => ({
    refresh: () => { refetchPinned(); refetchRecent() },
  }))

  useEffect(() => {
    if (items.length <= 1 || paused) return
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length)
    }, 5000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [items.length, paused])

  const handleDotClick = useCallback((idx: number) => {
    setCurrentIndex(idx)
  }, [])

  const current = items[currentIndex]
  const hasItems = items.length > 0

  return (
    <div
      className={cn(
        'rounded-xl shadow-ambient flex flex-col gap-md p-sm mb-1',
        'bg-surface-container-lowest border border-outline-variant/30',
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex justify-between items-center px-1">
        <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
          Ideas &amp; Inspiration
        </h4>
        <div className="flex items-center gap-base">
          <button
            onClick={onManage}
            className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            title="Manage"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
          </button>
          <button
            onClick={onCreateNew}
            className="w-6 h-6 rounded-full flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-colors"
            title="New idea"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
        </div>
      </div>

      {!hasItems ? (
        <div
          onClick={onCreateNew}
          className="relative bg-gradient-to-br from-primary-fixed to-surface-container-low rounded-lg p-md min-h-[140px] flex flex-col items-center justify-center text-center gap-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <span className="material-symbols-outlined text-[32px] text-primary/40">lightbulb</span>
          <p className="text-body-sm text-on-surface-variant">No ideas yet. Click to add one.</p>
        </div>
      ) : (
        <div className="relative bg-gradient-to-br from-primary-fixed to-surface-container-low rounded-lg p-md min-h-[140px] flex flex-col items-center justify-center text-center gap-sm overflow-hidden cursor-pointer pb-8">
          {current.is_pinned ? (
            <div className="absolute top-3 right-3 z-20 text-primary/60">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>push_pin</span>
            </div>
          ) : null}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-headline-xl text-[72px] font-black text-primary/5 uppercase tracking-tighter select-none transform -rotate-6">
              {CATEGORY_LABELS[current.category] || current.category.toUpperCase()}
            </span>
          </div>

          <p className="relative z-10 font-body-md font-semibold italic leading-relaxed max-w-[90%] drop-shadow-sm text-primary">
            "{current.content}"
          </p>

          {items.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handleDotClick(idx)}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    idx === currentIndex ? 'bg-primary' : 'bg-outline-variant/40',
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
})
