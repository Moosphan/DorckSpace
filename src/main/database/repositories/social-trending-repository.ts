import type Database from 'better-sqlite3'
import type {
  TrendingItem,
  TrendingPeriod,
  TrendingPlatform,
  TrendingProviderStatus,
} from '../../../shared/social-trending'

interface TrendingItemRow {
  id: number
  platform: TrendingPlatform
  period: TrendingPeriod
  external_id: string
  title: string
  url: string
  author: string | null
  published_at: string | null
  heat_score: number
  heat_label: string | null
  tags: string
  category: string | null
  summary: string | null
  raw_metrics: string
  source: string
  fetched_at: string
  expires_at: string
}

export interface TrendingRefreshState {
  platform: TrendingPlatform
  period: TrendingPeriod
  status: TrendingProviderStatus
  message: string
  activeBackend?: string
  lastFetchedAt?: string
  nextRefreshAt?: string
  updatedCount: number
}

export class SocialTrendingRepository {
  protected db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  getItems(platform: TrendingPlatform, period: TrendingPeriod, limit: number): TrendingItem[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM social_trending_items
         WHERE platform = ? AND period = ?
         ORDER BY heat_score DESC, published_at DESC
         LIMIT ?`,
      )
      .all(platform, period, limit) as TrendingItemRow[]
    return rows.map(mapRow)
  }

  getAllItems(platforms: TrendingPlatform[], period: TrendingPeriod, limit: number): Record<TrendingPlatform, TrendingItem[]> {
    const result = {} as Record<TrendingPlatform, TrendingItem[]>
    for (const platform of platforms) result[platform] = this.getItems(platform, period, limit)
    return result
  }

  getFreshItemCount(platform: TrendingPlatform, period: TrendingPeriod, nowIso = new Date().toISOString()): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM social_trending_items
         WHERE platform = ? AND period = ? AND expires_at > ?`,
      )
      .get(platform, period, nowIso) as { count: number }
    return row.count
  }

  replacePlatformPeriodItems(platform: TrendingPlatform, period: TrendingPeriod, items: TrendingItem[]): void {
    const deleteStale = this.db.prepare(
      'DELETE FROM social_trending_items WHERE platform = ? AND period = ?',
    )
    const insert = this.db.prepare(
      `INSERT INTO social_trending_items (
        platform, period, external_id, title, url, author, published_at, heat_score,
        heat_label, tags, category, summary, raw_metrics, source, fetched_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(platform, period, external_id) DO UPDATE SET
        title = excluded.title,
        url = excluded.url,
        author = excluded.author,
        published_at = excluded.published_at,
        heat_score = excluded.heat_score,
        heat_label = excluded.heat_label,
        tags = excluded.tags,
        category = excluded.category,
        summary = excluded.summary,
        raw_metrics = excluded.raw_metrics,
        source = excluded.source,
        fetched_at = excluded.fetched_at,
        expires_at = excluded.expires_at,
        updated_at = CURRENT_TIMESTAMP`,
    )

    this.db.transaction((nextItems: TrendingItem[]) => {
      deleteStale.run(platform, period)
      for (const item of nextItems) {
        insert.run(
          item.platform,
          item.period,
          item.externalId,
          item.title,
          item.url,
          item.author,
          item.publishedAt,
          item.heatScore,
          item.heatLabel,
          JSON.stringify(item.tags),
          item.category,
          item.summary ?? null,
          JSON.stringify(item.rawMetrics),
          item.source,
          item.fetchedAt,
          item.expiresAt,
        )
      }
    })(items)
  }

  upsertRefreshState(state: TrendingRefreshState): void {
    this.db
      .prepare(
        `INSERT INTO social_trending_refresh_state (
          platform, period, status, message, active_backend,
          last_fetched_at, next_refresh_at, updated_count, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(platform, period) DO UPDATE SET
          status = excluded.status,
          message = excluded.message,
          active_backend = excluded.active_backend,
          last_fetched_at = excluded.last_fetched_at,
          next_refresh_at = excluded.next_refresh_at,
          updated_count = excluded.updated_count,
          updated_at = CURRENT_TIMESTAMP`,
      )
      .run(
        state.platform,
        state.period,
        state.status,
        state.message,
        state.activeBackend ?? null,
        state.lastFetchedAt ?? null,
        state.nextRefreshAt ?? null,
        state.updatedCount,
      )
  }

  getRefreshState(platform: TrendingPlatform, period: TrendingPeriod): TrendingRefreshState | null {
    const row = this.db
      .prepare('SELECT * FROM social_trending_refresh_state WHERE platform = ? AND period = ?')
      .get(platform, period) as
      | {
        platform: TrendingPlatform
        period: TrendingPeriod
        status: TrendingProviderStatus
        message: string | null
        active_backend: string | null
        last_fetched_at: string | null
        next_refresh_at: string | null
        updated_count: number
      }
      | undefined

    if (!row) return null
    return {
      platform: row.platform,
      period: row.period,
      status: row.status,
      message: row.message ?? '',
      activeBackend: row.active_backend ?? undefined,
      lastFetchedAt: row.last_fetched_at ?? undefined,
      nextRefreshAt: row.next_refresh_at ?? undefined,
      updatedCount: row.updated_count,
    }
  }
}

function mapRow(row: TrendingItemRow): TrendingItem {
  return {
    id: row.id,
    platform: row.platform,
    period: row.period,
    externalId: row.external_id,
    title: row.title,
    url: row.url,
    author: row.author ?? 'Unknown',
    publishedAt: row.published_at,
    heatScore: row.heat_score,
    heatLabel: row.heat_label ?? '',
    tags: parseJson<string[]>(row.tags, []),
    category: row.category ?? 'General',
    summary: row.summary ?? undefined,
    rawMetrics: parseJson<Record<string, number | string | null>>(row.raw_metrics, {}),
    source: row.source,
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
  }
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
