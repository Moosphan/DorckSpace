import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

interface ResearchMaterialRow {
  id: number
  source_type: string | null
  source_id: number | null
  title: string
  excerpt: string | null
  url: string | null
  author: string | null
  tags: string
  project_id: number | null
  project_name: string | null
  article_id: number | null
  article_title: string | null
}

export interface ResearchMaterial {
  id: number
  sourceType: string | null
  sourceId: number | null
  title: string
  excerpt: string | null
  url: string | null
  author: string | null
  tags: string[]
  projectId: number | null
  projectName: string | null
  articleId: number | null
  articleTitle: string | null
}

export interface CreateManualResearchMaterialInput {
  title: string
  excerpt?: string
  url?: string
  author?: string
  tags?: string[]
  projectId?: number
  articleId?: number
}

export class ResearchMaterialRepository extends BaseRepository<Record<string, unknown>> {
  constructor(db: Database.Database) {
    super(db, 'research_materials')
  }

  createFromRssArticle(rssArticleId: number, links: { projectId?: number; articleId?: number } = {}): number {
    const article = this.get<{
      id: number
      title: string
      summary: string | null
      url: string
      author: string | null
    }>(
      'SELECT id, title, summary, url, author FROM rss_articles WHERE id = ?',
      rssArticleId,
    )
    if (!article) throw new Error('RSS article not found')

    this.run(
      `INSERT INTO research_materials
        (source_type, source_id, title, excerpt, url, author, project_id, article_id)
       VALUES ('rss_article', ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL
       DO UPDATE SET
         project_id = excluded.project_id,
         article_id = excluded.article_id,
         updated_at = CURRENT_TIMESTAMP`,
      article.id,
      article.title,
      article.summary,
      article.url,
      article.author,
      links.projectId ?? null,
      links.articleId ?? null,
    )

    const material = this.get<{ id: number }>(
      "SELECT id FROM research_materials WHERE source_type = 'rss_article' AND source_id = ?",
      article.id,
    )
    if (!material) throw new Error('Unable to create research material')
    return material.id
  }

  createFromHighlight(highlightId: number, links: { projectId?: number; articleId?: number } = {}): number {
    const highlight = this.get<{
      id: number
      selected_text: string
      note: string | null
      url: string
      author: string | null
    }>(
      `SELECT h.id, h.selected_text, h.note, article.url, article.author
       FROM article_highlights h
       JOIN rss_articles article ON article.id = h.article_id
       WHERE h.id = ?`,
      highlightId,
    )
    if (!highlight) throw new Error('Highlight not found')

    this.run(
      `INSERT INTO research_materials
        (source_type, source_id, title, excerpt, url, author, project_id, article_id)
       VALUES ('highlight', ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL
       DO UPDATE SET
         project_id = excluded.project_id,
         article_id = excluded.article_id,
         updated_at = CURRENT_TIMESTAMP`,
      highlight.id,
      highlight.selected_text,
      highlight.note,
      highlight.url,
      highlight.author,
      links.projectId ?? null,
      links.articleId ?? null,
    )

    const material = this.get<{ id: number }>(
      "SELECT id FROM research_materials WHERE source_type = 'highlight' AND source_id = ?",
      highlight.id,
    )
    if (!material) throw new Error('Unable to create research material')
    return material.id
  }

  createManual(input: CreateManualResearchMaterialInput): number {
    const result = this.run(
      `INSERT INTO research_materials
        (title, excerpt, url, author, tags, project_id, article_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.title.trim(),
      input.excerpt?.trim() || null,
      input.url?.trim() || null,
      input.author?.trim() || null,
      JSON.stringify(input.tags ?? []),
      input.projectId ?? null,
      input.articleId ?? null,
    )
    return Number(result.lastInsertRowid)
  }

  updateLinks(id: number, links: { projectId?: number | null; articleId?: number | null }): boolean {
    const result = this.run(
      `UPDATE research_materials
       SET project_id = ?, article_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      links.projectId ?? null,
      links.articleId ?? null,
      id,
    )
    return result.changes > 0
  }

  findAll(): ResearchMaterial[] {
    return this.all<ResearchMaterialRow>(
      `SELECT material.id, material.source_type, material.source_id, material.title, material.excerpt,
        material.url, material.author, material.tags, material.project_id, project.name AS project_name,
        material.article_id, article.title AS article_title
       FROM research_materials material
       LEFT JOIN projects project ON project.id = material.project_id
       LEFT JOIN articles article ON article.id = material.article_id
       ORDER BY material.updated_at DESC, material.id DESC`,
    ).map((row) => ({
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      title: row.title,
      excerpt: row.excerpt,
      url: row.url,
      author: row.author,
      tags: parseTags(row.tags),
      projectId: row.project_id,
      projectName: row.project_name,
      articleId: row.article_id,
      articleTitle: row.article_title,
    }))
  }
}

function parseTags(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : []
  } catch {
    return []
  }
}
