import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: number
  type: 'article' | 'task' | 'note' | 'draft'
  title: string
  subtitle: string
  icon: string
}

const typeRoutes: Record<string, string> = {
  article: '/writing',
  task: '/dashboard',
  note: '/writing',
  draft: '/writing',
}

const typeColors: Record<string, string> = {
  article: 'bg-primary-fixed text-primary',
  task: 'bg-secondary-container text-secondary',
  note: 'bg-primary-fixed text-primary',
  draft: 'bg-surface-variant text-on-surface-variant',
}

export function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query || query.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await window.electronAPI.invoke('search:all', query)
        if (res.success) {
          setResults(res.data)
          setSelectedIdx(0)
        }
      } catch { /* ignore */ }
      setLoading(false)
    }, 200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  const handleSelect = useCallback((result: SearchResult) => {
    onClose()
    navigate(typeRoutes[result.type] || '/dashboard')
  }, [onClose, navigate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      handleSelect(results[selectedIdx])
    }
  }, [results, selectedIdx, onClose, handleSelect])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-outline-variant/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-sm px-md py-sm border-b border-outline-variant/30">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search articles, tasks, notes..."
            className="flex-1 bg-transparent outline-none text-body-md text-on-surface placeholder-on-surface-variant/50"
          />
          <kbd className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto">
          {loading && (
            <div className="p-md text-center text-body-sm text-on-surface-variant">Searching...</div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="p-md text-center text-body-sm text-on-surface-variant">No results found</div>
          )}

          {!loading && results.map((result, idx) => (
            <div
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIdx(idx)}
              className={cn(
                'flex items-center gap-md px-md py-sm cursor-pointer transition-colors',
                idx === selectedIdx ? 'bg-primary/5' : 'hover:bg-surface-container-low',
              )}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', typeColors[result.type])}>
                <span className="material-symbols-outlined text-[16px]">{result.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-label-md text-on-surface truncate">{result.title}</p>
                <p className="text-body-sm text-on-surface-variant truncate">{result.subtitle}</p>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase px-2 py-0.5 rounded-full bg-surface-container">
                {result.type}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-md px-md py-2 border-t border-outline-variant/30 text-[10px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <kbd className="bg-surface-container px-1 rounded">↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-surface-container px-1 rounded">↵</kbd> Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-surface-container px-1 rounded">Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  )
}
