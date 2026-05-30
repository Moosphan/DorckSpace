import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

export interface HighlightRow {
  id: number
  article_id: number
  selected_text: string
  note: string | null
  color: string
  created_at: string
}

export interface HighlightWithArticle extends HighlightRow {
  article_title: string
  article_url: string
  feed_title: string
}

export class HighlightRepository extends BaseRepository<HighlightRow> {
  constructor(db: Database.Database) {
    super(db, 'article_highlights')
  }

  findByArticleId(articleId: number): HighlightRow[] {
    return this.all<HighlightRow>(
      'SELECT * FROM article_highlights WHERE article_id = ? ORDER BY created_at ASC',
      articleId,
    )
  }

  findAllWithArticle(limit = 100): HighlightWithArticle[] {
    return this.all<HighlightWithArticle>(
      `SELECT h.*, a.title as article_title, a.url as article_url, rf.title as feed_title
       FROM article_highlights h
       JOIN rss_articles a ON h.article_id = a.id
       JOIN rss_feeds rf ON a.feed_id = rf.id
       ORDER BY h.created_at DESC
       LIMIT ?`,
      limit,
    )
  }

  create(data: { article_id: number; selected_text: string; note?: string; color?: string }): number {
    const result = this.run(
      `INSERT INTO article_highlights (article_id, selected_text, note, color) VALUES (?, ?, ?, ?)`,
      data.article_id,
      data.selected_text,
      data.note ?? null,
      data.color ?? '#FEC300',
    )
    return Number(result.lastInsertRowid)
  }

  updateNote(id: number, note: string): boolean {
    const result = this.run('UPDATE article_highlights SET note = ? WHERE id = ?', note, id)
    return result.changes > 0
  }

  exportMarkdown(articleId: number): string {
    const highlights = this.findByArticleId(articleId)
    if (highlights.length === 0) return ''

    const lines = highlights.map((h) => {
      let line = `> ${h.selected_text}`
      if (h.note) line += `\n\n*Note: ${h.note}*`
      return line
    })

    return lines.join('\n\n---\n\n')
  }
}
