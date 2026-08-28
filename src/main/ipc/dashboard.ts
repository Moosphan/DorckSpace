import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { getDashboardTodayOverview } from '../services/dashboard-overview-service'

export function registerDashboardIpcHandlers(): void {
  ipcMain.handle('dashboard:getTodayOverview', () => {
    try {
      return { success: true, data: getDashboardTodayOverview(getDatabase()) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Dashboard overview unavailable' }
    }
  })
}
