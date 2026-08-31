import assert from 'node:assert/strict'
import test from 'node:test'
import Database from 'better-sqlite3'
import { NotificationCenterRepository } from '../src/main/database/repositories/notification-center-repository'

function createRepository(): NotificationCenterRepository {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE notification_center_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      route TEXT,
      created_at DATETIME NOT NULL,
      read_at DATETIME
    );
  `)
  return new NotificationCenterRepository(db)
}

test('stores a new message once and retains it as unread', () => {
  const repository = createRepository()
  const message = repository.create({
    key: 'task-due:42:2026-08-31',
    title: '有待处理的到期任务',
    body: '补齐消息中心',
    route: '/dashboard?taskId=42',
    createdAt: '2026-08-31T09:00:00.000Z',
  })

  assert.equal(message.id, 1)
  assert.equal(message.readAt, null)
  assert.equal(repository.getUnreadCount(), 1)
})

test('does not recreate a message with the same notification key', () => {
  const repository = createRepository()
  const input = {
    key: 'reset-radar:signal-1',
    title: 'AI Reset Radar 检测到高置信信号',
    body: '官方公告',
    route: '/ai-lab?panel=reset-radar',
    createdAt: '2026-08-31T09:00:00.000Z',
  }

  assert.equal(repository.create(input).id, 1)
  assert.equal(repository.create({ ...input, createdAt: '2026-08-31T10:00:00.000Z' }), null)
  assert.equal(repository.listUnread().length, 1)
})

test('marks one message read without clearing the rest', () => {
  const repository = createRepository()
  repository.create({ key: 'rss:1', title: 'RSS 有新文章', body: '新增 1 篇', route: '/insights', createdAt: '2026-08-31T09:00:00.000Z' })
  repository.create({ key: 'rss:2', title: 'RSS 有新文章', body: '新增 2 篇', route: '/insights', createdAt: '2026-08-31T10:00:00.000Z' })

  assert.equal(repository.markRead(1, '2026-08-31T10:30:00.000Z'), true)
  assert.equal(repository.getUnreadCount(), 1)
  assert.equal(repository.listUnread()[0].id, 2)
})
