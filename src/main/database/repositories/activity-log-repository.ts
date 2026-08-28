import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

export interface ActivityRecordInput {
  date: string
  activityType: string
  durationMinutes?: number
  intensity?: number
  metadata?: Record<string, unknown>
}

export interface ActivityDay {
  date: string
  activityCount: number
  durationMinutes: number
  intensity: number
  activityTypes: string[]
}

interface ActivityDayRow {
  date: string
  activity_count: number
  duration_minutes: number
  intensity: number
  activity_types: string | null
}

export class ActivityLogRepository extends BaseRepository<Record<string, unknown>> {
  constructor(db: Database.Database) {
    super(db, 'activity_log')
  }

  record(input: ActivityRecordInput): void {
    const intensity = Math.max(1, Math.min(4, Math.floor(input.intensity ?? 1)))
    const durationMinutes = Math.max(0, Math.floor(input.durationMinutes ?? 0))

    this.run(
      'INSERT INTO activity_log (date, activity_type, duration_minutes, intensity, metadata) ' +
      'VALUES (?, ?, ?, ?, ?) ' +
      'ON CONFLICT(date, activity_type) DO UPDATE SET ' +
      'duration_minutes = activity_log.duration_minutes + excluded.duration_minutes, ' +
      'intensity = MIN(4, activity_log.intensity + excluded.intensity), ' +
      'metadata = excluded.metadata',
      input.date,
      input.activityType,
      durationMinutes,
      intensity,
      JSON.stringify(input.metadata ?? {}),
    )
  }

  getRecentDays(limit = 28, endDate = formatLocalDate(new Date())): ActivityDay[] {
    const safeLimit = Math.max(1, Math.min(366, Math.floor(limit)))
    const rows = this.all<ActivityDayRow>(
      'SELECT date, ' +
      'SUM(intensity) AS activity_count, ' +
      'SUM(duration_minutes) AS duration_minutes, ' +
      'CASE WHEN SUM(intensity) <= 0 THEN 0 ' +
      'WHEN SUM(intensity) = 1 THEN 1 ' +
      'WHEN SUM(intensity) = 2 THEN 2 ELSE 3 END AS intensity, ' +
      'GROUP_CONCAT(activity_type) AS activity_types ' +
      'FROM activity_log WHERE date <= ? ' +
      'GROUP BY date ORDER BY date DESC LIMIT ?',
      endDate,
      safeLimit,
    )

    return rows.map((row) => ({
      date: row.date,
      activityCount: row.activity_count,
      durationMinutes: row.duration_minutes,
      intensity: row.intensity,
      activityTypes: row.activity_types ? row.activity_types.split(',') : [],
    }))
  }
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}
