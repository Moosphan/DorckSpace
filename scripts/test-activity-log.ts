import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { runMigrations } from '../src/main/database/migrations'
import { ActivityLogRepository } from '../src/main/database/repositories/activity-log-repository'

function createRepository(): { db: Database.Database; repo: ActivityLogRepository } {
  const db = new Database(':memory:')
  runMigrations(db)
  return { db, repo: new ActivityLogRepository(db) }
}

test('aggregates same-day activities into an intensity level', () => {
  const { db, repo } = createRepository()

  try {
    repo.record({ date: '2026-08-28', activityType: 'task_completed' })
    repo.record({ date: '2026-08-28', activityType: 'article_edited' })

    const [day] = repo.getRecentDays(1, '2026-08-28')
    assert.equal(day.date, '2026-08-28')
    assert.equal(day.activityCount, 2)
    assert.equal(day.intensity, 2)
  } finally {
    db.close()
  }
})
