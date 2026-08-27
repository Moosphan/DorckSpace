import type {
  TrendingItem,
  TrendingPeriod,
  TrendingPlatform,
  TrendingProviderHealth,
} from '../../../../shared/social-trending'

export interface FetchTrendingOptions {
  period: TrendingPeriod
  limit: number
  fetchedAt: string
  expiresAt: string
}

export interface FetchTrendingResult {
  items: TrendingItem[]
  activeBackend: string
  message: string
}

export interface TrendingProvider {
  platform: TrendingPlatform
  backends: string[]
  check(): Promise<TrendingProviderHealth>
  fetchTrending(options: FetchTrendingOptions): Promise<FetchTrendingResult>
}

export interface BackendConfig {
  rsshubBaseUrl: string
  allowFixtures: boolean
  fetchTimeoutMs: number
  userAgent: string
}
