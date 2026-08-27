import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { runMigrations } from '../src/main/database/migrations'
import { ProjectRepository } from '../src/main/database/repositories/project-repository'

function createRepository(): { db: Database.Database; repo: ProjectRepository } {
  const db = new Database(':memory:')
  runMigrations(db)
  return { db, repo: new ProjectRepository(db) }
}

test('persists project start date when creating a project', () => {
  const { db, repo } = createRepository()

  try {
    const projectId = repo.create({
      name: 'HulkDash',
      start_date: '2026-08-27',
      target_date: '2026-09-30',
    })
    const project = db.prepare('SELECT start_date, target_date FROM projects WHERE id = ?').get(projectId) as {
      start_date: string | null
      target_date: string | null
    }

    assert.equal(project.start_date, '2026-08-27')
    assert.equal(project.target_date, '2026-09-30')
  } finally {
    db.close()
  }
})

test('sets one active project as focus and rejects inactive projects', () => {
  const { db, repo } = createRepository()

  try {
    const activeId = repo.create({ name: 'Active project' })
    const pausedId = Number(db.prepare(
      "INSERT INTO projects (name, status) VALUES ('Paused project', 'paused')",
    ).run().lastInsertRowid)

    repo.setFocus(activeId)
    assert.equal(repo.findFocus()?.id, activeId)
    assert.throws(() => repo.setFocus(pausedId), /active project/i)
    assert.equal(repo.findFocus()?.id, activeId)
  } finally {
    db.close()
  }
})

test('promotes another active project when the focused project is deleted', () => {
  const { db, repo } = createRepository()

  try {
    const focusedId = repo.create({ name: 'Focused project' })
    const nextId = repo.create({ name: 'Next project' })

    repo.setFocus(focusedId)
    assert.equal(repo.deleteById(focusedId), true)
    assert.equal(repo.findFocus()?.id, nextId)
  } finally {
    db.close()
  }
})
