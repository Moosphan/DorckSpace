import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

export interface IdeaRow {
  id: number
  content: string
  category: string
  is_pinned: number
  is_private: number
  created_at: string
  updated_at: string
}

export class IdeaRepository extends BaseRepository<IdeaRow> {
  constructor(db: Database.Database) {
    super(db, 'ideas')
  }

  findRecent(limit = 50): IdeaRow[] {
    return this.all<IdeaRow>(
      'SELECT * FROM ideas ORDER BY is_pinned DESC, updated_at DESC LIMIT ?',
      limit,
    )
  }

  findPinned(): IdeaRow[] {
    return this.all<IdeaRow>(
      'SELECT * FROM ideas WHERE is_pinned = 1 ORDER BY updated_at DESC',
    )
  }

  findByCategory(category: string, limit = 50): IdeaRow[] {
    return this.all<IdeaRow>(
      'SELECT * FROM ideas WHERE category = ? ORDER BY is_pinned DESC, updated_at DESC LIMIT ?',
      category,
      limit,
    )
  }

  create(data: { content: string; category?: string; is_private?: number }): number {
    const result = this.run(
      `INSERT INTO ideas (content, category, is_private) VALUES (?, ?, ?)`,
      data.content,
      data.category ?? 'writing',
      data.is_private ?? 0,
    )
    return Number(result.lastInsertRowid)
  }

  update(id: number, data: Partial<Omit<IdeaRow, 'id' | 'created_at'>>): boolean {
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
    const result = this.run(`UPDATE ideas SET ${fields.join(', ')} WHERE id = ?`, ...values)
    return result.changes > 0
  }

  togglePin(id: number): boolean {
    const idea = this.findById(id)
    if (!idea) return false
    const result = this.run(
      'UPDATE ideas SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      idea.is_pinned ? 0 : 1,
      id,
    )
    return result.changes > 0
  }
}
