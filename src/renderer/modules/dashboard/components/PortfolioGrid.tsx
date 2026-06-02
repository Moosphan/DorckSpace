import { useState } from 'react'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface PortfolioItem {
  id: number
  title: string
  description: string | null
  thumbnail_path: string | null
  url: string | null
  category: string | null
  tags: string
  created_at: string
}

const CATEGORY_COLORS: Record<string, string> = {
  web: 'bg-blue-500/10 text-blue-500',
  mobile: 'bg-green-500/10 text-green-500',
  design: 'bg-purple-500/10 text-purple-500',
  ai: 'bg-orange-500/10 text-orange-500',
}

export function PortfolioGrid() {
  const { toast } = useToast()
  const { data: items, loading, refetch } = useIpcData<PortfolioItem[]>('portfolio:getAll')
  const { mutate: deleteItem } = useIpcMutation<boolean>('portfolio:delete')

  const [showAddForm, setShowAddForm] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formCategory, setFormCategory] = useState('')

  const handleAdd = async () => {
    if (!formTitle.trim()) {
      toast({ title: 'Title is required', variant: 'error' })
      return
    }

    try {
      await window.electronAPI.invoke('portfolio:create', {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        url: formUrl.trim() || null,
        category: formCategory.trim() || null,
      })
      toast({ title: 'Portfolio item added', variant: 'success' })
      resetForm()
      refetch()
    } catch {
      toast({ title: 'Failed to add item', variant: 'error' })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteItem(id)
      toast({ title: 'Item deleted', variant: 'success' })
      refetch()
    } catch {
      toast({ title: 'Failed to delete', variant: 'error' })
    }
  }

  const handleOpenUrl = (url: string) => {
    window.electronAPI.openExternal(url)
  }

  const resetForm = () => {
    setFormTitle('')
    setFormDescription('')
    setFormUrl('')
    setFormCategory('')
    setShowAddForm(false)
  }

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-surface-container text-on-surface-variant'
    return CATEGORY_COLORS[category.toLowerCase()] || 'bg-surface-container text-on-surface-variant'
  }

  if (loading) {
    return (
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-md">
        <div className="grid grid-cols-2 gap-sm">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-surface-container animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-md">
        <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary text-[20px]">work</span>
          Portfolio
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
          title="Add item"
        >
          <span className="material-symbols-outlined text-[18px]">{showAddForm ? 'close' : 'add'}</span>
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-md p-sm rounded-lg bg-surface-container-low border border-outline-variant/30 space-y-sm">
          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Project title *"
            className="w-full bg-surface-container-lowest border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none"
          />
          <input
            type="text"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Description"
            className="w-full bg-surface-container-lowest border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none"
          />
          <input
            type="url"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-surface-container-lowest border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none font-mono"
          />
          <div className="flex gap-xs">
            {['Web', 'Mobile', 'Design', 'AI'].map(cat => (
              <button
                key={cat}
                onClick={() => setFormCategory(formCategory === cat ? '' : cat)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold transition-all',
                  formCategory === cat
                    ? 'bg-primary text-on-primary'
                    : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-xs">
            <button
              onClick={resetForm}
              className="px-sm py-1 rounded-full text-[11px] text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-sm py-1 rounded-full text-[11px] bg-primary text-on-primary hover:brightness-110 transition-all"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Items Grid */}
      {!items || items.length === 0 ? (
        <div className="text-center py-lg">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant/30 mb-sm block">work</span>
          <p className="text-body-sm text-on-surface-variant">No portfolio items yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-sm text-primary text-body-sm hover:underline"
          >
            Add your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-sm">
          {items.slice(0, 4).map(item => (
            <div
              key={item.id}
              className="group relative rounded-lg border border-outline-variant/30 hover:border-outline-variant/60 transition-colors overflow-hidden"
            >
              {/* Thumbnail or gradient placeholder */}
              {item.thumbnail_path ? (
                <img
                  src={`file://${item.thumbnail_path}`}
                  alt={item.title}
                  className="w-full h-20 object-cover"
                />
              ) : (
                <div className="w-full h-20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary/30 text-[28px]">work</span>
                </div>
              )}

              {/* Content */}
              <div className="p-xs">
                <h4 className="text-[12px] font-bold text-on-surface truncate">{item.title}</h4>
                {item.category && (
                  <span className={cn('inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold', getCategoryColor(item.category))}>
                    {item.category}
                  </span>
                )}
              </div>

              {/* Hover actions */}
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.url && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenUrl(item.url!) }}
                    className="w-6 h-6 rounded-full flex items-center justify-center bg-black/50 text-white hover:bg-black/70 transition-colors"
                    title="Open link"
                  >
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-black/50 text-white hover:bg-error/80 transition-colors"
                  title="Delete"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View All link */}
      {items && items.length > 4 && (
        <button className="mt-md w-full text-center text-primary text-body-sm hover:underline">
          View all {items.length} items
        </button>
      )}
    </div>
  )
}
