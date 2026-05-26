import { useState } from 'react'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { cn } from '@/lib/utils'

interface AudioAsset {
  id: number
  title: string
  file_path: string
  file_format: string | null
  duration_seconds: number | null
  file_size: number | null
}

export function AudioAssetList() {
  const { data: audios, loading, refetch } = useIpcData<AudioAsset[]>('video:getByType', 'audio')
  const { mutate: deleteAsset } = useIpcMutation<boolean>('video:delete')
  const { mutate: importFile } = useIpcMutation('video:importFile')
  const [filter, setFilter] = useState(false)

  const formatDuration = (sec: number | null) => {
    if (!sec) return '--:--'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleImport = async () => {
    await importFile('audio')
    refetch()
  }

  const handleDelete = async (id: number) => {
    await deleteAsset(id)
    refetch()
  }

  const filtered = filter ? audios?.filter((a) => a.title.toLowerCase().includes('voiceover') || a.title.toLowerCase().includes('narration')) : audios

  return (
    <div className="lg:col-span-2">
      <div className="flex items-center justify-between mb-md h-10">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">audiotrack</span>
          <h3 className="font-headline-sm text-headline-sm">Audio Assets</h3>
          <button
            onClick={handleImport}
            className="w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center ml-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
        <button
          onClick={() => setFilter(!filter)}
          className={cn(
            'p-2 rounded-full transition-colors',
            filter ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container',
          )}
        >
          <span className="material-symbols-outlined">filter_list</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-base">
          {[1, 2].map((i) => (
            <div key={i} className="p-md bg-surface-container-lowest rounded-xl border border-outline-variant/30 animate-pulse h-16" />
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <div className="p-xl bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-sm block">audiotrack</span>
          <p className="text-body-md text-on-surface-variant">{filter ? 'No matching audio files' : 'No audio assets yet'}</p>
          <button
            onClick={handleImport}
            className="mt-md px-5 py-2 bg-primary text-on-primary rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all"
          >
            Import Audio
          </button>
        </div>
      ) : (
        <div className="space-y-base">
          {filtered.map((audio) => (
            <div
              key={audio.id}
              className="flex items-center gap-md p-md bg-surface-container-lowest rounded-xl border border-outline-variant/50 hover:bg-primary-fixed/10 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                <span className="material-symbols-outlined fill">graphic_eq</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-label-md text-label-md text-on-surface truncate">{audio.title}</h4>
                <p className="text-body-sm text-on-surface-variant">
                  {audio.file_format?.toUpperCase() || 'Audio'} • {formatDuration(audio.duration_seconds)}
                  {audio.file_size && ` • ${formatSize(audio.file_size)}`}
                </p>
              </div>
              {/* Waveform placeholder */}
              <div className="hidden md:block w-32 h-8">
                <svg className="w-full h-full text-primary/40" viewBox="0 0 100 20">
                  <path d="M0 10 Q 5 0, 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <button
                onClick={() => handleDelete(audio.id)}
                className="p-2 text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
