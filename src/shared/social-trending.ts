export const TRENDING_PLATFORMS = ['xiaohongshu', 'douyin', 'producthunt', 'v2ex'] as const

export type TrendingPlatform = (typeof TRENDING_PLATFORMS)[number]
export type TrendingPeriod = 'day' | 'week' | 'month'
export type TrendingProviderStatus = 'ok' | 'warn' | 'stale' | 'fixture' | 'off' | 'error'

export interface TrendingPlatformConfig {
  id: TrendingPlatform
  name: string
  shortName: string
  description: string
  icon: string
  accentClass: string
  homepage: string
}

export interface TrendingItem {
  id?: number
  platform: TrendingPlatform
  period: TrendingPeriod
  externalId: string
  title: string
  url: string
  author: string
  publishedAt: string | null
  heatScore: number
  heatLabel: string
  tags: string[]
  category: string
  summary?: string
  rawMetrics: Record<string, number | string | null>
  source: string
  fetchedAt: string
  expiresAt: string
}

export interface TrendingProviderHealth {
  platform: TrendingPlatform
  status: TrendingProviderStatus
  message: string
  activeBackend?: string
  checkedAt: string
  backends: string[]
}

export interface TrendingRefreshResult {
  platform: TrendingPlatform
  period: TrendingPeriod
  status: TrendingProviderStatus
  updated: number
  message: string
  activeBackend?: string
  fetchedAt: string
}

export interface TrendingColumn {
  platform: TrendingPlatform
  items: TrendingItem[]
  health: TrendingProviderHealth
  refreshedAt?: string
}

export interface TrendingDashboard {
  period: TrendingPeriod
  columns: TrendingColumn[]
  generatedAt: string
}

export const TRENDING_PERIODS: { id: TrendingPeriod; label: string; ttlMinutes: number }[] = [
  { id: 'day', label: 'Daily', ttlMinutes: 90 },
  { id: 'week', label: 'Weekly', ttlMinutes: 360 },
  { id: 'month', label: 'Monthly', ttlMinutes: 720 },
]

export const TRENDING_PLATFORM_CONFIGS: Record<TrendingPlatform, TrendingPlatformConfig> = {
  xiaohongshu: {
    id: 'xiaohongshu',
    name: '小红书',
    shortName: 'XHS',
    description: 'Indie maker notes',
    icon: 'local_fire_department',
    accentClass: 'bg-primary text-on-primary',
    homepage: 'https://www.xiaohongshu.com',
  },
  douyin: {
    id: 'douyin',
    name: '抖音',
    shortName: 'Douyin',
    description: 'Indie maker hot search',
    icon: 'play_circle',
    accentClass: 'bg-secondary-container text-on-secondary-container',
    homepage: 'https://www.douyin.com',
  },
  producthunt: {
    id: 'producthunt',
    name: 'Product Hunt',
    shortName: 'PH',
    description: 'New product launches',
    icon: 'rocket_launch',
    accentClass: 'bg-tertiary-container text-on-tertiary-container',
    homepage: 'https://www.producthunt.com',
  },
  v2ex: {
    id: 'v2ex',
    name: 'V2EX',
    shortName: 'V2EX',
    description: 'Indie developer discussions',
    icon: 'forum',
    accentClass: 'bg-surface-container-highest text-on-surface',
    homepage: 'https://www.v2ex.com',
  },
}

export function getTrendingPeriodTtlMinutes(period: TrendingPeriod): number {
  return TRENDING_PERIODS.find((item) => item.id === period)?.ttlMinutes ?? 180
}

export function formatTrendingHeat(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1_000)}k`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return Math.round(value).toLocaleString()
}
