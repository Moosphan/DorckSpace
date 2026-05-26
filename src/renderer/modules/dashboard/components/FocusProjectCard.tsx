import { useIpcData } from '@/hooks/useIpc'
import { Progress } from '@/components/ui/progress'

interface Project {
  id: number
  name: string
  description: string | null
  icon: string | null
  progress: number
  status: string
}

export function FocusProjectCard() {
  const { data: project, loading } = useIpcData<Project | null>('projects:getFocus')

  if (loading) {
    return (
      <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 shadow-ambient animate-pulse">
        <div className="h-4 bg-surface-container-highest rounded w-24 mb-sm" />
        <div className="h-6 bg-surface-container-highest rounded w-48 mb-xs" />
        <div className="h-4 bg-surface-container-highest rounded w-64" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 shadow-ambient">
        <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm mb-sm">
          <span className="material-symbols-outlined text-[14px]">star</span>
          Main Focus
        </span>
        <h3 className="font-headline-lg text-headline-lg text-on-surface">
          No focus project set
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Set a project as your main focus to see it here.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 shadow-ambient hover:-translate-y-1 transition-transform duration-300">
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
