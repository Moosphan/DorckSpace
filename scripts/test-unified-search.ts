import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { runMigrations } from '../src/main/database/migrations'
import { searchAll, type SearchResult } from '../src/main/ipc/search'

function createDatabase(): Database.Database {
  const db = new Database(':memory:')
  runMigrations(db)
  return db
}

test('searches projects and articles through one normalized result contract', () => {
  const db = createDatabase()
  try {
    const projectId = Number(db.prepare(
      "INSERT INTO projects (name, description, updated_at) VALUES ('HulkDash', 'Personal workspace', '2026-08-28 10:00:00')",
    ).run().lastInsertRowid)
    const articleId = Number(db.prepare(
      "INSERT INTO articles (title, content, category, updated_at) VALUES ('HulkDash launch notes', 'A local-first dashboard plan', 'Product', '2026-08-28 09:00:00')",
    ).run().lastInsertRowid)
    const moodboardId = Number(db.prepare(
      "INSERT INTO moodboard_items (title, url, category, updated_at) VALUES ('HulkDash moodboard', 'https://example.com', 'productivity', '2026-08-28 08:00:00')",
    ).run().lastInsertRowid)

    const results = searchAll(db, 'HulkDash')
    const project = results.find((result) => result.type === 'project') as SearchResult | undefined
    const article = results.find((result) => result.type === 'article') as SearchResult | undefined
    const moodboard = results.find((result) => result.type === 'moodboard') as SearchResult | undefined

    assert.equal(project?.id, projectId)
    assert.equal(project?.route, `/dashboard?projectId=${projectId}`)
    assert.equal(project?.updatedAt, '2026-08-28 10:00:00')
    assert.equal(article?.id, articleId)
    assert.equal(article?.route, `/writing?articleId=${articleId}`)
    assert.equal(article?.updatedAt, '2026-08-28 09:00:00')
    assert.equal(moodboard?.id, moodboardId)
    assert.equal(moodboard?.route, `/writing?moodboardId=${moodboardId}`)
    assert.equal(moodboard?.updatedAt, '2026-08-28 08:00:00')
    assert.deepEqual(results.map((result) => result.type), ['project', 'article', 'moodboard'])
  } finally {
    db.close()
  }
})

test('returns no database results for blank or short search terms', () => {
  const db = createDatabase()
  try {
    assert.deepEqual(searchAll(db, ''), [])
    assert.deepEqual(searchAll(db, 'a'), [])
  } finally {
    db.close()
  }
})

test('searches research materials and routes to the research library', () => {
  const db = createDatabase()
  try {
    const materialId = Number(db.prepare(
      "INSERT INTO research_materials (title, excerpt, tags) VALUES ('Durable notes', 'Keep source context close to the work.', '[\"writing\"]')",
    ).run().lastInsertRowid)

    const result = searchAll(db, 'Durable').find((item) => item.type === 'research_material')

    assert.equal(result?.id, materialId)
    assert.equal(result?.route, `/writing?researchMaterialId=${materialId}`)
    assert.equal(result?.subtitle, '手动素材')
  } finally {
    db.close()
  }
})
