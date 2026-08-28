import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { getDatabase } from '../database/connection'

export type SearchResultType =
  | 'project'
  | 'task'
  | 'article'
  | 'rss_article'
  | 'feed'
  | 'note'
  | 'draft'
  | 'idea'
  | 'highlight'
  | 'video'
  | 'portfolio'
  | 'moodboard'
  | 'trending'
  | 'research_material'

export interface SearchResult {
  id: number
  type: SearchResultType
  title: string
  subtitle: string
  icon: string
  route: string
  updatedAt: string | null
  url?: string | null
}

interface SearchRow {
  id: number
  title: string | null
  subtitle: string | null
  updated_at: string | null
  route: string
  icon: string
  type: SearchResultType
  url?: string | null
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

function toResult(row: SearchRow): SearchResult {
  return {
    id: row.id,
    type: row.type,
    title: row.title?.trim() || '未命名内容',
    subtitle: row.subtitle?.trim() || row.type,
    icon: row.icon,
    route: row.route,
    updatedAt: row.updated_at,
    url: row.url,
  }
}

function relevance(result: SearchResult, query: string): number {
  const title = result.title.toLocaleLowerCase()
  const normalizedQuery = query.toLocaleLowerCase()
  if (title === normalizedQuery) return 3
  if (title.startsWith(normalizedQuery)) return 2
  if (title.includes(normalizedQuery)) return 1
  return 0
}

export function searchAll(db: Database.Database, query: string): SearchResult[] {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) return []
  const pattern = `%${escapeLike(normalizedQuery)}%`
  const results: SearchResult[] = []
  const add = (rows: SearchRow[]) => results.push(...rows.map(toResult))

  add(db.prepare(
    `SELECT id, name AS title, description AS subtitle, updated_at,
      '/dashboard?projectId=' || id AS route, 'folder_open' AS icon, 'project' AS type
     FROM projects WHERE name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\'
     ORDER BY updated_at DESC LIMIT 10`,
  ).all(pattern, pattern) as SearchRow[])

  add(db.prepare(
    `SELECT id, title, priority || ' · ' || status AS subtitle, updated_at,
      '/dashboard?taskId=' || id AS route, 'task_alt' AS icon, 'task' AS type
     FROM tasks WHERE title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\'
     ORDER BY updated_at DESC LIMIT 10`,
  ).all(pattern, pattern, pattern) as SearchRow[])

  add(db.prepare(
    `SELECT id, title, status || CASE WHEN category IS NOT NULL THEN ' · ' || category ELSE '' END AS subtitle,
      updated_at, '/writing?articleId=' || id AS route, 'article' AS icon, 'article' AS type
     FROM articles WHERE title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\'
     ORDER BY updated_at DESC LIMIT 10`,
  ).all(pattern, pattern, pattern, pattern) as SearchRow[])

  add(db.prepare(
    `SELECT a.id, a.title, f.title || CASE WHEN f.category IS NOT NULL THEN ' · ' || f.category ELSE '' END AS subtitle,
      COALESCE(a.published_at, a.created_at) AS updated_at, '/insights?articleId=' || a.id AS route,
      'rss_feed' AS icon, 'rss_article' AS type, a.url
     FROM rss_articles a JOIN rss_feeds f ON f.id = a.feed_id
     WHERE f.is_active = 1 AND (a.title LIKE ? ESCAPE '\\' OR a.summary LIKE ? ESCAPE '\\' OR a.content LIKE ? ESCAPE '\\' OR a.author LIKE ? ESCAPE '\\')
     ORDER BY COALESCE(a.published_at, a.created_at) DESC LIMIT 10`,
  ).all(pattern, pattern, pattern, pattern) as SearchRow[])

  add(db.prepare(
    `SELECT id, title, category AS subtitle, created_at AS updated_at, '/insights' AS route,
      'rss_feed' AS icon, 'feed' AS type, url FROM rss_feeds
     WHERE is_active = 1 AND (title LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')
     ORDER BY created_at DESC LIMIT 10`,
  ).all(pattern, pattern, pattern) as SearchRow[])

  add(db.prepare(
    `SELECT id, title, category AS subtitle, updated_at, '/writing' AS route,
      'sticky_note_2' AS icon, 'note' AS type FROM notes
     WHERE title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\'
     ORDER BY updated_at DESC LIMIT 10`,
  ).all(pattern, pattern, pattern) as SearchRow[])

  add(db.prepare(
    `SELECT id, title, type AS subtitle, updated_at, '/writing' AS route,
      'snippet_folder' AS icon, 'draft' AS type FROM drafts
     WHERE title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\'
     ORDER BY updated_at DESC LIMIT 10`,
  ).all(pattern, pattern, pattern) as SearchRow[])

  add(db.prepare(
    `SELECT id, substr(content, 1, 100) AS title, category AS subtitle, updated_at, '/dashboard' AS route,
      'lightbulb' AS icon, 'idea' AS type FROM ideas
     WHERE content LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\'
     ORDER BY is_pinned DESC, updated_at DESC LIMIT 10`,
  ).all(pattern, pattern) as SearchRow[])

  add(db.prepare(
    `SELECT h.id, substr(h.selected_text, 1, 100) AS title, a.title AS subtitle, h.created_at AS updated_at,
      '/writing' AS route, 'format_quote' AS icon, 'highlight' AS type
     FROM article_highlights h JOIN rss_articles a ON a.id = h.article_id
     WHERE h.selected_text LIKE ? ESCAPE '\\' OR h.note LIKE ? ESCAPE '\\' OR a.title LIKE ? ESCAPE '\\'
     ORDER BY h.created_at DESC LIMIT 10`,
  ).all(pattern, pattern, pattern) as SearchRow[])

  add(db.prepare(
    `SELECT id, title, type AS subtitle, updated_at, '/video' AS route,
      'perm_media' AS icon, 'video' AS type FROM video_assets
     WHERE title LIKE ? ESCAPE '\\' OR metadata LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\'
     ORDER BY updated_at DESC LIMIT 10`,
  ).all(pattern, pattern, pattern) as SearchRow[])

  add(db.prepare(
    `SELECT id, title, category AS subtitle, created_at AS updated_at, '/dashboard' AS route,
      'collections' AS icon, 'portfolio' AS type, url FROM portfolio_items
     WHERE title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\'
     ORDER BY created_at DESC LIMIT 10`,
  ).all(pattern, pattern, pattern, pattern) as SearchRow[])

  add(db.prepare(
    `SELECT id, title, category AS subtitle, updated_at, '/writing?moodboardId=' || id AS route,
      'mood' AS icon, 'moodboard' AS type, url FROM moodboard_items
     WHERE title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\'
     ORDER BY is_pinned DESC, updated_at DESC LIMIT 10`,
  ).all(pattern, pattern, pattern, pattern) as SearchRow[])

  add(db.prepare(
    `SELECT id, title, platform || ' · ' || COALESCE(category, '热门内容') AS subtitle, fetched_at AS updated_at,
      '/insights' AS route, 'local_fire_department' AS icon, 'trending' AS type, url FROM social_trending_items
     WHERE title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\'
     ORDER BY heat_score DESC, fetched_at DESC LIMIT 10`,
  ).all(pattern, pattern, pattern, pattern, pattern) as SearchRow[])

  add(db.prepare(
    `SELECT id, title,
      CASE source_type
        WHEN 'rss_article' THEN 'RSS 收藏'
        WHEN 'highlight' THEN '书摘'
        ELSE '手动素材'
      END AS subtitle,
      updated_at, '/writing?researchMaterialId=' || id AS route,
      'auto_stories' AS icon, 'research_material' AS type, url
     FROM research_materials
     WHERE title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\'
     ORDER BY updated_at DESC LIMIT 10`,
  ).all(pattern, pattern, pattern, pattern) as SearchRow[])

  return results
    .sort((left, right) => relevance(right, normalizedQuery) - relevance(left, normalizedQuery)
      || (right.updatedAt ?? '').localeCompare(left.updatedAt ?? ''))
    .slice(0, 40)
}

export function registerSearchIpcHandlers(): void {
  ipcMain.handle('search:all', (_event, query: unknown) => {
    try {
      const normalizedQuery = typeof query === 'string' ? query.trim() : ''
      return { success: true, data: searchAll(getDatabase(), normalizedQuery) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
