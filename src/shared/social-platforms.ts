export interface SocialPlatformConfig {
  name: string
  icon: string
  iconType: 'material' | 'text'
  color: string
  profileUrlPrefix: string
  primaryMetric: string
  primaryLabel: string
  secondaryMetrics: { key: string; label: string }[]
}

export const SOCIAL_PLATFORMS: Record<string, SocialPlatformConfig> = {
  bilibili: {
    name: 'Bilibili',
    icon: 'B',
    iconType: 'text',
    color: 'bg-[#FB7299]',
    profileUrlPrefix: 'https://space.bilibili.com/',
    primaryMetric: 'followers',
    primaryLabel: 'Followers',
    secondaryMetrics: [
      { key: 'videos', label: 'Videos' },
      { key: 'views', label: 'Views' },
    ],
  },
  youtube: {
    name: 'YouTube',
    icon: 'play_arrow',
    iconType: 'material',
    color: 'bg-[#FF0000]',
    profileUrlPrefix: 'https://www.youtube.com/@',
    primaryMetric: 'subscribers',
    primaryLabel: 'Subscribers',
    secondaryMetrics: [
      { key: 'avg_watch', label: 'Avg Watch' },
      { key: 'revenue', label: 'Revenue' },
    ],
  },
  xiaohongshu: {
    name: 'Xiaohongshu',
    icon: 'X',
    iconType: 'text',
    color: 'bg-[#FE2C55]',
    profileUrlPrefix: 'https://www.xiaohongshu.com/user/profile/',
    primaryMetric: 'followers',
    primaryLabel: 'Followers',
    secondaryMetrics: [
      { key: 'likes', label: 'Likes' },
      { key: 'favorites', label: 'Favorites' },
      { key: 'shares', label: 'Shares' },
      { key: 'views', label: 'Views' },
    ],
  },
}

export function formatMetricValue(value: number, key?: string): string {
  if (key === 'avg_watch') {
    const min = Math.floor(value / 60)
    const sec = value % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }
  if (key === 'revenue') return `$${value.toLocaleString()}`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return value.toString()
}

export function formatChange(current: number, previous: number): string {
  if (!previous) return '0%'
  const pct = ((current - previous) / previous) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}
