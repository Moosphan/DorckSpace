import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

export interface ProjectRow {
  id: number
  name: string
  description: string | null
  icon: string | null
  color: string | null
  progress: number
  status: 'active' | 'paused' | 'completed' | 'archived'
  is_focus: number
  start_date: string | null
  target_date: string | null
  created_at: string
  updated_at: string
}

export class ProjectRepository extends BaseRepository<ProjectRow> {
  constructor(db: Database.Database) {
    super(db, 'projects')
  }

  findFocus(): ProjectRow | undefined {
    return this.get<ProjectRow>(
      'SELECT * FROM projects WHERE is_focus = 1 AND status = ? LIMIT 1',
      'active',
    )
  }

  findActive(): ProjectRow[] {
    return this.all<ProjectRow>(
      "SELECT * FROM projects WHERE status = 'active' ORDER BY is_focus DESC, updated_at DESC",
    )
  }

  create(data: {
    name: string
    description?: string
    icon?: string
    color?: string
    is_focus?: boolean
    target_date?: string
  }): number {
    const result = this.run(
      `INSERT INTO projects (name, description, icon, color, is_focus, target_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      data.name,
      data.description ?? null,
      data.icon ?? null,
      data.color ?? null,
      data.is_focus ? 1 : 0,
      data.target_date ?? null,
    )
    return Number(result.lastInsertRowid)
  }

  setFocus(id: number): void {
    this.db.transaction(() => {
      this.run('UPDATE projects SET is_focus = 0')
      this.run('UPDATE projects SET is_focus = 1 WHERE id = ?', id)
    })()
  }

  updateProgress(id: number, progress: number): boolean {
    const result = this.run(
      'UPDATE projects SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      Math.max(0, Math.min(100, progress)),
      id,
    )
    return result.changes > 0
  }

  update(id: number, data: Partial<Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'>>): boolean {
    const fields: string[] = []
    const values: unknown[] = []

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(key === 'is_focus' ? (value ? 1 : 0) : value)
      }
    }

    if (fields.length === 0) return false

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const result = this.run(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
      ...values,
    )
    return result.changes > 0
  }
}
