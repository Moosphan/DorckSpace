import type Database from 'better-sqlite3'
import type { NotificationCenterMessage } from '../../../shared/notification-center'

interface NotificationCenterMessageRow {
  id: number
  notification_key: string
  title: string
  body: string
  route: string | null
  created_at: string
  read_at: string | null
}

export interface CreateNotificationCenterMessageInput {
  key: string
  title: string
  body: string
  route: string | null
  createdAt: string
}

function toMessage(row: NotificationCenterMessageRow): NotificationCenterMessage {
  return {
    id: row.id,
    key: row.notification_key,
    title: row.title,
    body: row.body,
    route: row.route,
    createdAt: row.created_at,
    readAt: row.read_at,
  }
}

export class NotificationCenterRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateNotificationCenterMessageInput): NotificationCenterMessage | null {
    const result = this.db.prepare(
      `INSERT INTO notification_center_messages (notification_key, title, body, route, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(notification_key) DO NOTHING`,
    ).run(input.key, input.title, input.body, input.route, input.createdAt)
    if (result.changes === 0) return null

    return {
      id: Number(result.lastInsertRowid),
      key: input.key,
      title: input.title,
      body: input.body,
      route: input.route,
      createdAt: input.createdAt,
      readAt: null,
    }
  }

  listUnread(limit = 50): NotificationCenterMessage[] {
    const rows = this.db.prepare(
      `SELECT id, notification_key, title, body, route, created_at, read_at
       FROM notification_center_messages
       WHERE read_at IS NULL
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
    ).all(Math.max(1, Math.min(limit, 100))) as NotificationCenterMessageRow[]
    return rows.map(toMessage)
  }

  getUnreadCount(): number {
    const row = this.db.prepare(
      'SELECT COUNT(*) AS count FROM notification_center_messages WHERE read_at IS NULL',
    ).get() as { count: number }
    return row.count
  }

  markRead(id: number, readAt = new Date().toISOString()): boolean {
    const result = this.db.prepare(
      'UPDATE notification_center_messages SET read_at = ? WHERE id = ? AND read_at IS NULL',
    ).run(readAt, id)
    return result.changes > 0
  }

  markAllRead(readAt = new Date().toISOString()): number {
    return this.db.prepare(
      'UPDATE notification_center_messages SET read_at = ? WHERE read_at IS NULL',
    ).run(readAt).changes
  }
}
