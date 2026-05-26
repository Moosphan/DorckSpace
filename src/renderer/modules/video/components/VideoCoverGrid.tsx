import { useState } from 'react'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { cn } from '@/lib/utils'

interface VideoAsset {
  id: number
  title: string
  file_path: string
  file_format: string | null
  file_size: number | null
  status: string
  duration_seconds: number | null
}

const statusStyles: Record<string, string> = {
  ready: 'bg-surface-container-high text-on-surface-variant',
  draft: 'bg-secondary-container text-on-secondary-container',
  processing: 'bg-primary/10 text-primary',
}

export function VideoCoverGrid() {
  const { data: covers, loading, refetch } = useIpcData<VideoAsset[]>('video:getByType', 'cover')
  const { mutate: deleteAsset } = useIpcMutation<boolean>('video:delete')
  const { mutate: importFile } = useIpcMutation('video:importFile')
  const [filter, setFilter] = useState<string | null>(null)

  const filtered = filter ? covers?.filter((c) => c.status === filter) : covers

  const handleImport = async () => {
    await importFile('cover')
    refetch()
  }

  const handleDelete = async (id: number) => {
    await deleteAsset(id)
    refetch()
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-md">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">movie</span>
          <h3 className="font-headline-sm text-headline-sm">Video Covers</h3>
          <button
            onClick={handleImport}
            className="w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center ml-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
        <div className="flex items-center gap-sm">
          {/* Filter chips */}
          {['ready', 'draft', 'processing'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? null : s)}
              className={cn(
                'px-2 py-[2px] rounded-full text-[10px] font-bold uppercase transition-colors',
                filter === s ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden animate-pulse">
              <div className="aspect-video bg-surface-container-highest" />
              <div className="p-md"><div className="h-4 bg-surface-container-highest rounded w-3/4" /></div>
            </div>
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-xl text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-sm block">movie</span>
          <p className="text-body-md text-on-surface-variant">{filter ? `No ${filter} videos` : 'No video covers yet'}</p>
          <button
            onClick={handleImport}
            className="mt-md px-5 py-2 bg-primary text-on-primary rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all"
          >
            Import Videos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {filtered.map((cover) => (
            <div
              key={cover.id}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 overflow-hidden group cursor-pointer hover:-translate-y-1 hover:shadow-ambient-hover transition-all duration-300"
            >
              <div className="aspect-video relative overflow-hidden bg-surface-container-highest">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                {cover.duration_seconds && (
                  <div className="absolute bottom-base right-base bg-black/60 backdrop-blur-sm text-white px-sm py-1 rounded-full text-[10px] font-bold">
                    {Math.floor(cover.duration_seconds / 60)}:{String(Math.floor(cover.duration_seconds % 60)).padStart(2, '0')}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                    <span className="material-symbols-outlined">play_arrow</span>
                  </div>
                </div>
                {/* Delete button */}
                <button
                  onClick={() => handleDelete(cover.id)}
                  className="absolute top-sm right-sm w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-error transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
              <div className="p-md">
                <h4 className="font-label-md text-label-md text-on-surface mb-xs truncate">{cover.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant text-body-sm">{cover.file_format || 'Unknown'}</span>
                  <span className={cn('text-[10px] font-bold px-sm py-1 rounded-full uppercase', statusStyles[cover.status] || statusStyles.ready)}>
                    {cover.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
