import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

const DEFAULT_CATEGORIES = ['其他']

interface CategorySelectorProps {
  value: string | null
  onChange: (category: string | null) => void
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const [open, setOpen] = useState(false)
  const [dbCategories, setDbCategories] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const categories = Array.from(new Set([...DEFAULT_CATEGORIES, ...dbCategories]))

  // Fetch categories from DB
  const fetchCategories = useCallback(async () => {
    try {
      const res = await window.electronAPI.invoke('articles:getCategories')
      if (res.success && Array.isArray(res.data)) {
        setDbCategories(res.data)
      }
    } catch { /* ignore */ }
  }, [])

  // Fetch when dropdown opens
  useEffect(() => {
    if (open) fetchCategories()
  }, [open, fetchCategories])

  // Close on outside click (use 'click', same event type as item clicks)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setIsCustom(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [open])

  const handleSelect = useCallback((cat: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    setIsCustom(false)
    onChange(cat)
  }, [onChange])

  const handleCustomClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsCustom(true)
    setInputValue('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleConfirm = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    const trimmed = inputValue.trim()
    if (trimmed) {
      // Persist the custom category
      await window.electronAPI.invoke('articles:addCategory', trimmed)
      setOpen(false)
      setIsCustom(false)
      onChange(trimmed)
    }
  }, [inputValue, onChange])

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    setIsCustom(false)
    onChange(null)
  }, [onChange])

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(prev => !prev)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-xs px-sm py-1 rounded-full text-label-sm transition-colors whitespace-nowrap',
          value
            ? 'bg-primary-fixed text-on-primary-fixed-variant'
            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
        )}
      >
        <span className="material-symbols-outlined text-[14px]">label</span>
        {value || 'Category'}
        <span className="material-symbols-outlined text-[12px]">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-lg p-1 min-w-[200px] z-[200]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-h-[200px] overflow-y-auto">
            {categories.map((cat) => (
              <div
                key={cat}
                onClick={(e) => handleSelect(cat, e)}
                className={cn(
                  'w-full flex items-center gap-sm px-md py-2 rounded-lg text-body-sm text-left whitespace-nowrap cursor-pointer select-none',
                  value === cat
                    ? 'bg-primary-fixed text-on-primary-fixed-variant font-semibold'
                    : 'hover:bg-surface-container-low text-on-surface',
                )}
              >
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">
                  label
                </span>
                {cat}
              </div>
            ))}
          </div>

          <div className="border-t border-outline-variant/20 mt-1 pt-1">
            {isCustom ? (
              <div className="flex items-center gap-xs px-sm py-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirm()
                    if (e.key === 'Escape') {
                      setIsCustom(false)
                      setInputValue('')
                    }
                  }}
                  placeholder="New category..."
                  className="flex-1 min-w-0 bg-transparent outline-none text-body-sm text-on-surface placeholder-on-surface-variant/50"
                  onClick={(e) => e.stopPropagation()}
                />
                <div
                  onClick={(e) => handleConfirm(e)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
              </div>
            ) : (
              <div
                onClick={handleCustomClick}
                className="w-full flex items-center gap-sm px-md py-2 rounded-lg text-body-sm text-primary hover:bg-primary/5 whitespace-nowrap cursor-pointer select-none"
              >
                <span className="material-symbols-outlined text-[16px] shrink-0">add</span>
                Custom category
              </div>
            )}
          </div>

          {value && (
            <div
              onClick={handleClear}
              className="w-full flex items-center gap-sm px-md py-2 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container-low border-t border-outline-variant/20 mt-1 pt-1 whitespace-nowrap cursor-pointer select-none"
            >
              <span className="material-symbols-outlined text-[16px] shrink-0">close</span>
              Clear
            </div>
          )}
        </div>
      )}
    </div>
  )
}
