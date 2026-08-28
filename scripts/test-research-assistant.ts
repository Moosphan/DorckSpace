import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { runMigrations } from '../src/main/database/migrations'
import { ResearchAssistantService } from '../src/main/services/research-assistant-service'

test('generates a cited brief from only the explicitly selected materials', async () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const selectedId = Number(db.prepare(
      "INSERT INTO research_materials (title, excerpt, url, tags) VALUES ('Selected source', 'Keep this in scope.', 'https://example.com/selected', '[\"product\"]')",
    ).run().lastInsertRowid)
    db.prepare(
      "INSERT INTO research_materials (title, excerpt, url) VALUES ('Private source', 'This must never reach the model.', 'https://example.com/private')",
    ).run()

    let receivedPrompt = ''
    const service = new ResearchAssistantService(db, async (request) => {
      receivedPrompt = request.prompt
      return { content: '## Brief\nUse the selected source [S1].', model: 'test-model' }
    })
    const result = await service.generate({ materialIds: [selectedId], objective: 'Find one product insight.' })

    assert.match(receivedPrompt, /\[S1\] Selected source/)
    assert.doesNotMatch(receivedPrompt, /Private source/)
    assert.equal(result.content, '## Brief\nUse the selected source [S1].')
    assert.equal(result.sources.length, 1)
    assert.deepEqual(result.sources[0], {
      number: 1,
      materialId: selectedId,
      title: 'Selected source',
      url: 'https://example.com/selected',
    })

    const persisted = service.findById(result.id)
    assert.deepEqual(persisted?.materialIds, [selectedId])
    assert.equal(persisted?.objective, 'Find one product insight.')
  } finally {
    db.close()
  }
})

test('rejects missing or duplicate research material selections before calling a model', async () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    let calls = 0
    const service = new ResearchAssistantService(db, async () => {
      calls += 1
      return { content: 'Unexpected', model: 'test-model' }
    })

    await assert.rejects(service.generate({ materialIds: [], objective: 'Anything' }), /Select at least one research material/)
    await assert.rejects(service.generate({ materialIds: [999], objective: 'Anything' }), /Selected research material was not found/)
    await assert.rejects(service.generate({ materialIds: [1, 1], objective: 'Anything' }), /must be unique/)
    assert.equal(calls, 0)
  } finally {
    db.close()
  }
})

test('saves a generated brief as an article draft or an idea with source references', async () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const materialId = Number(db.prepare(
      "INSERT INTO research_materials (title, excerpt, url) VALUES ('Launch lesson', 'Ship the smallest test.', 'https://example.com/launch')",
    ).run().lastInsertRowid)
    const service = new ResearchAssistantService(db, async () => ({
      content: '## Research brief\nStart with a narrow release [S1].',
      model: 'test-model',
    }))
    const brief = await service.generate({ materialIds: [materialId], objective: 'Plan a launch.' })

    const articleId = service.saveAsArticle(brief.id)
    const ideaId = service.saveAsIdea(brief.id)
    const article = db.prepare('SELECT title, content, status FROM articles WHERE id = ?').get(articleId) as { title: string; content: string; status: string }
    const idea = db.prepare('SELECT content, category FROM ideas WHERE id = ?').get(ideaId) as { content: string; category: string }

    assert.equal(article.title, 'Research: Plan a launch.')
    assert.equal(article.status, 'draft')
    assert.match(article.content, /Start with a narrow release \[S1\]/)
    assert.match(article.content, /\[S1\] Launch lesson \(https:\/\/example.com\/launch\)/)
    assert.equal(idea.category, 'research')
    assert.match(idea.content, /Launch lesson/)
  } finally {
    db.close()
  }
})
