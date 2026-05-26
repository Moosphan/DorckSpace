import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

export interface ArticleRow {
  id: number
  title: string
  content: string | null
  file_path: string | null
  status: 'draft' | 'editing' | 'review' | 'published' | 'archived'
  category: string | null
  tags: string
  word_count: number
  cover_image_path: string | null
  summary: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export class ArticleRepository extends BaseRepository<ArticleRow> {
  constructor(db: Database.Database) {
    super(db, 'articles')
  }

  findByStatus(status: ArticleRow['status'], limit = 50): ArticleRow[] {
    return this.all<ArticleRow>(
      'SELECT * FROM articles WHERE status = ? ORDER BY updated_at DESC LIMIT ?',
      status,
      limit,
    )
  }

  getCategories(): string[] {
    // Get categories from both articles table and user-created categories
    const fromArticles = this.all<{ category: string }>(
      "SELECT DISTINCT category FROM articles WHERE category IS NOT NULL AND category != '' ORDER BY category",
    )
    const articleCats = fromArticles.map((r) => r.category)

    // Also get user-created categories from settings
    const settingRow = this.get<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'user_categories'",
    )
    let userCats: string[] = []
    if (settingRow) {
      try { userCats = JSON.parse(settingRow.value) } catch { /* ignore */ }
    }

    return Array.from(new Set([...articleCats, ...userCats])).sort()
  }

  addUserCategory(category: string): void {
    const settingRow = this.get<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'user_categories'",
    )
    let cats: string[] = []
    if (settingRow) {
      try { cats = JSON.parse(settingRow.value) } catch { /* ignore */ }
    }
    if (!cats.includes(category)) {
      cats.push(category)
      this.run(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('user_categories', ?, CURRENT_TIMESTAMP)",
        JSON.stringify(cats),
      )
    }
  }

  findRecent(limit = 10): ArticleRow[] {
    return this.all<ArticleRow>(
      'SELECT * FROM articles ORDER BY updated_at DESC LIMIT ?',
      limit,
    )
  }

  create(data: {
    title?: string
    content?: string
    category?: string
    tags?: string[]
  }): number {
    const result = this.run(
      `INSERT INTO articles (title, content, category, tags, word_count)
       VALUES (?, ?, ?, ?, ?)`,
      data.title ?? 'Untitled',
      data.content ?? '',
      data.category ?? null,
      JSON.stringify(data.tags ?? []),
      (data.content ?? '').length,
    )
    return Number(result.lastInsertRowid)
  }

  update(id: number, data: Partial<Omit<ArticleRow, 'id' | 'created_at'>>): boolean {
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

    const result = this.run(`UPDATE articles SET ${fields.join(', ')} WHERE id = ?`, ...values)
    return result.changes > 0
  }

  updateContent(id: number, content: string): boolean {
    const wordCount = content.replace(/<[^>]*>/g, '').length
    const result = this.run(
      'UPDATE articles SET content = ?, word_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      content,
      wordCount,
      id,
    )
    return result.changes > 0
  }

  updateStatus(id: number, status: ArticleRow['status']): boolean {
    const extra = status === 'published' ? ', published_at = CURRENT_TIMESTAMP' : ''
    const result = this.run(
      `UPDATE articles SET status = ?, updated_at = CURRENT_TIMESTAMP${extra} WHERE id = ?`,
      status,
      id,
    )
    return result.changes > 0
  }
}
