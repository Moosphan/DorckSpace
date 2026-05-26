import { ipcMain, Notification } from 'electron'

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  silent?: boolean
}

function sendNotification(options: NotificationOptions): void {
  if (!Notification.isSupported()) return

  const notification = new Notification({
    title: options.title,
    body: options.body,
    silent: options.silent ?? false,
  })

  notification.show()
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
