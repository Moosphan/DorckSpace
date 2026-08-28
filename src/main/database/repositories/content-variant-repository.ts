import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

interface ContentVariantRow {
  id: number
  article_id: number
  platform: string
  title: string
  content: string
}

interface PublishReceiptRow {
  id: number
  article_id: number
  variant_id: number | null
  platform: string
  status: 'prepared' | 'published' | 'failed'
  destination_url: string | null
  note: string | null
  prepared_at: string
  published_at: string | null
}

export interface ContentVariant {
  id: number
  articleId: number
  platform: string
  title: string
  content: string
}

export interface PublishReceipt {
  id: number
  articleId: number
  variantId: number | null
  platform: string
  status: 'prepared' | 'published' | 'failed'
  destinationUrl: string | null
  note: string | null
  preparedAt: string
  publishedAt: string | null
}

export class ContentVariantRepository extends BaseRepository<Record<string, unknown>> {
  constructor(db: Database.Database) {
    super(db, 'article_content_variants')
  }

  upsertVariant(input: { articleId: number; platform: string; title: string; content: string }): number {
    assertArticleExists(this.db, input.articleId)
    const platform = normalizePlatform(input.platform)
    const title = input.title.trim()
    const content = input.content.trim()
    if (!title) throw new Error('Variant title is required')
    if (!content) throw new Error('Variant content is required')

    this.run(
      `INSERT INTO article_content_variants (article_id, platform, title, content)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(article_id, platform) DO UPDATE SET
         title = excluded.title,
         content = excluded.content,
         updated_at = CURRENT_TIMESTAMP`,
      input.articleId,
      platform,
      title,
      content,
    )
    const variant = this.get<{ id: number }>(
      'SELECT id FROM article_content_variants WHERE article_id = ? AND platform = ?',
      input.articleId,
      platform,
    )
    if (!variant) throw new Error('Unable to save content variant')
    return variant.id
  }

  findByArticleId(articleId: number): ContentVariant[] {
    return this.all<ContentVariantRow>(
      'SELECT id, article_id, platform, title, content FROM article_content_variants WHERE article_id = ? ORDER BY updated_at DESC, id DESC',
      articleId,
    ).map(toVariant)
  }

  createPreparedReceipt(input: { articleId: number; platform: string; variantId?: number }): number {
    assertArticleExists(this.db, input.articleId)
    const platform = normalizePlatform(input.platform)
    if (input.variantId !== undefined) assertVariantBelongsToArticle(this.db, input.variantId, input.articleId)
    const result = this.run(
      `INSERT INTO article_publish_receipts (article_id, variant_id, platform, status)
       VALUES (?, ?, ?, 'prepared')`,
      input.articleId,
      input.variantId ?? null,
      platform,
    )
    return Number(result.lastInsertRowid)
  }

  findReceiptById(id: number): PublishReceipt | undefined {
    const row = this.get<PublishReceiptRow>('SELECT * FROM article_publish_receipts WHERE id = ?', id)
    return row ? toReceipt(row) : undefined
  }

  findReceiptsByArticleId(articleId: number, limit = 30): PublishReceipt[] {
    return this.all<PublishReceiptRow>(
      'SELECT * FROM article_publish_receipts WHERE article_id = ? ORDER BY prepared_at DESC, id DESC LIMIT ?',
      articleId,
      limit,
    ).map(toReceipt)
  }

  markReceiptPublished(id: number, destinationUrl: string): PublishReceipt | undefined {
    const normalizedUrl = normalizeUrl(destinationUrl)
    const result = this.run(
      `UPDATE article_publish_receipts
       SET status = 'published', destination_url = ?, published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      normalizedUrl,
      id,
    )
    return result.changes > 0 ? this.findReceiptById(id) : undefined
  }
}

function assertArticleExists(db: Database.Database, articleId: number): void {
  const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(articleId)
  if (!article) throw new Error('Article not found')
}

function assertVariantBelongsToArticle(db: Database.Database, variantId: number, articleId: number): void {
  const variant = db.prepare('SELECT id FROM article_content_variants WHERE id = ? AND article_id = ?').get(variantId, articleId)
  if (!variant) throw new Error('Content variant not found for this article')
}

function normalizePlatform(platform: string): string {
  const normalized = platform.trim().toLowerCase()
  if (!normalized) throw new Error('Platform is required')
  return normalized
}

function normalizeUrl(value: string): string {
  const url = new URL(value.trim())
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Published URL must use http or https')
  return url.toString()
}

function toVariant(row: ContentVariantRow): ContentVariant {
  return { id: row.id, articleId: row.article_id, platform: row.platform, title: row.title, content: row.content }
}

function toReceipt(row: PublishReceiptRow): PublishReceipt {
  return {
    id: row.id,
    articleId: row.article_id,
    variantId: row.variant_id,
    platform: row.platform,
    status: row.status,
    destinationUrl: row.destination_url,
    note: row.note,
    preparedAt: row.prepared_at,
    publishedAt: row.published_at,
  }
}
