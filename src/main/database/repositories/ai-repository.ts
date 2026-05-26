import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

export interface AISubscriptionRow {
  id: number
  provider: string
  plan_name: string
  monthly_cost: number | null
  currency: string
  billing_date: number | null
  token_limit: number | null
  tokens_used: number
  reset_date: string | null
  is_active: number
  api_key: string | null
  metadata: string
  created_at: string
  updated_at: string
}

export interface AIToolRow {
  id: number
  name: string
  description: string | null
  category: string | null
  provider: string | null
  url: string | null
  icon_url: string | null
  is_custom: number
  usage_count: number
  created_at: string
}

export class AISubscriptionRepository extends BaseRepository<AISubscriptionRow> {
  constructor(db: Database.Database) {
    super(db, 'ai_subscriptions')
  }

  findActive(): AISubscriptionRow[] {
    return this.all<AISubscriptionRow>(
      'SELECT * FROM ai_subscriptions WHERE is_active = 1 ORDER BY created_at DESC',
    )
  }

  create(data: {
    provider: string
    plan_name: string
    monthly_cost?: number
    token_limit?: number
  }): number {
    const result = this.run(
      `INSERT INTO ai_subscriptions (provider, plan_name, monthly_cost, token_limit)
       VALUES (?, ?, ?, ?)`,
      data.provider,
      data.plan_name,
      data.monthly_cost ?? null,
      data.token_limit ?? null,
    )
    return Number(result.lastInsertRowid)
  }

  updateTokensUsed(id: number, tokens: number): boolean {
    const result = this.run(
      'UPDATE ai_subscriptions SET tokens_used = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      tokens,
      id,
    )
    return result.changes > 0
  }
}

export class AIToolRepository extends BaseRepository<AIToolRow> {
  constructor(db: Database.Database) {
    super(db, 'ai_tools')
  }

  findByCategory(category: string): AIToolRow[] {
    return this.all<AIToolRow>(
      'SELECT * FROM ai_tools WHERE category = ? ORDER BY usage_count DESC',
      category,
    )
  }

  create(data: {
    name: string
    description?: string
    category?: string
    provider?: string
    url?: string
    is_custom?: boolean
  }): number {
    const result = this.run(
      `INSERT INTO ai_tools (name, description, category, provider, url, is_custom)
       VALUES (?, ?, ?, ?, ?, ?)`,
      data.name,
      data.description ?? null,
      data.category ?? null,
      data.provider ?? null,
      data.url ?? null,
      data.is_custom ? 1 : 0,
    )
    return Number(result.lastInsertRowid)
  }
}
