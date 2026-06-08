import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

export interface MilestoneRow {
  id: number
  project_id: number
  title: string
  description: string | null
  due_date: string | null
  status: string
  reached_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface MilestoneWithStats extends MilestoneRow {
  total_tasks: number
  completed_tasks: number
  progress: number
}

export class MilestoneRepository extends BaseRepository<MilestoneRow> {
  constructor(db: Database.Database) {
    super(db, 'project_milestones')
  }

  findByProject(projectId: number): MilestoneWithStats[] {
    const milestones = this.all<MilestoneRow>(
      'SELECT * FROM project_milestones WHERE project_id = ? ORDER BY sort_order, due_date, created_at',
      projectId,
    )

    return milestones.map(m => {
      const stats = this.db.prepare(
        'SELECT COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed FROM tasks WHERE milestone_id = ?',
      ).get('completed', m.id) as { total: number; completed: number }

      return {
        ...m,
        total_tasks: stats.total,
        completed_tasks: stats.completed,
        progress: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }
    })
  }

  create(data: {
    project_id: number
    title: string
    description?: string
    due_date?: string
    sort_order?: number
  }): number {
    const result = this.run(
      `INSERT INTO project_milestones (project_id, title, description, due_date, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      data.project_id,
      data.title,
      data.description ?? null,
      data.due_date ?? null,
      data.sort_order ?? 0,
    )
    return Number(result.lastInsertRowid)
  }

  update(id: number, data: Partial<Omit<MilestoneRow, 'id' | 'created_at' | 'updated_at'>>): boolean {
    const fields: string[] = []
    const values: unknown[] = []
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    }
    if (fields.length === 0) return false
    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    const result = this.run(`UPDATE project_milestones SET ${fields.join(', ')} WHERE id = ?`, ...values)
    return result.changes > 0
  }

  markReached(id: number): boolean {
    const result = this.run(
      'UPDATE project_milestones SET status = ?, reached_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      'reached',
      id,
    )
    return result.changes > 0
  }
}
