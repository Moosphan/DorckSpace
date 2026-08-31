import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import Database from 'better-sqlite3'
import { runMigrations } from '../src/main/database/migrations'
import { AIActionPlannerService } from '../src/main/services/ai-action-planner-service'

after(() => {
  setImmediate(() => process.exit(process.exitCode ?? 0))
})

function createProject(db: Database.Database, name: string): number {
  return Number(db.prepare('INSERT INTO projects (name) VALUES (?)').run(name).lastInsertRowid)
}

test('sends only the selected project and its open tasks to the model', async () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const selectedProjectId = createProject(db, 'Selected project')
    const privateProjectId = createProject(db, 'Private project')
    db.prepare("INSERT INTO tasks (title, project_id, status) VALUES ('Selected open task', ?, 'pending')").run(selectedProjectId)
    db.prepare("INSERT INTO tasks (title, project_id, status) VALUES ('Selected completed task', ?, 'completed')").run(selectedProjectId)
    db.prepare("INSERT INTO tasks (title, project_id, status) VALUES ('Private task', ?, 'pending')").run(privateProjectId)

    let receivedPrompt = ''
    const service = new AIActionPlannerService(db, async ({ prompt }) => {
      receivedPrompt = prompt
      return {
        content: JSON.stringify({
          summary: 'Add one focused next step.',
          actions: [{ title: 'Draft launch note', description: null, priority: 'medium', dueDate: null, tags: ['launch'] }],
        }),
        model: 'test-model',
      }
    })
    const plan = await service.generate({ projectId: selectedProjectId, objective: 'Plan the launch.' })

    assert.match(receivedPrompt, /Selected project/)
    assert.match(receivedPrompt, /Selected open task/)
    assert.doesNotMatch(receivedPrompt, /Selected completed task/)
    assert.doesNotMatch(receivedPrompt, /Private project|Private task/)
    assert.equal(plan.proposals.length, 1)
    assert.equal(plan.proposals[0].title, 'Draft launch note')
  } finally {
    db.close()
  }
})

test('rejects malformed or over-limit model proposals without saving a plan', async () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const projectId = createProject(db, 'Validation project')
    const invalidResponses = [
      'not json',
      JSON.stringify({
        summary: 'Too many',
        actions: Array.from({ length: 6 }, (_, index) => ({ title: `Task ${index}`, priority: 'medium', dueDate: null, tags: [] })),
      }),
      JSON.stringify({
        summary: 'Wrong priority',
        actions: [{ title: 'Task', priority: 'urgent', dueDate: null, tags: [] }],
      }),
    ]

    for (const content of invalidResponses) {
      const service = new AIActionPlannerService(db, async () => ({ content, model: 'test-model' }))
      await assert.rejects(service.generate({ projectId, objective: 'Validate draft.' }), /AI action plan/)
    }

    const count = db.prepare('SELECT COUNT(*) AS count FROM ai_action_plans').get() as { count: number }
    assert.equal(count.count, 0)
  } finally {
    db.close()
  }
})

test('creates tasks only for explicitly applied proposals and audits all outcomes', async () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const projectId = createProject(db, 'Audited project')
    const service = new AIActionPlannerService(db, async () => ({
      content: JSON.stringify({
        summary: 'Two possible steps.',
        actions: [
          { title: 'Discard this step', priority: 'low', dueDate: null, tags: [] },
          { title: 'Confirm this step', description: 'Only this becomes a task.', priority: 'high', dueDate: '2026-09-02', tags: ['launch'] },
        ],
      }),
      model: 'test-model',
    }))
    const plan = await service.generate({ projectId, objective: 'Prepare a release.' })

    const dismissed = service.dismiss(plan.proposals[0].id)
    const applied = service.apply({ planId: plan.id, proposalIds: [plan.proposals[1].id] })
    const tasks = db.prepare('SELECT title, project_id, priority, due_date FROM tasks ORDER BY id').all() as Array<{
      title: string
      project_id: number
      priority: string
      due_date: string | null
    }>

    assert.deepEqual(tasks, [{ title: 'Confirm this step', project_id: projectId, priority: 'high', due_date: '2026-09-02' }])
    assert.equal(dismissed.proposals[0].status, 'dismissed')
    assert.equal(applied.createdTaskIds.length, 1)
    assert.equal(applied.plan.proposals[1].status, 'applied')
    assert.equal(applied.plan.proposals[1].taskId, applied.createdTaskIds[0])
  } finally {
    db.close()
  }
})

test('does not apply proposals after the project stops being active', async () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const projectId = createProject(db, 'Changing project')
    const service = new AIActionPlannerService(db, async () => ({
      content: JSON.stringify({
        summary: 'One possible step.',
        actions: [{ title: 'Should not be created', priority: 'medium', dueDate: null, tags: [] }],
      }),
      model: 'test-model',
    }))
    const plan = await service.generate({ projectId, objective: 'Prepare the next move.' })
    db.prepare("UPDATE projects SET status = 'paused' WHERE id = ?").run(projectId)

    assert.throws(
      () => service.apply({ planId: plan.id, proposalIds: [plan.proposals[0].id] }),
      /active project/i,
    )
    const taskCount = db.prepare('SELECT COUNT(*) AS count FROM tasks').get() as { count: number }
    const proposal = db.prepare('SELECT status, task_id FROM ai_action_proposals WHERE id = ?').get(plan.proposals[0].id) as {
      status: string
      task_id: number | null
    }
    assert.equal(taskCount.count, 0)
    assert.deepEqual(proposal, { status: 'proposed', task_id: null })
  } finally {
    db.close()
  }
})

test('rejects invalid recent plan limits before querying SQLite', () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const service = new AIActionPlannerService(db, async () => ({
      content: '{"summary":"Unused","actions":[]}',
      model: 'test-model',
    }))

    assert.throws(() => service.findRecent(undefined, Number.NaN), /limit/i)
    assert.throws(() => service.findRecent(undefined, 0), /limit/i)
  } finally {
    db.close()
  }
})

test('does not send ciphertext-like API keys to the model endpoint', async () => {
  const db = new Database(':memory:')
  runMigrations(db)
  const originalFetch = globalThis.fetch
  let fetchCalled = false
  globalThis.fetch = (async () => {
    fetchCalled = true
    return new Response('{}', { status: 401 })
  }) as typeof fetch
  try {
    const projectId = createProject(db, 'Encrypted key project')
    db.prepare(
      `INSERT INTO ai_subscriptions (provider, plan_name, base_url, api_key, is_active)
       VALUES ('CodexZh', 'Pro', 'https://us-api.codexzh.com/v1', 'djEwStillEncryptedApiKeyValue', 1)`,
    ).run()
    const service = new AIActionPlannerService(db)

    await assert.rejects(
      service.generate({ projectId, objective: 'Plan safely.' }),
      /re-enter/i,
    )
    assert.equal(fetchCalled, false)
  } finally {
    globalThis.fetch = originalFetch
    db.close()
  }
})

test('includes subscription identity when the model endpoint rejects authorization', async () => {
  const db = new Database(':memory:')
  runMigrations(db)
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response('{"error":"unauthorized"}', { status: 401 })) as typeof fetch
  try {
    const projectId = createProject(db, 'Auth project')
    db.prepare(
      `INSERT INTO ai_subscriptions (provider, plan_name, base_url, api_key, is_active)
       VALUES ('CodexZh', 'Pro', 'https://us-api.codexzh.com/v1', 'sk-test-valid-shape', 1)`,
    ).run()
    const service = new AIActionPlannerService(db)

    await assert.rejects(
      service.generate({ projectId, objective: 'Plan safely.' }),
      /CodexZh Pro.*https:\/\/us-api\.codexzh\.com\/v1.*401/i,
    )
  } finally {
    globalThis.fetch = originalFetch
    db.close()
  }
})
