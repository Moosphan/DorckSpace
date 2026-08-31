import { useEffect, useState } from 'react'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { useToast } from '@/components/ui/toast'

interface Task {
  id: number
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  estimated_hours: number | null
  actual_hours: number | null
  project_name?: string | null
}

interface FocusSession {
  id: number
  taskId: number | null
  startedAt: string
  endedAt: string | null
  durationMinutes: number
  plannedDurationMinutes: number | null
}

interface FocusSessionCardProps {
  onStopped: () => void
}

function parseTimestamp(value: string): Date {
  return new Date(value.replace(' ', 'T'))
}

function getElapsedSeconds(startedAt: string, now: number): number {
  return Math.max(0, Math.floor((now - parseTimestamp(startedAt).getTime()) / 1000))
}

function formatElapsed(startedAt: string, now: number, plannedDurationMinutes: number | null = null): string {
  const elapsedSeconds = plannedDurationMinutes
    ? Math.min(getElapsedSeconds(startedAt, now), plannedDurationMinutes * 60)
    : getElapsedSeconds(startedAt, now)
  const hours = Math.floor(elapsedSeconds / 3600)
  const minutes = Math.floor((elapsedSeconds % 3600) / 60)
  const seconds = elapsedSeconds % 60
  return `${hours > 0 ? `${String(hours).padStart(2, '0')}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatHours(value: number | null): string {
  if (value === null || value === 0) return '0h logged'
  return `${value % 1 === 0 ? value : value.toFixed(1)}h logged`
}

export function FocusSessionCard({ onStopped }: FocusSessionCardProps) {
  const { toast } = useToast()
  const { data: tasks } = useIpcData<Task[]>('tasks:getPending', 50)
  const { data: activeSession, refetch: refetchActive } = useIpcData<FocusSession | null>(
    'focus-sessions:getActive',
  )
  const { data: activeTask, refetch: refetchTask } = useIpcData<Task | null>(
    activeSession?.taskId ? 'tasks:getById' : '',
    activeSession?.taskId ?? 0,
  )
  const { mutate: startSession, loading: starting } = useIpcMutation<number>('focus-sessions:start')
  const { mutate: stopSession, loading: stopping } =
    useIpcMutation<FocusSession>('focus-sessions:stop')
  const { mutate: updateTask } = useIpcMutation<boolean>('tasks:update')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [estimate, setEstimate] = useState('')
  const [now, setNow] = useState(Date.now())
  const [autoStopping, setAutoStopping] = useState(false)

  useEffect(() => {
    if (!activeSession) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [activeSession])

  const selectedTask = tasks?.find((task) => task.id === Number(selectedTaskId)) ?? null

  const handleStart = async () => {
    if (!selectedTask) return
    const normalizedEstimate = estimate.trim() ? Number(estimate) : null
    if (
      normalizedEstimate !== null &&
      (!Number.isFinite(normalizedEstimate) || normalizedEstimate <= 0)
    ) {
      toast({ title: 'Estimate must be greater than zero', variant: 'error' })
      return
    }
    if (normalizedEstimate !== null && normalizedEstimate !== selectedTask.estimated_hours) {
      await updateTask(selectedTask.id, { estimated_hours: normalizedEstimate })
    }
    const plannedDurationMinutes = normalizedEstimate !== null
      ? Math.round(normalizedEstimate * 60)
      : selectedTask.estimated_hours
        ? Math.round(selectedTask.estimated_hours * 60)
        : 25
    const sessionId = await startSession({ taskId: selectedTask.id, plannedDurationMinutes })
    if (!sessionId) {
      toast({ title: 'Could not start focus session', variant: 'error' })
      return
    }
    setNow(Date.now())
    await refetchActive()
    toast({ title: 'Focus session started', variant: 'success' })
  }

  const handleStop = async () => {
    if (!activeSession) return
    const completed = await stopSession(activeSession.id)
    if (!completed) {
      toast({ title: 'Could not stop focus session', variant: 'error' })
      return
    }
    await Promise.all([refetchActive(), refetchTask()])
    onStopped()
    toast({
      title:
        completed.durationMinutes > 0
          ? `${completed.durationMinutes} minutes logged`
          : 'Short session stopped without logging time',
      variant: 'success',
    })
  }

  useEffect(() => {
    if (!activeSession?.plannedDurationMinutes || autoStopping || stopping) return
    if (getElapsedSeconds(activeSession.startedAt, now) < activeSession.plannedDurationMinutes * 60) return
    setAutoStopping(true)
    void stopSession(activeSession.id).then(async (completed) => {
      if (!completed) {
        toast({ title: 'Could not stop focus session', variant: 'error' })
        return
      }
      await Promise.all([refetchActive(), refetchTask()])
      onStopped()
      toast({ title: `${completed.durationMinutes} minutes logged`, variant: 'success' })
    }).finally(() => setAutoStopping(false))
  }, [activeSession, autoStopping, now, onStopped, refetchActive, refetchTask, stopSession, stopping, toast])

  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-ambient">
      <div className="flex items-center justify-between border-b border-outline-variant/25 px-md py-sm">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">timer</span>
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Focus Block</h2>
            <p className="text-[10px] text-on-surface-variant">One task, one visible commitment</p>
          </div>
        </div>
        <span
          className={`rounded-lg px-2 py-1 text-[10px] font-bold ${activeSession ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'}`}
        >
          {activeSession ? 'In focus' : 'Ready'}
        </span>
      </div>

      <div className="p-md">
        {activeSession && activeTask ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              Current task
            </p>
            <p className="mt-1 truncate font-label-lg text-on-surface">{activeTask.title}</p>
            <div className="mt-md flex items-end justify-between">
              <div>
                <p className="font-headline-xl text-headline-xl tabular-nums text-primary">
                  {formatElapsed(activeSession.startedAt, now, activeSession.plannedDurationMinutes)}
                </p>
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  {activeTask.estimated_hours ? `${activeTask.estimated_hours}h estimated · ` : ''}
                  {formatHours(activeTask.actual_hours)}
                </p>
              </div>
              <button
                onClick={handleStop}
                disabled={stopping}
                className="h-9 rounded-lg bg-primary px-3 text-label-sm font-bold text-on-primary disabled:opacity-50"
              >
                {stopping || autoStopping ? 'Stopping...' : 'Stop'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-sm">
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              Task
              <select
                value={selectedTaskId}
                onChange={(event) => {
                  const task = tasks?.find((item) => item.id === Number(event.target.value))
                  setSelectedTaskId(event.target.value)
                  setEstimate(task?.estimated_hours ? String(task.estimated_hours) : '')
                }}
                className="mt-1.5 block h-9 w-full rounded-lg border border-outline-variant/35 bg-surface-container-low px-2 text-body-sm text-on-surface outline-none focus:border-primary"
              >
                <option value="">Choose a pending task</option>
                {tasks
                  ?.filter((task) => task.status === 'pending' || task.status === 'in_progress')
                  .map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              Estimate hours{' '}
              <input
                type="number"
                min="0.1"
                step="0.25"
                value={estimate}
                onChange={(event) => setEstimate(event.target.value)}
                placeholder="Optional"
                className="mt-1.5 block h-9 w-full rounded-lg border border-outline-variant/35 bg-surface-container-low px-2 text-body-sm text-on-surface outline-none focus:border-primary"
              />
            </label>
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-on-surface-variant">Start a timed focus block</p>
              <button
                onClick={handleStart}
                disabled={!selectedTask || starting}
                className="h-9 rounded-lg bg-primary px-3 text-label-sm font-bold text-on-primary disabled:opacity-50"
              >
                {starting ? 'Starting...' : 'Start focus'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
