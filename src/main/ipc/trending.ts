import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { SocialTrendingRepository } from '../database/repositories/social-trending-repository'
import { SocialTrendingService } from '../services/trending/social-trending-service'
import type { TrendingPeriod, TrendingPlatform } from '../../shared/social-trending'

const TRENDING_CHANNELS = {
  GET_DASHBOARD: 'trending:getDashboard',
  REFRESH: 'trending:refresh',
  REFRESH_ALL: 'trending:refreshAll',
  DOCTOR: 'trending:doctor',
} as const

let scheduler: NodeJS.Timeout | null = null

function getService(): SocialTrendingService {
  return new SocialTrendingService(new SocialTrendingRepository(getDatabase()))
}

export function registerTrendingIpcHandlers(): void {
  ipcMain.handle(
    TRENDING_CHANNELS.GET_DASHBOARD,
    async (_event, options?: { period?: TrendingPeriod; limit?: number; forceRefresh?: boolean; platforms?: TrendingPlatform[] }) => {
      try {
        const data = await getService().getDashboard({
          period: options?.period ?? 'day',
          limit: options?.limit ?? 10,
          forceRefresh: options?.forceRefresh ?? false,
          platforms: options?.platforms,
        })
        return { success: true, data }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  )

  ipcMain.handle(
    TRENDING_CHANNELS.REFRESH,
    async (_event, platform: TrendingPlatform, period: TrendingPeriod = 'day', limit = 10) => {
      try {
        return { success: true, data: await getService().refresh(platform, period, limit) }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  )

  ipcMain.handle(TRENDING_CHANNELS.REFRESH_ALL, async (_event, period: TrendingPeriod = 'day', limit = 10) => {
    try {
      return { success: true, data: await getService().refreshAll(period, limit) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(TRENDING_CHANNELS.DOCTOR, async () => {
    try {
      return { success: true, data: await getService().doctor() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}

export function startTrendingRefreshScheduler(): void {
  if (scheduler) return
  const refresh = async () => {
    try {
      await getService().getDashboard({ period: 'day', limit: 10, forceRefresh: false })
    } catch (err) {
      console.warn('[Trending] Scheduled refresh failed:', (err as Error).message)
    }
  }

  setTimeout(refresh, 10_000)
  scheduler = setInterval(refresh, 30 * 60_000)
}

export function stopTrendingRefreshScheduler(): void {
  if (!scheduler) return
  clearInterval(scheduler)
  scheduler = null
}
