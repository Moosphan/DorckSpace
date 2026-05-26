import { useIpcData, useIpcMutation } from '@/hooks/useIpc'

interface Presentation {
  id: number
  title: string
  file_path: string
  metadata: string
}

export function PresentationList() {
  const { data: presentations, loading, refetch } = useIpcData<Presentation[]>('video:getByType', 'presentation')
  const { mutate: deleteAsset } = useIpcMutation<boolean>('video:delete')
  const { mutate: importFile } = useIpcMutation('video:importFile')

  const getSlideCount = (metadata: string) => {
    try {
      const m = JSON.parse(metadata)
      return m.slides ? `${m.slides} Slides` : ''
    } catch {
      return ''
    }
  }

  const handleImport = async () => {
    await importFile('presentation')
    refetch()
  }

  const handleDelete = async (id: number) => {
    await deleteAsset(id)
    refetch()
  }

  return (
    <div className="lg:col-span-1 flex flex-col">
      <div className="flex items-center justify-between mb-md h-10">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">present_to_all</span>
          <h3 className="font-headline-sm text-headline-sm">PPT Files</h3>
        </div>
      </div>

      {loading ? (
        <div className="space-y-base">
          {[1, 2].map((i) => (
            <div key={i} className="p-md bg-surface-container-lowest rounded-xl border border-outline-variant/30 animate-pulse h-16" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-base flex-1">
          {presentations?.map((ppt) => (
            <div
              key={ppt.id}
              className="flex items-center gap-md p-md bg-surface-container-lowest rounded-xl border border-outline-variant/50 hover:bg-primary-fixed/10 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                <span className="material-symbols-outlined fill">html</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className="font-label-md text-label-md text-on-surface truncate">{ppt.title}</h4>
                <p className="text-body-sm text-on-surface-variant">{getSlideCount(ppt.metadata)}</p>
              </div>
              <button
                onClick={() => handleDelete(ppt.id)}
                className="p-2 text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))}

          {/* Import button - centered in remaining space */}
          <div
            onClick={handleImport}
            className="flex-1 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary/20 rounded-xl hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer group min-h-[120px]"
          >
            <div className="flex items-center gap-sm text-primary">
              <span className="material-symbols-outlined">add_circle</span>
              <span className="font-label-md">Import HTML</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
