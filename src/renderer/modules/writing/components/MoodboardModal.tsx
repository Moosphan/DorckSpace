import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface MoodboardItem {
  id: number
  title: string
  url: string
  description: string | null
  category: string
  thumbnail_url: string | null
  rating: number
  tags: string
  is_pinned: number
  created_at: string
}

const CATEGORIES = [
  { value: 'open-source', label: 'Open Source', icon: 'code' },
  { value: 'design', label: 'Design', icon: 'palette' },
  { value: 'ai-tools', label: 'AI Tools', icon: 'smart_toy' },
  { value: 'learning', label: 'Learning', icon: 'school' },
  { value: 'productivity', label: 'Productivity', icon: 'productivity' },
  { value: 'general', label: 'General', icon: 'bookmark' },
]

interface MoodboardModalProps {
  open: boolean
  onClose: () => void
}

export function MoodboardModal({ open, onClose }: MoodboardModalProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<MoodboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('general')
  const [formRating, setFormRating] = useState(0)

  useEffect(() => {
    if (open) {
      fetchItems()
    }
  }, [open])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.invoke('moodboard:getAll')
      if (res.success) {
        setItems(res.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch moodboard items:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formTitle.trim() || !formUrl.trim()) {
      toast({ title: 'Title and URL are required', variant: 'error' })
      return
    }

    try {
      if (editingId) {
        await window.electronAPI.invoke('moodboard:update', editingId, {
          title: formTitle.trim(),
          url: formUrl.trim(),
          description: formDescription.trim() || null,
          category: formCategory,
          rating: formRating,
        })
        toast({ title: 'Resource updated', variant: 'success' })
      } else {
        await window.electronAPI.invoke('moodboard:create', {
          title: formTitle.trim(),
          url: formUrl.trim(),
          description: formDescription.trim() || null,
          category: formCategory,
          rating: formRating,
        })
        toast({ title: 'Resource added', variant: 'success' })
      }
      resetForm()
      fetchItems()
    } catch {
      toast({ title: 'Failed to save', variant: 'error' })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await window.electronAPI.invoke('moodboard:delete', id)
      setItems(prev => prev.filter(i => i.id !== id))
      toast({ title: 'Resource deleted', variant: 'success' })
    } catch {
      toast({ title: 'Failed to delete', variant: 'error' })
    }
  }

  const handleTogglePin = async (id: number) => {
    try {
      await window.electronAPI.invoke('moodboard:togglePin', id)
      fetchItems()
    } catch { /* ignore */ }
  }

  const handleUpdateRating = async (id: number, rating: number) => {
    try {
      await window.electronAPI.invoke('moodboard:updateRating', id, rating)
      setItems(prev => prev.map(i => i.id === id ? { ...i, rating } : i))
    } catch { /* ignore */ }
  }

  const handleEdit = (item: MoodboardItem) => {
    setEditingId(item.id)
    setFormTitle(item.title)
    setFormUrl(item.url)
    setFormDescription(item.description || '')
    setFormCategory(item.category)
    setFormRating(item.rating)
    setShowAddForm(true)
  }

  const resetForm = () => {
    setEditingId(null)
    setFormTitle('')
    setFormUrl('')
    setFormDescription('')
    setFormCategory('general')
    setFormRating(0)
    setShowAddForm(false)
  }

  const handleOpenUrl = (url: string) => {
    window.electronAPI.openExternal(url)
  }

  const getCategoryInfo = (cat: string) => {
    return CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1]
  }

  const filteredItems = activeCategory
    ? items.filter(i => i.category === activeCategory)
    : items

  const pinnedItems = filteredItems.filter(i => i.is_pinned)
  const unpinnedItems = filteredItems.filter(i => !i.is_pinned)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-container-lowest w-full max-w-3xl rounded-2xl shadow-2xl border border-outline-variant/30 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-md py-3 border-b border-outline-variant/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">palette</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Moodboards</h3>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {items.length}
            </span>
          </div>
          <div className="flex items-center gap-xs">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-xs px-3 py-1.5 bg-primary text-on-primary rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all text-body-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-md py-sm border-b border-outline-variant/30 flex items-center gap-xs overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              'px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap',
              !activeCategory ? 'bg-primary text-on-primary' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container'
            )}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(activeCategory === cat.value ? null : cat.value)}
              className={cn(
                'px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap',
                activeCategory === cat.value ? 'bg-primary text-on-primary' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-md">
          {loading ? (
            <div className="grid grid-cols-2 gap-sm">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-surface-container animate-pulse rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-xl">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-sm block">palette</span>
              <p className="text-body-md text-on-surface-variant">No resources saved yet</p>
              <p className="text-body-sm text-on-surface-variant mt-xs">
                Add your favorite open source projects, design resources, and tools.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-md px-md py-1.5 bg-primary text-on-primary rounded-full font-label-md hover:brightness-110 transition-all text-body-sm"
              >
                Add First Resource
              </button>
            </div>
          ) : (
            <div className="space-y-md">
              {/* Pinned items */}
              {pinnedItems.length > 0 && (
                <div>
                  <p className="text-[11px] text-on-surface-variant font-bold mb-xs flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[14px]">push_pin</span>
                    PINNED
                  </p>
                  <div className="grid grid-cols-2 gap-sm">
                    {pinnedItems.map(item => (
                      <ResourceCard
                        key={item.id}
                        item={item}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onTogglePin={handleTogglePin}
                        onRating={handleUpdateRating}
                        onOpen={handleOpenUrl}
                        getCategoryInfo={getCategoryInfo}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Unpinned items */}
              {unpinnedItems.length > 0 && (
                <div>
                  {pinnedItems.length > 0 && (
                    <p className="text-[11px] text-on-surface-variant font-bold mb-xs">ALL RESOURCES</p>
                  )}
                  <div className="grid grid-cols-2 gap-sm">
                    {unpinnedItems.map(item => (
                      <ResourceCard
                        key={item.id}
                        item={item}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onTogglePin={handleTogglePin}
                        onRating={handleUpdateRating}
                        onOpen={handleOpenUrl}
                        getCategoryInfo={getCategoryInfo}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add/Edit Form Modal - dialog overlay */}
        {showAddForm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-2xl" onClick={resetForm}>
            <div
              className="bg-surface-container-lowest w-full max-w-3xl max-h-[80vh] rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-md py-3 border-b border-outline-variant/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary">add_circle</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">{editingId ? 'Edit Resource' : 'Add Resource'}</h3>
                </div>
                <button onClick={resetForm} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-md space-y-md">
                <div>
                  <label className="font-label-sm text-on-surface-variant">Title *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. React, Figma, Tailwind CSS"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none mt-xs"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface-variant">URL *</label>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none mt-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface-variant">Description</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief description of this resource"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none mt-xs"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface-variant">Category</label>
                  <div className="flex flex-wrap gap-xs mt-xs">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => setFormCategory(cat.value)}
                        className={cn(
                          'px-3 py-1 rounded-full text-[11px] font-bold transition-all',
                          formCategory === cat.value ? 'bg-primary text-on-primary' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container'
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-label-sm text-on-surface-variant">Rating</label>
                  <div className="flex items-center gap-xs mt-xs">
                    {[1, 2, 3, 4, 5].map(star => (
                      <div key={star} className="relative w-6 h-6">
                        {/* Left half click = star - 0.5 */}
                        <div
                          className="absolute left-0 top-0 w-1/2 h-full cursor-pointer z-10"
                          onClick={() => setFormRating(formRating === star - 0.5 ? 0 : star - 0.5)}
                        />
                        {/* Right half click = star */}
                        <div
                          className="absolute right-0 top-0 w-1/2 h-full cursor-pointer z-10"
                          onClick={() => setFormRating(formRating === star ? 0 : star)}
                        />
                        {/* Background empty star */}
                        <span className="material-symbols-outlined text-[24px] text-on-surface-variant/30 absolute inset-0 pointer-events-none" style={{ fontVariationSettings: "'FILL' 0" }}>star</span>
                        {/* Filled star with clip */}
                        <div
                          className="absolute inset-0 overflow-hidden pointer-events-none"
                          style={{ width: star <= formRating ? '100%' : star - 0.5 <= formRating ? '50%' : '0%' }}
                        >
                          <span className="material-symbols-outlined text-[24px] text-warning absolute inset-0" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        </div>
                      </div>
                    ))}
                    <span className="text-body-sm text-on-surface-variant ml-sm">{formRating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <div className="px-md py-3 bg-surface-container border-t border-outline-variant/30 flex justify-end gap-sm rounded-b-2xl shrink-0">
                <button onClick={resetForm} className="px-md py-1.5 rounded-full font-label-md text-on-surface-variant hover:bg-surface-variant transition-colors text-body-sm">
                  Cancel
                </button>
                <button onClick={handleSave} className="px-md py-1.5 rounded-full bg-primary text-on-primary font-label-md hover:brightness-110 active:scale-95 transition-all text-body-sm">
                  {editingId ? 'Save' : 'Add Resource'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ResourceCard({
  item,
  onEdit,
  onDelete,
  onTogglePin,
  onRating,
  onOpen,
  getCategoryInfo,
}: {
  item: MoodboardItem
  onEdit: (item: MoodboardItem) => void
  onDelete: (id: number) => void
  onTogglePin: (id: number) => void
  onRating: (id: number, rating: number) => void
  onOpen: (url: string) => void
  getCategoryInfo: (cat: string) => { label: string; icon: string }
}) {
  const catInfo = getCategoryInfo(item.category)

  return (
    <div className="group p-sm rounded-lg border border-outline-variant/30 hover:border-outline-variant/60 transition-colors">
      <div className="flex items-start gap-sm">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-[16px]">{catInfo.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-xs">
            <div className="min-w-0">
              <h4
                className="text-[13px] font-bold text-on-surface truncate cursor-pointer hover:text-primary"
                onClick={() => onOpen(item.url)}
                title={item.title}
              >
                {item.title}
              </h4>
              <p className="text-[10px] text-on-surface-variant truncate">{item.url}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onTogglePin(item.id)} className="w-5 h-5 rounded flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors" title={item.is_pinned ? 'Unpin' : 'Pin'}>
                <span className={cn('material-symbols-outlined text-[13px]', item.is_pinned && 'text-primary')}>push_pin</span>
              </button>
              <button onClick={() => onEdit(item)} className="w-5 h-5 rounded flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors" title="Edit">
                <span className="material-symbols-outlined text-[13px]">edit</span>
              </button>
              <button onClick={() => onDelete(item.id)} className="w-5 h-5 rounded flex items-center justify-center text-on-surface-variant hover:text-error transition-colors" title="Delete">
                <span className="material-symbols-outlined text-[13px]">delete</span>
              </button>
            </div>
          </div>
          {item.description && (
            <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-1">{item.description}</p>
          )}
          <div className="flex items-center gap-xs mt-xs">
            <span className="px-1.5 py-0.5 rounded bg-surface-container text-[9px] font-bold text-on-surface-variant">
              {catInfo.label}
            </span>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map(star => (
                <div key={star} className="relative w-3 h-3">
                  <div
                    className="absolute left-0 top-0 w-1/2 h-full cursor-pointer z-10"
                    onClick={() => onRating(item.id, star - 0.5)}
                  />
                  <div
                    className="absolute right-0 top-0 w-1/2 h-full cursor-pointer z-10"
                    onClick={() => onRating(item.id, star)}
                  />
                  <span className="material-symbols-outlined text-[12px] text-on-surface-variant/30 absolute inset-0 pointer-events-none" style={{ fontVariationSettings: "'FILL' 0" }}>star</span>
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ width: star <= item.rating ? '100%' : star - 0.5 <= item.rating ? '50%' : '0%' }}
                  >
                    <span className="material-symbols-outlined text-[12px] text-warning absolute inset-0" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  </div>
                </div>
              ))}
            </div>
            {item.rating > 0 && (
              <span className="text-[10px] text-on-surface-variant">{item.rating.toFixed(1)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
