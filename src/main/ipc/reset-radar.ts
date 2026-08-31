import { ipcMain } from 'electron'
import {
  getChatGPTAccountStatus,
  getResetRadarHistory,
  getResetRadarSnapshot,
  ingestChatGPTAccountUsage,
} from '../services/reset-radar/reset-radar-service'

export function registerResetRadarIpcHandlers(): void {
  ipcMain.handle('reset-radar:getSnapshot', async (_event, options?: unknown) => {
    const forceRefresh = Boolean(options && typeof options === 'object' && (options as { forceRefresh?: unknown }).forceRefresh === true)
    try {
      return { success: true, data: await getResetRadarSnapshot(forceRefresh) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Reset radar unavailable' }
    }
  })

  ipcMain.handle('reset-radar:getAccountStatus', async () => {
    return { success: true, data: await getChatGPTAccountStatus(true) }
  })

  ipcMain.handle('reset-radar:getHistory', (_event, limit?: unknown) => {
    const requestedLimit = typeof limit === 'number' && Number.isFinite(limit) ? limit : 20
    return { success: true, data: getResetRadarHistory(requestedLimit) }
  })

  ipcMain.handle('reset-radar:updateAccountUsage', (_event, payload?: unknown) => {
    try {
      const data = payload && typeof payload === 'object'
        ? payload as { usage?: unknown; credits?: unknown; subscription?: unknown; session?: unknown }
        : {}
      const snapshot = ingestChatGPTAccountUsage(data.usage, data.credits, data.subscription, data.session)
      if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
        console.info('[Reset Radar] ChatGPT identity sync', {
          hasEmail: Boolean(snapshot.account.email),
          hasName: Boolean(snapshot.account.name),
        })
      }
      return { success: true, data: snapshot }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'ChatGPT usage unavailable' }
    }
  })
}
