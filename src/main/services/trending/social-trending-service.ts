import type {
  TrendingDashboard,
  TrendingItem,
  TrendingPeriod,
  TrendingPlatform,
  TrendingProviderHealth,
  TrendingRefreshResult,
} from '../../../shared/social-trending'
import {
  TRENDING_PLATFORMS,
  getTrendingPeriodTtlMinutes,
} from '../../../shared/social-trending'
import { SocialTrendingRepository } from '../../database/repositories/social-trending-repository'
import type { TrendingProvider } from './providers/types'
import { createTrendingProviders } from './providers'
import { nowHealth } from './providers/utils'

interface GetDashboardOptions {
  period: TrendingPeriod
  limit?: number
  forceRefresh?: boolean
  platforms?: TrendingPlatform[]
}

export class SocialTrendingService {
  private readonly repo: SocialTrendingRepository
  private readonly providers: Map<TrendingPlatform, TrendingProvider>

  constructor(repo: SocialTrendingRepository, providers = createTrendingProviders()) {
    this.repo = repo
    this.providers = new Map(providers.map((provider) => [provider.platform, provider]))
  }

  async getDashboard(options: GetDashboardOptions): Promise<TrendingDashboard> {
    const platforms = options.platforms ?? [...TRENDING_PLATFORMS]
    const limit = Math.max(options.limit ?? 10, 10)

    await Promise.all(
      platforms.map((platform) => this.refreshIfNeeded(platform, options.period, limit, Boolean(options.forceRefresh))),
    )

    const columns = await Promise.all(
      platforms.map(async (platform) => {
        const provider = this.providers.get(platform)
        const state = this.repo.getRefreshState(platform, options.period)
        const health = state
          ? {
            platform,
            status: state.status,
            message: state.message,
            activeBackend: state.activeBackend,
            checkedAt: state.lastFetchedAt ?? new Date().toISOString(),
            backends: provider?.backends ?? [],
          } satisfies TrendingProviderHealth
          : provider
            ? await provider.check()
            : nowHealth(platform, [], 'off', 'No provider registered.')
        return {
          platform,
          items: this.repo.getItems(platform, options.period, limit),
          health,
          refreshedAt: state?.lastFetchedAt,
        }
      }),
    )

    return {
      period: options.period,
      columns,
      generatedAt: new Date().toISOString(),
    }
  }

  async refresh(platform: TrendingPlatform, period: TrendingPeriod, limit = 10): Promise<TrendingRefreshResult> {
    const provider = this.providers.get(platform)
    const fetchedAt = new Date().toISOString()
    const expiresAt = new Date(Date.now() + getTrendingPeriodTtlMinutes(period) * 60_000).toISOString()

    if (!provider) {
      const result: TrendingRefreshResult = {
        platform,
        period,
        status: 'off',
        updated: 0,
        message: 'No provider registered.',
        fetchedAt,
      }
      this.saveState(result, expiresAt)
      return result
    }

    try {
      const response = await provider.fetchTrending({
        period,
        limit: Math.max(limit, 10),
        fetchedAt,
        expiresAt,
      })
      const items = normalizeItems(response.items, platform, period, Math.max(limit, 10))
      this.repo.replacePlatformPeriodItems(platform, period, items)
      const result: TrendingRefreshResult = {
        platform,
        period,
        status: response.activeBackend === 'fixture' ? 'warn' : 'ok',
        updated: items.length,
        message: response.message,
        activeBackend: response.activeBackend,
        fetchedAt,
      }
      this.saveState(result, expiresAt)
      return result
    } catch (err) {
      const cachedCount = this.repo.getItems(platform, period, Math.max(limit, 10)).length
      const result: TrendingRefreshResult = {
        platform,
        period,
        status: cachedCount > 0 ? 'warn' : 'error',
        updated: 0,
        message: `${(err as Error).message}${cachedCount > 0 ? ' Showing cached data.' : ''}`,
        fetchedAt,
      }
      this.saveState(result, expiresAt)
      return result
    }
  }

  async refreshAll(period: TrendingPeriod, limit = 10): Promise<TrendingRefreshResult[]> {
    const results: TrendingRefreshResult[] = []
    for (const platform of TRENDING_PLATFORMS) {
      results.push(await this.refresh(platform, period, limit))
    }
    return results
  }

  async doctor(): Promise<TrendingProviderHealth[]> {
    const providers = [...this.providers.values()]
    return Promise.all(providers.map((provider) => provider.check()))
  }

  private async refreshIfNeeded(platform: TrendingPlatform, period: TrendingPeriod, limit: number, forceRefresh: boolean): Promise<void> {
    if (!forceRefresh && this.repo.getFreshItemCount(platform, period) >= limit) {
      const cachedItems = this.repo.getItems(platform, period, limit)
      if (!hasLowQualityCachedItems(platform, cachedItems, limit)) return
    }
    await this.refresh(platform, period, limit)
  }

  private saveState(result: TrendingRefreshResult, expiresAt: string): void {
    this.repo.upsertRefreshState({
      platform: result.platform,
      period: result.period,
      status: result.status,
      message: result.message,
      activeBackend: result.activeBackend,
      lastFetchedAt: result.fetchedAt,
      nextRefreshAt: expiresAt,
      updatedCount: result.updated,
    })
  }
}

function hasLowQualityCachedItems(platform: TrendingPlatform, items: TrendingItem[], limit: number): boolean {
  if (items.length < limit) return true

  const genericTags = new Set([
    platform,
    platform.toLowerCase(),
    'normal',
    'hot',
    'general',
    'unknown',
    '小红书',
    '抖音',
    'product hunt',
    'producthunt',
    'v2ex',
    'linux.do',
    '热搜',
    '热点',
    '高热',
    '新热',
    '推荐',
    '榜单标签',
    '榜单标签1',
    '榜单标签2',
    '榜单标签3',
  ])

  return items.some((item) => {
    const normalizedTags = item.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)
    if (normalizedTags.length === 0) return true
    if (new Set(normalizedTags).size < normalizedTags.length) return true
    return normalizedTags.every((tag) => genericTags.has(tag))
  })
}

function normalizeItems(
  items: TrendingItem[],
  platform: TrendingPlatform,
  period: TrendingPeriod,
  limit: number,
): TrendingItem[] {
  const seen = new Set<string>()
  return items
    .filter((item) => item.platform === platform && item.period === period && item.title && item.url)
    .sort((a, b) => b.heatScore - a.heatScore)
    .filter((item) => {
      const key = item.externalId || item.url
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
}
