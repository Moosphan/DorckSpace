import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { runMigrations } from '../src/main/database/migrations'
import { ResearchMaterialRepository } from '../src/main/database/repositories/research-material-repository'

test('converts an RSS article into one linked research material', () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const projectId = Number(db.prepare("INSERT INTO projects (name) VALUES ('HulkDash')").run().lastInsertRowid)
    const articleId = Number(db.prepare("INSERT INTO articles (title) VALUES ('Launch plan')").run().lastInsertRowid)
    const feedId = Number(db.prepare("INSERT INTO rss_feeds (title, url) VALUES ('Indie Feed', 'https://example.com/feed')").run().lastInsertRowid)
    const rssArticleId = Number(db.prepare(
      "INSERT INTO rss_articles (feed_id, title, url, summary, author) VALUES (?, 'Build a durable workspace', 'https://example.com/post', 'A practical guide.', 'Ada')",
    ).run(feedId).lastInsertRowid)

    const repo = new ResearchMaterialRepository(db)
    const materialId = repo.createFromRssArticle(rssArticleId, { projectId, articleId })
    const duplicateId = repo.createFromRssArticle(rssArticleId, { projectId, articleId })
    const materials = repo.findAll()

    assert.equal(duplicateId, materialId)
    assert.equal(materials.length, 1)
    assert.deepEqual(materials[0], {
      id: materialId,
      sourceType: 'rss_article',
      sourceId: rssArticleId,
      title: 'Build a durable workspace',
      excerpt: 'A practical guide.',
      url: 'https://example.com/post',
      author: 'Ada',
      projectId,
      projectName: 'HulkDash',
      articleId,
      articleTitle: 'Launch plan',
      tags: [],
    })
  } finally {
    db.close()
  }
})

test('converts a highlight into a material with its note as the excerpt', () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const feedId = Number(db.prepare("INSERT INTO rss_feeds (title, url) VALUES ('Indie Feed', 'https://example.com/feed')").run().lastInsertRowid)
    const rssArticleId = Number(db.prepare(
      "INSERT INTO rss_articles (feed_id, title, url, author) VALUES (?, 'A source article', 'https://example.com/post', 'Ada')",
    ).run(feedId).lastInsertRowid)
    const highlightId = Number(db.prepare(
      "INSERT INTO article_highlights (article_id, selected_text, note) VALUES (?, 'Useful insight', 'Apply this to HulkDash')",
    ).run(rssArticleId).lastInsertRowid)

    const repo = new ResearchMaterialRepository(db)
    repo.createFromHighlight(highlightId)

    assert.deepEqual(repo.findAll()[0], {
      id: 1,
      sourceType: 'highlight',
      sourceId: highlightId,
      title: 'Useful insight',
      excerpt: 'Apply this to HulkDash',
      url: 'https://example.com/post',
      author: 'Ada',
      projectId: null,
      projectName: null,
      articleId: null,
      articleTitle: null,
      tags: [],
    })
  } finally {
    db.close()
  }
})

test('creates a manual material without a source identifier', () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const repo = new ResearchMaterialRepository(db)
    const materialId = repo.createManual({
      title: 'Interview question',
      excerpt: 'Validate the problem before building.',
      tags: ['product', 'research'],
    })

    assert.deepEqual(repo.findAll()[0], {
      id: materialId,
      sourceType: null,
      sourceId: null,
      title: 'Interview question',
      excerpt: 'Validate the problem before building.',
      url: null,
      author: null,
      projectId: null,
      projectName: null,
      articleId: null,
      articleTitle: null,
      tags: ['product', 'research'],
    })
  } finally {
    db.close()
  }
})
