import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { ActivityLogRepository } from '../database/repositories/activity-log-repository'

function getRepo(): ActivityLogRepository {
  return new ActivityLogRepository(getDatabase())
}

export function registerActivityIpcHandlers(): void {
  ipcMain.handle('activity:getRecent', (_event, limit?: unknown) => {
    try {
      const requestedLimit = typeof limit === 'number' && Number.isFinite(limit) ? limit : 28
      return { success: true, data: getRepo().getRecentDays(requestedLimit) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Activity data unavailable' }
    }
  })
}
