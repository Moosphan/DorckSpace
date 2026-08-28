import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { runMigrations } from '../src/main/database/migrations'
import { ContentVariantRepository } from '../src/main/database/repositories/content-variant-repository'

test('keeps one editable version per article and platform', () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const articleId = Number(db.prepare("INSERT INTO articles (title, content) VALUES ('Launch notes', 'Original article')").run().lastInsertRowid)
    const repository = new ContentVariantRepository(db)

    const firstId = repository.upsertVariant({ articleId, platform: 'juejin', title: 'Launch notes', content: 'First version' })
    const updatedId = repository.upsertVariant({ articleId, platform: 'juejin', title: 'Launch notes', content: 'Refined version' })
    const variants = repository.findByArticleId(articleId)

    assert.equal(updatedId, firstId)
    assert.deepEqual(variants, [{
      id: firstId,
      articleId,
      platform: 'juejin',
      title: 'Launch notes',
      content: 'Refined version',
    }])
  } finally {
    db.close()
  }
})

test('records copied content as prepared and publishes only after a real URL is confirmed', () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const articleId = Number(db.prepare("INSERT INTO articles (title) VALUES ('Launch notes')").run().lastInsertRowid)
    const repository = new ContentVariantRepository(db)
    const variantId = repository.upsertVariant({ articleId, platform: 'wechat', title: 'Launch notes', content: '<p>Version</p>' })

    const receiptId = repository.createPreparedReceipt({ articleId, platform: 'wechat', variantId })
    const prepared = repository.findReceiptById(receiptId)
    const published = repository.markReceiptPublished(receiptId, 'https://mp.weixin.qq.com/s/example')

    assert.equal(prepared?.status, 'prepared')
    assert.equal(prepared?.destinationUrl, null)
    assert.equal(published?.status, 'published')
    assert.equal(published?.destinationUrl, 'https://mp.weixin.qq.com/s/example')
    assert.ok(published?.publishedAt)
  } finally {
    db.close()
  }
})
