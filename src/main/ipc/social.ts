import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { SocialRepository } from '../database/repositories/social-repository'

const SOCIAL_CHANNELS = {
  GET_DASHBOARD: 'social:getDashboard',
  GET_ACCOUNTS: 'social:getAccounts',
  ADD_ACCOUNT: 'social:addAccount',
  UPDATE_ACCOUNT: 'social:updateAccount',
  DELETE_ACCOUNT: 'social:deleteAccount',
  ADD_SNAPSHOT: 'social:addSnapshot',
} as const

function getRepo(): SocialRepository {
  return new SocialRepository(getDatabase())
}

export function registerSocialIpcHandlers(): void {
  ipcMain.handle(SOCIAL_CHANNELS.GET_DASHBOARD, () => {
    try {
      return { success: true, data: getRepo().getDashboardData() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(SOCIAL_CHANNELS.GET_ACCOUNTS, () => {
    try {
      return { success: true, data: getRepo().getAccounts() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(SOCIAL_CHANNELS.ADD_ACCOUNT, (_event, data: { platform: string; account_name: string; profile_url?: string }) => {
    try {
      const id = getRepo().upsertAccount(data)
      return { success: true, data: id }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(SOCIAL_CHANNELS.UPDATE_ACCOUNT, (_event, id: number, data: { account_name?: string; profile_url?: string; api_config?: Record<string, unknown> }) => {
    try {
      return { success: true, data: getRepo().updateAccount(id, data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(SOCIAL_CHANNELS.DELETE_ACCOUNT, (_event, id: number) => {
    try {
      return { success: true, data: getRepo().deleteAccount(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(
    SOCIAL_CHANNELS.ADD_SNAPSHOT,
    (_event, accountId: number, metrics: { metric_type: string; metric_value: number; snapshot_date: string }[]) => {
      try {
        getRepo().addMetricsSnapshot(accountId, metrics)
        return { success: true }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  )
}
