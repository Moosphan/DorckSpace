import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { runMigrations } from '../src/main/database/migrations'
import { getProjectProgressSummary } from '../src/main/services/project-progress-service'
import { MilestoneRepository } from '../src/main/database/repositories/milestone-repository'

test('derives progress and blockers from non-cancelled tasks and milestones', () => {
  const db = new Database(':memory:')
  runMigrations(db)

  try {
    const projectId = Number(db.prepare(
      "INSERT INTO projects (name, is_focus) VALUES ('HulkDash', 1)",
    ).run().lastInsertRowid)
    const milestoneId = Number(db.prepare(
      "INSERT INTO project_milestones (project_id, title, due_date) VALUES (?, 'First release', '2026-09-01')",
    ).run(projectId).lastInsertRowid)
    db.prepare(
      "INSERT INTO tasks (title, priority, status, project_id, milestone_id) VALUES ('Finished', 'medium', 'completed', ?, ?)",
    ).run(projectId, milestoneId)
    db.prepare(
      "INSERT INTO tasks (title, priority, status, project_id, milestone_id) VALUES ('Blocked', 'high', 'in_progress', ?, ?)",
    ).run(projectId, milestoneId)
    db.prepare(
      "INSERT INTO tasks (title, priority, status, project_id, milestone_id) VALUES ('Cancelled', 'high', 'cancelled', ?, ?)",
    ).run(projectId, milestoneId)

    const summary = getProjectProgressSummary(db, projectId)

    assert.equal(summary.progress, 50)
    assert.equal(summary.openTaskCount, 1)
    assert.equal(summary.openBlockerCount, 1)
    assert.equal(summary.nextMilestone?.title, 'First release')
    assert.equal(summary.nextMilestone?.progress, 50)
    assert.equal(new MilestoneRepository(db).findByProject(projectId)[0].progress, 50)
  } finally {
    db.close()
  }
})
