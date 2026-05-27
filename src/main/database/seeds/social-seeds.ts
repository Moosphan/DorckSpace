import type Database from 'better-sqlite3'

export function seedSocialData(db: Database.Database): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM social_accounts').get() as { count: number }
  if (existing.count > 0) return

  // Seed with empty state - users add their own accounts via Settings
  console.log('Social accounts table ready (no default accounts)')
}
