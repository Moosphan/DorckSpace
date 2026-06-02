import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

export interface CalendarEventRow {
  id: number
  title: string
  description: string | null
  start_time: string
  end_time: string | null
  all_day: number
  color: string | null
  source: string
  created_at: string
}

export class CalendarRepository extends BaseRepository<CalendarEventRow> {
  constructor(db: Database.Database) {
    super(db, 'calendar_events')
  }

  findByMonth(year: number, month: number): CalendarEventRow[] {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`
    return this.all<CalendarEventRow>(
      'SELECT * FROM calendar_events WHERE start_time >= ? AND start_time <= ? ORDER BY start_time',
      startDate,
      endDate,
    )
  }

  findByDate(date: string): CalendarEventRow[] {
    return this.all<CalendarEventRow>(
      'SELECT * FROM calendar_events WHERE date(start_time) = ? ORDER BY start_time',
      date,
    )
  }

  findUpcoming(limit: number = 5): CalendarEventRow[] {
    return this.all<CalendarEventRow>(
      'SELECT * FROM calendar_events WHERE start_time >= datetime(\'now\') ORDER BY start_time LIMIT ?',
      limit,
    )
  }

  create(data: {
    title: string
    description?: string
    start_time: string
    end_time?: string
    all_day?: boolean
    color?: string
    source?: string
  }): number {
    const result = this.run(
      `INSERT INTO calendar_events (title, description, start_time, end_time, all_day, color, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      data.title,
      data.description ?? null,
      data.start_time,
      data.end_time ?? null,
      data.all_day ? 1 : 0,
      data.color ?? null,
      data.source ?? 'local',
    )
    return Number(result.lastInsertRowid)
  }

  update(id: number, data: Partial<Omit<CalendarEventRow, 'id' | 'created_at'>>): boolean {
    const fields: string[] = []
    const values: unknown[] = []
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    }
    if (fields.length === 0) return false
    values.push(id)
    const result = this.run(`UPDATE calendar_events SET ${fields.join(', ')} WHERE id = ?`, ...values)
    return result.changes > 0
  }
}
