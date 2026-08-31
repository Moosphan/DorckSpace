import { useEffect } from 'react'
import { useIpcData } from '@/hooks/useIpc'
import { Progress } from '@/components/ui/progress'

interface DashboardTask {
  id: number
  title: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress'
  dueDate: string | null
  projectId: number | null
  projectName: string | null
}

interface TodayOverviewData {
  date: string
  focusProject: {
    id: number
    name: string
    description: string | null
    icon: string | null
    color: string | null
    progress: number
    nextMilestone: {
      id: number
      title: string
      dueDate: string | null
      progress: number
    } | null
    openBlockerCount: number
  } | null
  tasks: DashboardTask[]
  overdueCount: number
  recentArticle: {
    id: number
    title: string
    status: string
    updatedAt: string
  } | null
}

interface TodayOverviewProps {
  refreshKey?: number
  onOpenManager?: () => void
  onOpenAIPlanner?: () => void
  onOpenProject?: (projectId: number) => void
  onOpenArticle?: (articleId: number) => void
}

export function TodayOverview({ refreshKey = 0, onOpenManager, onOpenAIPlanner, onOpenProject, onOpenArticle }: TodayOverviewProps) {
  const { data, loading, error, refetch } = useIpcData<TodayOverviewData>('dashboard:getTodayOverview')

  useEffect(() => {
    if (refreshKey > 0) refetch()
  }, [refreshKey, refetch])

  if (loading) {
    return <div className="h-[168px] rounded-lg bg-surface-container-lowest border border-outline-variant/30 animate-pulse" />
  }

  if (error) {
    return (
      <div className="rounded-lg bg-surface-container-lowest p-md border border-error/30">
        <p className="font-label-md text-error">今日概览加载失败</p>
        <p className="text-body-sm text-on-surface-variant mt-xs">{error}</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <section className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 shadow-ambient">
      <div className="flex items-start justify-between gap-md">
        <div>
          <p className="font-label-sm text-[13px] font-bold tracking-[0.12em] text-primary uppercase">Today at a glance</p>
          <h2 className="font-headline-sm text-on-surface mt-1">{data.date}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-xs">
          {onOpenAIPlanner && (
            <button
              onClick={onOpenAIPlanner}
              className="rounded-full px-sm py-1 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
            >
              Plan tasks
            </button>
          )}
          {onOpenManager && (
            <button
              onClick={onOpenManager}
              className="rounded-full px-sm py-1 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
            >
              Manage projects
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-sm mt-md">
        <div
          role={onOpenProject && data.focusProject ? 'button' : undefined}
          tabIndex={onOpenProject && data.focusProject ? 0 : undefined}
          onClick={() => data.focusProject && onOpenProject?.(data.focusProject.id)}
          onKeyDown={(event) => {
            if (data.focusProject && onOpenProject && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              onOpenProject(data.focusProject.id)
            }
          }}
          className="rounded-lg bg-surface-container-low p-sm transition-colors"
          data-clickable={Boolean(onOpenProject && data.focusProject)}
        >
          {data.focusProject ? (
            <>
              <div className="flex items-center gap-sm">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[17px]">
                    {data.focusProject.icon || 'rocket_launch'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">Main focus</p>
                  <h3 className="font-label-md text-on-surface truncate">{data.focusProject.name}</h3>
                </div>
                <span className="ml-auto text-body-sm font-bold text-primary">{data.focusProject.progress}%</span>
              </div>
              <Progress value={data.focusProject.progress} className="mt-sm" />
              <div className="flex items-center gap-sm mt-sm text-[11px] text-on-surface-variant">
                <span>{data.focusProject.openBlockerCount} high-priority open</span>
                {data.focusProject.nextMilestone && (
                  <span className="truncate">Next: {data.focusProject.nextMilestone.title}</span>
                )}
              </div>
              {onOpenProject && (
                <p className="text-[10px] text-primary/80 mt-sm">Open project details</p>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between gap-sm min-h-[100px]">
              <div>
                <h3 className="font-label-lg text-on-surface">No focus project</h3>
                <p className="text-body-sm text-on-surface-variant mt-xs">Choose one project to anchor today.</p>
              </div>
              {onOpenManager && (
                <button onClick={onOpenManager} className="text-body-sm text-primary hover:underline">
                  Set focus
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-surface-container-low p-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">Next actions</p>
            {data.overdueCount > 0 && (
              <span className="text-[10px] font-bold text-error">{data.overdueCount} overdue</span>
            )}
          </div>
          {data.tasks.length > 0 ? (
            <div className="space-y-1 mt-sm">
              {data.tasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-sm min-w-0">
                  <span className={task.priority === 'high' ? 'w-1.5 h-1.5 rounded-full bg-error shrink-0' : 'w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0'} />
                  <span className="text-body-sm text-on-surface truncate">{task.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-on-surface-variant mt-sm">No open tasks.</p>
          )}
          {data.recentArticle && (
            <button
              onClick={() => onOpenArticle?.(data.recentArticle!.id)}
              className="w-full text-left border-t border-outline-variant/30 mt-sm pt-sm text-[11px] text-on-surface-variant/80 truncate hover:text-primary transition-colors"
              title="Open recent article"
            >
              Latest: {data.recentArticle.title}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
