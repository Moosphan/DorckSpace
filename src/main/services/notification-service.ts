import { BrowserWindow, ipcMain, Notification } from 'electron'
import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import { createNotificationNavigationPayload, normalizeNotificationRoute, type NotificationNavigationTarget } from '../../shared/notification-navigation'
import { getDatabase } from '../database/connection'
import { NotificationCenterRepository } from '../database/repositories/notification-center-repository'
import type { NotificationCenterMessage } from '../../shared/notification-center'

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  silent?: boolean
  route?: string
  target?: NotificationNavigationTarget
  key?: string
}

const activeNotifications = new Set<Notification>()

function getRepository(): NotificationCenterRepository {
  return new NotificationCenterRepository(getDatabase())
}

function resolveRoute(options: NotificationOptions): string | null {
  return normalizeNotificationRoute(options.route)
    ?? createNotificationNavigationPayload(options.target)?.route
    ?? null
}

function broadcast(channel: string, payload: unknown): void {
  BrowserWindow.getAllWindows()
    .filter((window) => !window.isDestroyed())
    .forEach((window) => window.webContents.send(channel, payload))
}

function markMessageRead(id: number): boolean {
  const changed = getRepository().markRead(id)
  if (changed) broadcast('notification:center:read', { id })
  return changed
}

function showSystemNotification(message: NotificationCenterMessage, options: NotificationOptions): void {
  if (!Notification.isSupported()) return

  const notification = new Notification({
    title: message.title,
    body: message.body,
    silent: options.silent ?? false,
  })
  activeNotifications.add(notification)

  const releaseNotification = () => {
    activeNotifications.delete(notification)
  }

  if (message.route) {
    notification.on('click', () => {
      releaseNotification()
      markMessageRead(message.id)
      const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
      if (!window || window.isDestroyed()) return
      if (window.isMinimized()) window.restore()
      window.show()
      window.focus()
      window.webContents.send('notification:navigate', { route: message.route })
    })
  }
  notification.on('close', releaseNotification)
  notification.on('failed', releaseNotification)

  notification.show()
}

export function sendDedupedNotification(key: string, options: NotificationOptions): boolean {
  const message = getRepository().create({
    key,
    title: options.title,
    body: options.body,
    route: resolveRoute(options),
    createdAt: new Date().toISOString(),
  })
  if (!message) return false

  broadcast('notification:center:new', message)
  showSystemNotification(message, options)
  return true
}

function sendNotification(options: NotificationOptions): boolean {
  return sendDedupedNotification(options.key ?? `manual:${randomUUID()}`, options)
}

export function notifyDueTasks(db: Database.Database, now = new Date()): number {
  const pad = (value: number) => String(value).padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const tasks = db.prepare(
    `SELECT id, title, due_date FROM tasks
     WHERE due_date IS NOT NULL AND due_date <= ? AND status IN ('pending', 'in_progress')
     ORDER BY due_date ASC LIMIT 50`,
  ).all(date) as Array<{ id: number; title: string; due_date: string }>
  let sent = 0
  for (const task of tasks) {
    if (sendDedupedNotification(`task-due:${task.id}:${task.due_date}`, {
      title: '有待处理的到期任务',
      body: task.title,
      silent: true,
      target: { type: 'task', taskId: task.id },
    })) sent++
  }
  return sent
}

let taskReminderTimer: NodeJS.Timeout | null = null

export function startTaskReminderScheduler(db: Database.Database): void {
  if (taskReminderTimer) return
  notifyDueTasks(db)
  taskReminderTimer = setInterval(() => notifyDueTasks(db), 15 * 60_000)
}

export function stopTaskReminderScheduler(): void {
  if (!taskReminderTimer) return
  clearInterval(taskReminderTimer)
  taskReminderTimer = null
}

export function registerNotificationIpcHandlers(): void {
  ipcMain.handle('notification:send', (_event, options: NotificationOptions) => {
    try {
      return { success: true, data: { created: sendNotification(options) } }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('notification:check', () => {
    return { success: true, data: Notification.isSupported() }
  })

  ipcMain.handle('notification:center:listUnread', () => {
    try {
      return { success: true, data: getRepository().listUnread() }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Notification center unavailable' }
    }
  })

  ipcMain.handle('notification:center:markRead', (_event, id?: unknown) => {
    if (!Number.isInteger(id) || (id as number) <= 0) {
      return { success: false, error: 'Invalid notification id' }
    }
    try {
      return { success: true, data: markMessageRead(id as number) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Notification center unavailable' }
    }
  })

  ipcMain.handle('notification:center:markAllRead', () => {
    try {
      const count = getRepository().markAllRead()
      if (count > 0) broadcast('notification:center:allRead', {})
      return { success: true, data: count }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Notification center unavailable' }
    }
  })
}

// Export for internal use by other services
export { sendNotification }
