import type Database from 'better-sqlite3'

export interface SocialAccountRow {
  id: number
  platform: string
  account_name: string
  account_id: string | null
  profile_url: string | null
  api_config: string
  is_active: number
  created_at: string
}

export interface MetricSnapshot {
  metric_type: string
  metric_value: number
  snapshot_date: string
}

export interface AccountDashboardData {
  id: number
  platform: string
  account_name: string
  profile_url: string | null
  api_config: Record<string, unknown>
  metrics: Record<string, number>
  prevMetrics: Record<string, number>
  trend: Record<string, { date: string; value: number }[]>
}

export class SocialRepository {
  protected db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  getAccounts(): SocialAccountRow[] {
    return this.db
      .prepare('SELECT * FROM social_accounts WHERE is_active = 1 ORDER BY platform')
      .all() as SocialAccountRow[]
  }

  getDashboardData(): AccountDashboardData[] {
    const accounts = this.getAccounts()
    const today = new Date().toISOString().split('T')[0]

    return accounts.map((account) => {
      const latest = this.db
        .prepare(
          `SELECT metric_type, metric_value FROM social_metrics
           WHERE account_id = ? AND snapshot_date = ?
           ORDER BY metric_type`,
        )
        .all(account.id, today) as { metric_type: string; metric_value: number }[]

      const prev = this.db
        .prepare(
          `SELECT metric_type, metric_value FROM social_metrics
           WHERE account_id = ? AND snapshot_date < ?
           GROUP BY metric_type
           HAVING snapshot_date = MAX(snapshot_date)
           ORDER BY metric_type`,
        )
        .all(account.id, today) as { metric_type: string; metric_value: number }[]

      const trendRows = this.db
        .prepare(
          `SELECT metric_type, snapshot_date as date, metric_value as value
           FROM social_metrics
           WHERE account_id = ? AND snapshot_date >= date(?, '-7 days')
           ORDER BY metric_type, snapshot_date`,
        )
        .all(account.id, today) as { metric_type: string; date: string; value: number }[]

      const metrics: Record<string, number> = {}
      for (const row of latest) metrics[row.metric_type] = row.metric_value

      const prevMetrics: Record<string, number> = {}
      for (const row of prev) prevMetrics[row.metric_type] = row.metric_value

      const trend: Record<string, { date: string; value: number }[]> = {}
      for (const row of trendRows) {
        if (!trend[row.metric_type]) trend[row.metric_type] = []
        trend[row.metric_type].push({ date: row.date, value: row.value })
      }

      return {
        id: account.id,
        platform: account.platform,
        account_name: account.account_name,
        profile_url: account.profile_url,
        api_config: account.api_config ? JSON.parse(account.api_config) : {},
        metrics,
        prevMetrics,
        trend,
      }
    })
  }

  upsertAccount(data: {
    platform: string
    account_name: string
    account_id?: string
    profile_url?: string
  }): number {
    const existing = this.db
      .prepare('SELECT id FROM social_accounts WHERE platform = ? AND account_name = ?')
      .get(data.platform, data.account_name) as { id: number } | undefined

    if (existing) {
      this.db
        .prepare(
          'UPDATE social_accounts SET account_id = ?, profile_url = ? WHERE id = ?',
        )
        .run(data.account_id ?? null, data.profile_url ?? null, existing.id)
      return existing.id
    }

    const result = this.db
      .prepare(
        `INSERT INTO social_accounts (platform, account_name, account_id, profile_url)
         VALUES (?, ?, ?, ?)`,
      )
      .run(data.platform, data.account_name, data.account_id ?? null, data.profile_url ?? null)
    return Number(result.lastInsertRowid)
  }

  updateAccount(id: number, data: { account_name?: string; profile_url?: string; api_config?: Record<string, unknown> }): boolean {
    const fields: string[] = []
    const values: unknown[] = []
    if (data.account_name !== undefined) { fields.push('account_name = ?'); values.push(data.account_name) }
    if (data.profile_url !== undefined) { fields.push('profile_url = ?'); values.push(data.profile_url) }
    if (data.api_config !== undefined) { fields.push('api_config = ?'); values.push(JSON.stringify(data.api_config)) }
    if (fields.length === 0) return false
    values.push(id)
    const result = this.db.prepare(`UPDATE social_accounts SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return result.changes > 0
  }

  deleteAccount(id: number): boolean {
    const result = this.db.prepare('DELETE FROM social_accounts WHERE id = ?').run(id)
    return result.changes > 0
  }

  addMetricsSnapshot(accountId: number, metrics: MetricSnapshot[]): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO social_metrics (account_id, metric_type, metric_value, snapshot_date)
       VALUES (?, ?, ?, ?)`,
    )
    const insert = this.db.transaction((items: MetricSnapshot[]) => {
      for (const m of items) {
        stmt.run(accountId, m.metric_type, m.metric_value, m.snapshot_date)
      }
    })
    insert(metrics)
  }
}
