import type Database from 'better-sqlite3'

interface FocusSessionRow {
  id: number
  task_id: number | null
  started_at: string
  ended_at: string | null
  duration_minutes: number
  planned_duration_minutes: number | null
  task_estimated_hours?: number | null
}

export interface FocusSession {
  id: number
  taskId: number | null
  startedAt: string
  endedAt: string | null
  durationMinutes: number
  plannedDurationMinutes: number | null
}

export class FocusSessionRepository {
  constructor(private readonly db: Database.Database) {}

  start(taskId: number, startedAt = formatTimestamp(new Date()), plannedDurationMinutes: number | null = null): number {
    const task = this.db
      .prepare("SELECT id FROM tasks WHERE id = ? AND status NOT IN ('completed', 'cancelled')")
      .get(taskId)
    if (!task) throw new Error('Focus task must exist and be active')
    if (this.getActive()) throw new Error('A focus session is already active')
    const plannedMinutes = normalizePlannedDuration(plannedDurationMinutes)
    const result = this.db
      .prepare('INSERT INTO focus_sessions (task_id, started_at, planned_duration_minutes) VALUES (?, ?, ?)')
      .run(taskId, startedAt, plannedMinutes)
    return Number(result.lastInsertRowid)
  }

  stop(id: number, endedAt = formatTimestamp(new Date())): FocusSession {
    const active = this.db
      .prepare(
        `SELECT f.*, t.estimated_hours AS task_estimated_hours
         FROM focus_sessions f
         LEFT JOIN tasks t ON t.id = f.task_id
         WHERE f.id = ? AND f.ended_at IS NULL`,
      )
      .get(id) as FocusSessionRow | undefined
    if (!active) throw new Error('Active focus session not found')
    const uncappedDurationMinutes = calculateMinutes(active.started_at, endedAt)
    const plannedDurationMinutes = getEffectivePlannedDuration(active)
    const durationMinutes = plannedDurationMinutes && uncappedDurationMinutes >= plannedDurationMinutes
      ? plannedDurationMinutes
      : uncappedDurationMinutes
    const effectiveEndedAt = plannedDurationMinutes && uncappedDurationMinutes >= plannedDurationMinutes
      ? addMinutes(active.started_at, plannedDurationMinutes)
      : endedAt

    this.db.transaction(() => {
      const result = this.db
        .prepare(
          'UPDATE focus_sessions SET ended_at = ?, duration_minutes = ? WHERE id = ? AND ended_at IS NULL',
        )
        .run(effectiveEndedAt, durationMinutes, id)
      if (result.changes === 0) throw new Error('Active focus session not found')
      if (active.task_id !== null && durationMinutes > 0) {
        this.db
          .prepare(
            `UPDATE tasks
           SET actual_hours = COALESCE(actual_hours, 0) + ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          )
          .run(durationMinutes / 60, active.task_id)
      }
    })()

    return {
      id: active.id,
      taskId: active.task_id,
      startedAt: active.started_at,
      endedAt: effectiveEndedAt,
      durationMinutes,
      plannedDurationMinutes,
    }
  }

  getActive(): FocusSession | null {
    const row = this.db
      .prepare(
        `SELECT f.*, t.estimated_hours AS task_estimated_hours
         FROM focus_sessions f
         LEFT JOIN tasks t ON t.id = f.task_id
         WHERE f.ended_at IS NULL
         ORDER BY f.started_at DESC
         LIMIT 1`,
      )
      .get() as FocusSessionRow | undefined
    return row ? toFocusSession(row) : null
  }

  findByTaskId(taskId: number, limit = 20): FocusSession[] {
    return (
      this.db
        .prepare(
          `SELECT f.*, t.estimated_hours AS task_estimated_hours
           FROM focus_sessions f
           LEFT JOIN tasks t ON t.id = f.task_id
           WHERE f.task_id = ?
           ORDER BY f.started_at DESC
           LIMIT ?`,
        )
        .all(taskId, limit) as FocusSessionRow[]
    ).map(toFocusSession)
  }
}

function calculateMinutes(startedAt: string, endedAt: string): number {
  const start = parseTimestamp(startedAt)
  const end = parseTimestamp(endedAt)
  if (end < start) throw new Error('Focus session cannot end before it starts')
  return Math.floor((end.getTime() - start.getTime()) / 60_000)
}

function addMinutes(timestamp: string, minutes: number): string {
  const date = parseTimestamp(timestamp)
  date.setMinutes(date.getMinutes() + minutes)
  return formatTimestamp(date)
}

function normalizePlannedDuration(value: number | null): number | null {
  if (value === null) return null
  if (!Number.isInteger(value) || value <= 0) throw new Error('Focus planned duration must be a positive integer')
  return value
}

function getEffectivePlannedDuration(row: FocusSessionRow): number | null {
  return row.planned_duration_minutes ?? estimateHoursToMinutes(row.task_estimated_hours)
}

function estimateHoursToMinutes(value: number | null | undefined): number | null {
  if (value === null || value === undefined || value <= 0) return null
  return Math.max(1, Math.round(value * 60))
}

function parseTimestamp(value: string): Date {
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) throw new Error('Focus session timestamp is invalid')
  return date
}

function toFocusSession(row: FocusSessionRow): FocusSession {
  return {
    id: row.id,
    taskId: row.task_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMinutes: row.duration_minutes,
    plannedDurationMinutes: getEffectivePlannedDuration(row),
  }
}

export function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
