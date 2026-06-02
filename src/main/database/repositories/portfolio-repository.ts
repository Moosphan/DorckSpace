import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

export interface PortfolioItemRow {
  id: number
  title: string
  description: string | null
  thumbnail_path: string | null
  url: string | null
  category: string | null
  tags: string
  created_at: string
}

export class PortfolioRepository extends BaseRepository<PortfolioItemRow> {
  constructor(db: Database.Database) {
    super(db, 'portfolio_items')
  }

  findByCategory(category: string): PortfolioItemRow[] {
    return this.all<PortfolioItemRow>(
      'SELECT * FROM portfolio_items WHERE category = ? ORDER BY created_at DESC',
      category,
    )
  }

  getCategories(): string[] {
    const rows = this.all<{ category: string }>(
      'SELECT DISTINCT category FROM portfolio_items WHERE category IS NOT NULL ORDER BY category',
    )
    return rows.map(r => r.category)
  }

  create(data: {
    title: string
    description?: string
    thumbnail_path?: string
    url?: string
    category?: string
    tags?: string
  }): number {
    const result = this.run(
      `INSERT INTO portfolio_items (title, description, thumbnail_path, url, category, tags)
       VALUES (?, ?, ?, ?, ?, ?)`,
      data.title,
      data.description ?? null,
      data.thumbnail_path ?? null,
      data.url ?? null,
      data.category ?? null,
      data.tags ?? '[]',
    )
    return Number(result.lastInsertRowid)
  }

  update(id: number, data: Partial<Omit<PortfolioItemRow, 'id' | 'created_at'>>): boolean {
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
    const result = this.run(`UPDATE portfolio_items SET ${fields.join(', ')} WHERE id = ?`, ...values)
    return result.changes > 0
  }
}
