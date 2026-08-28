import { ipcMain, Notification } from 'electron'
import type Database from 'better-sqlite3'
import { NotificationDeduper } from './provider-health'

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  silent?: boolean
}

const notificationDeduper = new NotificationDeduper()

function sendNotification(options: NotificationOptions): void {
  if (!Notification.isSupported()) return

  const notification = new Notification({
    title: options.title,
    body: options.body,
    silent: options.silent ?? false,
  })

  notification.show()
}

export function sendDedupedNotification(key: string, options: NotificationOptions): boolean {
  if (!notificationDeduper.shouldNotify(key)) return false
  sendNotification(options)
  return true
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
      sendNotification(options)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('notification:check', () => {
    return { success: true, data: Notification.isSupported() }
  })
}

// Export for internal use by other services
export { sendNotification }
