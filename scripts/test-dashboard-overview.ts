import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { runMigrations } from '../src/main/database/migrations'
import { getDashboardTodayOverview } from '../src/main/services/dashboard-overview-service'

function createDatabase(): Database.Database {
  const db = new Database(':memory:')
  runMigrations(db)
  return db
}

test('prioritizes overdue and high-priority tasks in the today overview', () => {
  const db = createDatabase()

  try {
    const projectId = Number(db.prepare(
      "INSERT INTO projects (name, is_focus) VALUES ('HulkDash', 1)",
    ).run().lastInsertRowid)
    db.prepare(
      "INSERT INTO tasks (title, priority, status, due_date, project_id) VALUES ('Future task', 'low', 'pending', '2026-09-01', ?)",
    ).run(projectId)
    db.prepare(
      "INSERT INTO tasks (title, priority, status, due_date, project_id) VALUES ('High priority task', 'high', 'in_progress', '2026-08-30', ?)",
    ).run(projectId)
    db.prepare(
      "INSERT INTO tasks (title, priority, status, due_date, project_id) VALUES ('Overdue task', 'medium', 'pending', '2026-08-27', ?)",
    ).run(projectId)

    const overview = getDashboardTodayOverview(db, new Date('2026-08-28T10:00:00'))

    assert.equal(overview.focusProject?.name, 'HulkDash')
    assert.deepEqual(
      overview.tasks.map((task) => task.title),
      ['Overdue task', 'High priority task', 'Future task'],
    )
    assert.equal(overview.overdueCount, 1)
  } finally {
    db.close()
  }
})
