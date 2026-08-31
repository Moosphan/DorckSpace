import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import Database from 'better-sqlite3'
import { runMigrations } from '../src/main/database/migrations'
import { FocusSessionRepository } from '../src/main/database/repositories/focus-session-repository'

after(() => {
  setImmediate(() => process.exit(process.exitCode ?? 0))
})

test('tracks one focus session and accumulates elapsed minutes on its task', () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const taskId = Number(db.prepare("INSERT INTO tasks (title, estimated_hours) VALUES ('Ship the focus timer', 2)").run().lastInsertRowid)
    const repository = new FocusSessionRepository(db)
    const sessionId = repository.start(taskId, '2026-08-31 09:00:00')

    assert.throws(() => repository.start(taskId, '2026-08-31 09:10:00'), /already active/)
    const completed = repository.stop(sessionId, '2026-08-31 09:42:00')
    const task = db.prepare('SELECT actual_hours FROM tasks WHERE id = ?').get(taskId) as { actual_hours: number }

    assert.deepEqual(completed, {
      id: sessionId,
      taskId,
      startedAt: '2026-08-31 09:00:00',
      endedAt: '2026-08-31 09:42:00',
      durationMinutes: 42,
      plannedDurationMinutes: 120,
    })
    assert.equal(task.actual_hours, 0.7)
    assert.equal(repository.getActive(), null)
  } finally {
    db.close()
  }
})

test('caps planned focus sessions at their target duration', () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const taskId = Number(db.prepare("INSERT INTO tasks (title, estimated_hours) VALUES ('Respect the timer', 1)").run().lastInsertRowid)
    const repository = new FocusSessionRepository(db)
    const sessionId = repository.start(taskId, '2026-08-31 09:00:00', 60)
    const active = repository.getActive()

    assert.equal(active?.plannedDurationMinutes, 60)
    const completed = repository.stop(sessionId, '2026-08-31 10:24:38')
    const task = db.prepare('SELECT actual_hours FROM tasks WHERE id = ?').get(taskId) as { actual_hours: number }

    assert.deepEqual(completed, {
      id: sessionId,
      taskId,
      startedAt: '2026-08-31 09:00:00',
      endedAt: '2026-08-31 10:00:00',
      durationMinutes: 60,
      plannedDurationMinutes: 60,
    })
    assert.equal(task.actual_hours, 1)
    assert.equal(repository.getActive(), null)
  } finally {
    db.close()
  }
})

test('uses task estimate as a fallback target for legacy active sessions', () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const taskId = Number(db.prepare("INSERT INTO tasks (title, estimated_hours) VALUES ('Legacy running timer', 1)").run().lastInsertRowid)
    const repository = new FocusSessionRepository(db)
    const sessionId = repository.start(taskId, '2026-08-31 09:00:00')
    const completed = repository.stop(sessionId, '2026-08-31 10:24:38')
    const task = db.prepare('SELECT actual_hours FROM tasks WHERE id = ?').get(taskId) as { actual_hours: number }

    assert.equal(completed.plannedDurationMinutes, 60)
    assert.equal(completed.endedAt, '2026-08-31 10:00:00')
    assert.equal(completed.durationMinutes, 60)
    assert.equal(task.actual_hours, 1)
  } finally {
    db.close()
  }
})

test('preserves short sessions without adding fake task time', () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const taskId = Number(db.prepare("INSERT INTO tasks (title) VALUES ('Check context')").run().lastInsertRowid)
    const repository = new FocusSessionRepository(db)
    const sessionId = repository.start(taskId, '2026-08-31 09:00:00')
    const completed = repository.stop(sessionId, '2026-08-31 09:00:30')
    const task = db.prepare('SELECT actual_hours FROM tasks WHERE id = ?').get(taskId) as { actual_hours: number | null }

    assert.equal(completed.durationMinutes, 0)
    assert.equal(task.actual_hours, null)
  } finally {
    db.close()
  }
})
