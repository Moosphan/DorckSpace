import { useEffect } from 'react'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { Progress } from '@/components/ui/progress'

interface Project {
  id: number
  name: string
  description: string | null
  icon: string | null
  progress: number
  status: string
}

interface FocusProjectCardProps {
  onOpenManager?: () => void
  onProjectChanged?: () => void
  refreshKey?: number
}

export function FocusProjectCard({ onOpenManager, onProjectChanged, refreshKey = 0 }: FocusProjectCardProps) {
  const { data: project, loading, refetch: refetchFocus } = useIpcData<Project | null>('projects:getFocus')
  const { data: activeProjects, refetch: refetchActive } = useIpcData<Project[]>('projects:getActive')
  const { mutate: setFocus } = useIpcMutation<unknown>('projects:setFocus')

  useEffect(() => {
    if (refreshKey > 0) {
      refetchFocus()
      refetchActive()
    }
  }, [refreshKey, refetchActive, refetchFocus])

  const handleSetFocus = async (projectId: number) => {
    const result = await setFocus(projectId)
    if (result === null) return
    await Promise.all([refetchFocus(), refetchActive()])
    onProjectChanged?.()
  }

  if (loading) {
    return (
      <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 shadow-ambient animate-pulse flex-1">
        <div className="h-4 bg-surface-container-highest rounded w-24 mb-sm" />
        <div className="h-6 bg-surface-container-highest rounded w-48 mb-xs" />
        <div className="h-4 bg-surface-container-highest rounded w-64" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 shadow-ambient flex-1">
        <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm mb-sm">
          <span className="material-symbols-outlined text-[14px]">star</span>
          Main Focus
        </span>
        <h3 className="font-headline-lg text-headline-lg text-on-surface">
          No focus project set
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Choose an active project to make your current work visible here.
        </p>
        {activeProjects && activeProjects.length > 0 && (
          <div className="mt-md space-y-xs">
            {activeProjects.slice(0, 3).map((candidate) => (
              <div key={candidate.id} className="flex items-center gap-sm rounded-xl bg-surface-container-low px-sm py-xs">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[17px]">{candidate.icon || 'rocket_launch'}</span>
                </div>
                <span className="flex-1 min-w-0 text-body-sm font-semibold text-on-surface truncate">{candidate.name}</span>
                <button
                  onClick={() => handleSetFocus(candidate.id)}
                  className="shrink-0 rounded-full px-sm py-1 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
                >
                  Set focus
                </button>
              </div>
            ))}
          </div>
        )}
        {onOpenManager && (
          <button
            onClick={onOpenManager}
            className="mt-md flex items-center gap-xs text-primary text-body-sm hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            {activeProjects && activeProjects.length > 0 ? 'View all projects' : 'Open Project Manager'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 shadow-ambient hover:-translate-y-1 transition-transform duration-300 flex-1 cursor-pointer"
      onClick={onOpenManager}
    >
      <div className="flex items-start justify-between mb-md">
        <div>
          <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm mb-sm">
            <span className="material-symbols-outlined text-[14px]">star</span>
            Main Focus
          </span>
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
            {project.name}
          </h3>
          {project.description && (
            <p className="font-body-md text-body-md text-on-surface-variant">
              {project.description}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined fill">
            {project.icon || 'rocket_launch'}
          </span>
        </div>
      </div>
      <div className="mt-md">
        <div className="flex justify-between items-end mb-xs">
          <span className="font-label-md text-label-md text-on-surface font-semibold">
            Progress
          </span>
          <span className="font-headline-sm text-headline-sm text-primary font-bold">
            {project.progress}%
          </span>
        </div>
        <Progress value={project.progress} />
      </div>
    </div>
  )
}
