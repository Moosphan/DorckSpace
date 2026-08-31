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

test('stores daily metrics only for published receipts and calculates review deltas from content snapshots', () => {
  const db = new Database(':memory:')
  runMigrations(db)
  try {
    const articleId = Number(db.prepare("INSERT INTO articles (title) VALUES ('Launch notes')").run().lastInsertRowid)
    const repository = new ContentVariantRepository(db)
    const variantId = repository.upsertVariant({ articleId, platform: 'juejin', title: 'Launch notes', content: 'Version' })
    const receiptId = repository.createPreparedReceipt({ articleId, platform: 'juejin', variantId })

    assert.throws(() => repository.upsertMetrics({ receiptId, views: 100, likes: 10, comments: 2, shares: 1, favorites: 3, snapshotDate: '2026-08-28' }), /must be published/)

    repository.markReceiptPublished(receiptId, 'https://juejin.cn/post/example')
    repository.upsertMetrics({ receiptId, views: 100, likes: 10, comments: 2, shares: 1, favorites: 3, snapshotDate: '2026-08-28' })
    repository.upsertMetrics({ receiptId, views: 160, likes: 16, comments: 4, shares: 2, favorites: 5, snapshotDate: '2026-08-29' })
    repository.upsertMetrics({ receiptId, views: 170, likes: 17, comments: 4, shares: 2, favorites: 5, snapshotDate: '2026-08-29' })

    assert.deepEqual(repository.getArticleReview(articleId), [{
      receiptId,
      platform: 'juejin',
      destinationUrl: 'https://juejin.cn/post/example',
      publishedAt: repository.findReceiptById(receiptId)?.publishedAt ?? null,
      latest: { snapshotDate: '2026-08-29', views: 170, likes: 17, comments: 4, shares: 2, favorites: 5, engagement: 28 },
      previous: { snapshotDate: '2026-08-28', views: 100, likes: 10, comments: 2, shares: 1, favorites: 3, engagement: 16 },
      engagementDelta: 12,
      viewsDelta: 70,
    }])
  } finally {
    db.close()
  }
})
