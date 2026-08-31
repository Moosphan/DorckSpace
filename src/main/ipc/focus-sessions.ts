import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { ActivityLogRepository } from '../database/repositories/activity-log-repository'
import { FocusSessionRepository } from '../database/repositories/focus-session-repository'

function getRepository(): FocusSessionRepository {
  return new FocusSessionRepository(getDatabase())
}

export function registerFocusSessionIpcHandlers(): void {
  ipcMain.handle('focus-sessions:getActive', () => {
    try {
      return { success: true, data: getRepository().getActive() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('focus-sessions:start', (_event, taskId: number) => {
    try {
      return { success: true, data: getRepository().start(taskId) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('focus-sessions:stop', (_event, id: number) => {
    try {
      const completed = getRepository().stop(id)
      if (completed.durationMinutes > 0) {
        new ActivityLogRepository(getDatabase()).record({
          date: completed.endedAt!.slice(0, 10),
          activityType: 'focus_session',
          durationMinutes: completed.durationMinutes,
          metadata: { taskId: completed.taskId, sessionId: completed.id },
        })
      }
      return { success: true, data: completed }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('focus-sessions:getByTask', (_event, taskId: number, limit?: number) => {
    try {
      return { success: true, data: getRepository().findByTaskId(taskId, limit) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
