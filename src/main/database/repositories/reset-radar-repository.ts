import type Database from 'better-sqlite3'
import type { ResetRadarHistoryEntry, ResetRadarResetType } from '../../../shared/reset-radar'
import type { ResetRadarSnapshot } from '../../../shared/reset-radar'

interface ResetRadarHistoryRow {
  id: number
  kind: 'reset'
  occurred_at: string
  title: string
  detail: string
  source: string
  external_id: string | null
  source_url: string | null
  reset_type: ResetRadarResetType
}

export interface ResetRadarAccountSnapshotData {
  plan: string | null
  email: string | null
  name: string | null
  subscriptionExpiresAt: string | null
  limitReached: boolean | null
  quotaWindows: ResetRadarSnapshot['quotaWindows']
  resetCredits: ResetRadarSnapshot['resetCredits']
  fetchedAt: string
}

export interface ResetRadarUsageSampleData {
  observedAt: string
  quotaWindows: ResetRadarSnapshot['quotaWindows']
}

export class ResetRadarRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  getRecent(limit = 20): ResetRadarHistoryEntry[] {
    const rows = this.db.prepare(
      `SELECT id, kind, occurred_at, title, detail, source, external_id, source_url, reset_type
       FROM reset_radar_history
       ORDER BY occurred_at DESC, id DESC
       LIMIT ?`,
    ).all(Math.max(1, Math.min(limit, 100))) as ResetRadarHistoryRow[]

    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      occurredAt: row.occurred_at,
      title: row.title,
      detail: row.detail,
      source: row.source,
      url: row.source_url,
      resetType: row.reset_type,
    }))
  }

  addReset(
    occurredAt: string,
    title: string,
    detail: string,
    source: string,
    metadata: { externalId?: string; url?: string; resetType?: ResetRadarResetType } = {},
  ): ResetRadarHistoryEntry {
    const result = this.db.prepare(
      `INSERT INTO reset_radar_history (kind, occurred_at, title, detail, source, external_id, source_url, reset_type)
       VALUES ('reset', ?, ?, ?, ?, ?, ?, ?)`,
    ).run(occurredAt, title, detail, source, metadata.externalId ?? null, metadata.url ?? null, metadata.resetType ?? 'unknown')

    return {
      id: Number(result.lastInsertRowid),
      kind: 'reset',
      occurredAt,
      title,
      detail,
      source,
      url: metadata.url ?? null,
      resetType: metadata.resetType ?? 'unknown',
    }
  }

  hasExternalId(externalId: string): boolean {
    const row = this.db.prepare(
      'SELECT 1 AS present FROM reset_radar_history WHERE external_id = ? LIMIT 1',
    ).get(externalId) as { present: number } | undefined
    return Boolean(row?.present)
  }

  updateResetType(externalId: string, resetType: ResetRadarResetType): void {
    this.db.prepare(
      'UPDATE reset_radar_history SET reset_type = ? WHERE external_id = ?',
    ).run(resetType, externalId)
  }

  getAccountSnapshot(): ResetRadarAccountSnapshotData | null {
    const row = this.db.prepare(
      `SELECT plan, email, name, subscription_expires_at, limit_reached, quota_windows, reset_credits, fetched_at
       FROM reset_radar_account_snapshot WHERE id = 1`,
    ).get() as {
      plan: string | null
      email: string | null
      name: string | null
      subscription_expires_at: string | null
      limit_reached: number | null
      quota_windows: string
      reset_credits: string | null
      fetched_at: string
    } | undefined
    if (!row) return null

    try {
      return {
        plan: row.plan,
        email: row.email,
        name: row.name,
        subscriptionExpiresAt: row.subscription_expires_at,
        limitReached: row.limit_reached === null ? null : row.limit_reached === 1,
        quotaWindows: JSON.parse(row.quota_windows) as ResetRadarSnapshot['quotaWindows'],
        resetCredits: row.reset_credits ? JSON.parse(row.reset_credits) as ResetRadarSnapshot['resetCredits'] : null,
        fetchedAt: row.fetched_at,
      }
    } catch {
      return null
    }
  }

  saveAccountSnapshot(snapshot: ResetRadarAccountSnapshotData): void {
    this.db.prepare(
      `INSERT INTO reset_radar_account_snapshot (
        id, plan, email, name, subscription_expires_at, limit_reached, quota_windows, reset_credits, fetched_at, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        plan = excluded.plan,
        email = excluded.email,
        name = excluded.name,
        subscription_expires_at = excluded.subscription_expires_at,
        limit_reached = excluded.limit_reached,
        quota_windows = excluded.quota_windows,
        reset_credits = excluded.reset_credits,
        fetched_at = excluded.fetched_at,
        updated_at = CURRENT_TIMESTAMP`,
    ).run(
      snapshot.plan,
      snapshot.email,
      snapshot.name,
      snapshot.subscriptionExpiresAt,
      snapshot.limitReached === null ? null : snapshot.limitReached ? 1 : 0,
      JSON.stringify(snapshot.quotaWindows),
      snapshot.resetCredits ? JSON.stringify(snapshot.resetCredits) : null,
      snapshot.fetchedAt,
    )
  }

  addUsageSample(sample: ResetRadarUsageSampleData): void {
    this.db.prepare(
      `INSERT INTO reset_radar_usage_samples (observed_at, quota_windows)
       VALUES (?, ?)`,
    ).run(sample.observedAt, JSON.stringify(sample.quotaWindows))
  }

  getUsageSamplesSince(since: string): ResetRadarUsageSampleData[] {
    const rows = this.db.prepare(
      `SELECT observed_at, quota_windows
       FROM reset_radar_usage_samples
       WHERE observed_at >= ?
       ORDER BY observed_at ASC`,
    ).all(since) as Array<{ observed_at: string; quota_windows: string }>

    return rows.flatMap((row) => {
      try {
        return [{ observedAt: row.observed_at, quotaWindows: JSON.parse(row.quota_windows) as ResetRadarSnapshot['quotaWindows'] }]
      } catch {
        return []
      }
    })
  }
}
