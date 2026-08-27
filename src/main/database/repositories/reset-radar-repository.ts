import type Database from 'better-sqlite3'
import type { ResetRadarHistoryEntry } from '../../../shared/reset-radar'
import type { ResetRadarSnapshot } from '../../../shared/reset-radar'

interface ResetRadarHistoryRow {
  id: number
  kind: 'reset'
  occurred_at: string
  title: string
  detail: string
  source: string
}

export interface ResetRadarAccountSnapshotData {
  plan: string | null
  limitReached: boolean | null
  quotaWindows: ResetRadarSnapshot['quotaWindows']
  resetCredits: ResetRadarSnapshot['resetCredits']
  fetchedAt: string
}

export class ResetRadarRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  getRecent(limit = 20): ResetRadarHistoryEntry[] {
    const rows = this.db.prepare(
      `SELECT id, kind, occurred_at, title, detail, source
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
    }))
  }

  addReset(occurredAt: string, title: string, detail: string, source: string): ResetRadarHistoryEntry {
    const result = this.db.prepare(
      `INSERT INTO reset_radar_history (kind, occurred_at, title, detail, source)
       VALUES ('reset', ?, ?, ?, ?)`,
    ).run(occurredAt, title, detail, source)

    return {
      id: Number(result.lastInsertRowid),
      kind: 'reset',
      occurredAt,
      title,
      detail,
      source,
    }
  }

  getAccountSnapshot(): ResetRadarAccountSnapshotData | null {
    const row = this.db.prepare(
      `SELECT plan, limit_reached, quota_windows, reset_credits, fetched_at
       FROM reset_radar_account_snapshot WHERE id = 1`,
    ).get() as {
      plan: string | null
      limit_reached: number | null
      quota_windows: string
      reset_credits: string | null
      fetched_at: string
    } | undefined
    if (!row) return null

    try {
      return {
        plan: row.plan,
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
        id, plan, limit_reached, quota_windows, reset_credits, fetched_at, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        plan = excluded.plan,
        limit_reached = excluded.limit_reached,
        quota_windows = excluded.quota_windows,
        reset_credits = excluded.reset_credits,
        fetched_at = excluded.fetched_at,
        updated_at = CURRENT_TIMESTAMP`,
    ).run(
      snapshot.plan,
      snapshot.limitReached === null ? null : snapshot.limitReached ? 1 : 0,
      JSON.stringify(snapshot.quotaWindows),
      snapshot.resetCredits ? JSON.stringify(snapshot.resetCredits) : null,
      snapshot.fetchedAt,
    )
  }
}
