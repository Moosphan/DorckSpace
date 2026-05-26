import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

export interface RSSFeedRow {
  id: number
  title: string
  url: string
  site_url: string | null
  category: string | null
  icon_url: string | null
  last_fetched_at: string | null
  is_active: number
  created_at: string
}

export interface RSSArticleRow {
  id: number
  feed_id: number
  title: string
  url: string
  author: string | null
  summary: string | null
  thumbnail_url: string | null
  published_at: string | null
  is_read: number
  is_starred: number
  created_at: string
}

export class RSSFeedRepository extends BaseRepository<RSSFeedRow> {
  constructor(db: Database.Database) {
    super(db, 'rss_feeds')
  }

  findActive(): RSSFeedRow[] {
    return this.all<RSSFeedRow>(
      'SELECT * FROM rss_feeds WHERE is_active = 1 ORDER BY title',
    )
  }

  findAllFeeds(): RSSFeedRow[] {
    return this.all<RSSFeedRow>(
      'SELECT * FROM rss_feeds ORDER BY is_active DESC, title',
    )
  }

  create(data: { title: string; url: string; site_url?: string; category?: string }): number {
    const result = this.run(
      `INSERT INTO rss_feeds (title, url, site_url, category) VALUES (?, ?, ?, ?)`,
      data.title,
      data.url,
      data.site_url ?? null,
      data.category ?? null,
    )
    return Number(result.lastInsertRowid)
  }

  updateLastFetched(id: number): void {
    this.run('UPDATE rss_feeds SET last_fetched_at = CURRENT_TIMESTAMP WHERE id = ?', id)
  }

  toggleActive(id: number): boolean {
    const result = this.run(
      'UPDATE rss_feeds SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?',
      id,
    )
    return result.changes > 0
  }

  updateFeed(id: number, data: { title?: string; url?: string; category?: string }): boolean {
    const fields: string[] = []
    const values: unknown[] = []
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url) }
    if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category) }
    if (fields.length === 0) return false
    values.push(id)
    const result = this.run(`UPDATE rss_feeds SET ${fields.join(', ')} WHERE id = ?`, ...values)
    return result.changes > 0
  }

  findByIdWithStats(id: number): (RSSFeedRow & { article_count: number; unread_count: number }) | undefined {
    return this.get<RSSFeedRow & { article_count: number; unread_count: number }>(
      `SELECT f.*,
        (SELECT COUNT(*) FROM rss_articles WHERE feed_id = f.id) as article_count,
        (SELECT COUNT(*) FROM rss_articles WHERE feed_id = f.id AND is_read = 0) as unread_count
       FROM rss_feeds f WHERE f.id = ?`,
      id,
    )
  }
}

export class RSSArticleRepository extends BaseRepository<RSSArticleRow> {
  constructor(db: Database.Database) {
    super(db, 'rss_articles')
  }

  findRecent(limit = 20): (RSSArticleRow & { feed_title: string; feed_category: string | null })[] {
    return this.all<RSSArticleRow & { feed_title: string; feed_category: string | null }>(
      `SELECT a.*, f.title as feed_title, f.category as feed_category
       FROM rss_articles a
       JOIN rss_feeds f ON a.feed_id = f.id
       WHERE f.is_active = 1
       ORDER BY a.published_at DESC, a.created_at DESC
       LIMIT ?`,
      limit,
    )
  }

  findWithFilter(filters: {
    dateRange?: 'today' | 'week' | 'month' | 'all'
    category?: string
    starred?: boolean
    limit?: number
    offset?: number
  }): (RSSArticleRow & { feed_title: string; feed_category: string | null })[] {
    const conditions: string[] = ['f.is_active = 1']
    const params: unknown[] = []

    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date()
      let startDate: Date
      if (filters.dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (filters.dateRange === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
      // SQLite datetime() requires 'YYYY-MM-DD HH:MM:SS' format
      const pad = (n: number) => String(n).padStart(2, '0')
      const dateStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())} ${pad(startDate.getHours())}:${pad(startDate.getMinutes())}:${pad(startDate.getSeconds())}`
      conditions.push(
        "datetime(replace(replace(a.published_at, 'T', ' '), 'Z', '')) >= ?"
      )
      params.push(dateStr)
    }

    if (filters.category) {
      conditions.push("f.category = ?")
      params.push(filters.category)
    }

    if (filters.starred) {
      conditions.push("a.is_starred = 1")
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = filters.limit ?? 100
    const offset = filters.offset ?? 0

    return this.all<RSSArticleRow & { feed_title: string; feed_category: string | null }>(
      `SELECT a.*, f.title as feed_title, f.category as feed_category
       FROM rss_articles a
       JOIN rss_feeds f ON a.feed_id = f.id
       ${where}
       ORDER BY a.published_at DESC, a.created_at DESC
       LIMIT ? OFFSET ?`,
      ...params,
      limit,
      offset,
    )
  }

  getCategories(): string[] {
    const rows = this.all<{ category: string }>(
      `SELECT DISTINCT f.category FROM rss_feeds f
       WHERE f.is_active = 1 AND f.category IS NOT NULL AND f.category != ''
       ORDER BY f.category`,
    )
    return rows.map((r) => r.category)
  }

  findByFeed(feedId: number, limit = 20): RSSArticleRow[] {
    return this.all<RSSArticleRow>(
      'SELECT * FROM rss_articles WHERE feed_id = ? ORDER BY published_at DESC LIMIT ?',
      feedId,
      limit,
    )
  }

  findUnread(limit = 20): (RSSArticleRow & { feed_title: string })[] {
    return this.all<RSSArticleRow & { feed_title: string }>(
      `SELECT a.*, f.title as feed_title
       FROM rss_articles a
       JOIN rss_feeds f ON a.feed_id = f.id
       WHERE a.is_read = 0
       ORDER BY a.published_at DESC
       LIMIT ?`,
      limit,
    )
  }

  markAsRead(id: number): void {
    this.run('UPDATE rss_articles SET is_read = 1 WHERE id = ?', id)
  }

  toggleStar(id: number): void {
    this.run('UPDATE rss_articles SET is_starred = CASE WHEN is_starred = 1 THEN 0 ELSE 1 END WHERE id = ?', id)
  }

  create(data: {
    feed_id: number
    title: string
    url: string
    author?: string
    summary?: string
    thumbnail_url?: string
    published_at?: string
  }): number {
    const result = this.run(
      `INSERT OR IGNORE INTO rss_articles (feed_id, title, url, author, summary, thumbnail_url, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      data.feed_id,
      data.title,
      data.url,
      data.author ?? null,
      data.summary ?? null,
      data.thumbnail_url ?? null,
      data.published_at ?? null,
    )
    return Number(result.lastInsertRowid)
  }
}
