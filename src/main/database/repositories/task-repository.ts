import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

export interface TaskRow {
  id: number
  title: string
  description: string | null
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date: string | null
  project_id: number | null
  tags: string
  estimated_hours: number | null
  actual_hours: number | null
  parent_id: number | null
  sort_order: number
  milestone_id: number | null
  created_at: string
  updated_at: string
}

export interface TaskWithProject extends TaskRow {
  project_name: string | null
  project_color: string | null
  project_icon: string | null
}

export class TaskRepository extends BaseRepository<TaskRow> {
  constructor(db: Database.Database) {
    super(db, 'tasks')
  }

  findByStatus(status: TaskRow['status']): TaskRow[] {
    return this.all<TaskRow>(
      'SELECT * FROM tasks WHERE status = ? ORDER BY due_date ASC',
      status,
    )
  }

  findPending(limit = 10): TaskWithProject[] {
    return this.all<TaskWithProject>(
      `SELECT t.*, p.name AS project_name, p.color AS project_color, p.icon AS project_icon
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       ORDER BY t.created_at DESC
       LIMIT ?`,
      limit,
    )
  }

  findByProject(projectId: number): TaskRow[] {
    return this.all<TaskRow>(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order, created_at DESC',
      projectId,
    )
  }

  findByProjectAndStatus(projectId: number, status: TaskRow['status']): TaskRow[] {
    return this.all<TaskRow>(
      'SELECT * FROM tasks WHERE project_id = ? AND status = ? ORDER BY sort_order, created_at DESC',
      projectId,
      status,
    )
  }

  findByMilestone(milestoneId: number): TaskRow[] {
    return this.all<TaskRow>(
      'SELECT * FROM tasks WHERE milestone_id = ? ORDER BY sort_order, created_at DESC',
      milestoneId,
    )
  }

  findByParent(parentId: number): TaskRow[] {
    return this.all<TaskRow>(
      'SELECT * FROM tasks WHERE parent_id = ? ORDER BY sort_order, created_at',
      parentId,
    )
  }

  updateSortOrder(id: number, sortOrder: number): boolean {
    const result = this.run(
      'UPDATE tasks SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      sortOrder,
      id,
    )
    return result.changes > 0
  }

  create(data: {
    title: string
    description?: string
    priority?: TaskRow['priority']
    due_date?: string
    project_id?: number
    tags?: string[]
  }): number {
    const result = this.run(
      `INSERT INTO tasks (title, description, priority, due_date, project_id, tags)
       VALUES (?, ?, ?, ?, ?, ?)`,
      data.title,
      data.description ?? null,
      data.priority ?? 'medium',
      data.due_date ?? null,
      data.project_id ?? null,
      JSON.stringify(data.tags ?? []),
    )
    return Number(result.lastInsertRowid)
  }

  updateStatus(id: number, status: TaskRow['status']): boolean {
    const result = this.run(
      'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      status,
      id,
    )
    return result.changes > 0
  }

  update(id: number, data: Partial<Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>>): boolean {
    const fields: string[] = []
    const values: unknown[] = []

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(key === 'tags' && Array.isArray(value) ? JSON.stringify(value) : value)
      }
    }

    if (fields.length === 0) return false

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const result = this.run(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
      ...values,
    )
    return result.changes > 0
  }
}
