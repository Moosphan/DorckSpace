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

interface ProjectTaskStats {
  completed: number | null
  total: number | null
}

type ProjectRowWithStats = ProjectRow & ProjectTaskStats

/** Completed (excluding cancelled) as a percentage of all non-cancelled tasks. */
function computeProgress({ completed, total }: ProjectTaskStats): number {
  const denominator = total ?? 0
  if (denominator <= 0) return 0
  return Math.round((100 * (completed ?? 0)) / denominator)
}

/** Replace the static `progress` column with a value derived from its tasks. */
function withProgress<T extends ProjectRowWithStats>(row: T): ProjectRow {
  const { completed, total, ...rest } = row
  return { ...rest, progress: computeProgress({ completed, total }) }
}

const PROJECT_TASK_STATS_JOIN = `
LEFT JOIN (
  SELECT project_id,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
    SUM(CASE WHEN status != 'cancelled' THEN 1 ELSE 0 END) AS total
  FROM tasks
  GROUP BY project_id
) stats ON stats.project_id = p.id`

export class ProjectRepository extends BaseRepository<ProjectRow> {
  constructor(db: Database.Database) {
    super(db, 'projects')
  }

  findFocus(): ProjectRow | undefined {
    const row = this.get<ProjectRowWithStats>(
      `SELECT p.*, stats.completed, stats.total
       FROM projects p
       ${PROJECT_TASK_STATS_JOIN}
       WHERE p.is_focus = 1 AND p.status = 'active'
       LIMIT 1`,
    )
    return row ? withProgress(row) : undefined
  }

  findActive(): ProjectRow[] {
    return this.all<ProjectRowWithStats>(
      `SELECT p.*, stats.completed, stats.total
       FROM projects p
       ${PROJECT_TASK_STATS_JOIN}
       WHERE p.status = 'active'
       ORDER BY p.is_focus DESC, p.updated_at DESC`,
    ).map(withProgress)
  }

  create(data: {
    name: string
    description?: string
    icon?: string
    color?: string
    is_focus?: boolean
    start_date?: string
    target_date?: string
  }): number {
    return this.db.transaction(() => {
      const hasFocus = this.get<{ id: number }>(
        "SELECT id FROM projects WHERE status = 'active' AND is_focus = 1 LIMIT 1",
      )
      const isFocus = data.is_focus ?? !hasFocus
      if (isFocus) this.run("UPDATE projects SET is_focus = 0 WHERE status = 'active'")

      const result = this.run(
        `INSERT INTO projects (name, description, icon, color, is_focus, start_date, target_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        data.name,
        data.description ?? null,
        data.icon ?? null,
        data.color ?? null,
        isFocus ? 1 : 0,
        data.start_date ?? null,
        data.target_date ?? null,
      )
      return Number(result.lastInsertRowid)
    })()
  }

  setFocus(id: number): void {
    const project = this.get<{ id: number }>(
      "SELECT id FROM projects WHERE id = ? AND status = 'active'",
      id,
    )
    if (!project) throw new Error('Only an active project can be set as the main focus.')

    this.db.transaction(() => {
      this.run('UPDATE projects SET is_focus = 0')
      this.run("UPDATE projects SET is_focus = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", id)
    })()
  }

  deleteById(id: number): boolean {
    return this.db.transaction(() => {
      const wasFocus = Boolean(this.get<{ id: number }>(
        'SELECT id FROM projects WHERE id = ? AND is_focus = 1',
        id,
      ))
      const result = this.run('DELETE FROM projects WHERE id = ?', id)
      if (result.changes === 0) return false

      if (wasFocus) {
        const nextProject = this.get<{ id: number }>(
          "SELECT id FROM projects WHERE status = 'active' ORDER BY updated_at DESC, id DESC LIMIT 1",
        )
        if (nextProject) {
          this.run('UPDATE projects SET is_focus = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', nextProject.id)
        }
      }

      return true
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
