import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type {
  TrendingDashboard,
  TrendingItem,
  TrendingPeriod,
  TrendingProviderHealth,
} from '@shared/social-trending'
import {
  TRENDING_PERIODS,
  TRENDING_PLATFORM_CONFIGS,
  formatTrendingHeat,
} from '@shared/social-trending'
import { TrendingUrlViewer } from './TrendingUrlViewer'

interface TrendingModalProps {
  onClose: () => void
  initialPeriod?: TrendingPeriod
}

interface SelectedTrendingItem {
  url: string
  title: string
}

export function TrendingModal({ onClose, initialPeriod = 'day' }: TrendingModalProps) {
  const [period, setPeriod] = useState<TrendingPeriod>(initialPeriod)
  const [dashboard, setDashboard] = useState<TrendingDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState<SelectedTrendingItem | null>(null)

  useEffect(() => {
    setPeriod(initialPeriod)
  }, [initialPeriod])

  const loadDashboard = useCallback(async (nextPeriod: TrendingPeriod, forceRefresh = false) => {
    setError('')
    if (forceRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const response = await window.electronAPI.invoke('trending:getDashboard', {
        period: nextPeriod,
        limit: 10,
        forceRefresh,
      })
      if (response.success) {
        setDashboard(response.data as TrendingDashboard)
      } else {
        setError(response.error ?? 'Failed to load trending data.')
      }
    } catch (err) {
      const message = (err as Error).message
      setError(message.includes('No handler registered for')
        ? 'Trending IPC is not registered in the current Electron main process. Please restart the dev app so the main process can load the latest handlers.'
        : message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard(period)
  }, [loadDashboard, period])

  const handlePeriodChange = (nextPeriod: TrendingPeriod) => {
    setPeriod(nextPeriod)
    setDashboard(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[max(64px,7vh)] pb-[4vh] titlebar-no-drag" onClick={onClose}>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-md" />
      <div
        className="relative flex h-[min(820px,86vh)] w-[min(1280px,94vw)] flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-outline-variant/30 bg-surface-container-lowest px-lg py-md">
          <div className="flex items-center justify-between gap-md">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-xs text-label-sm font-semibold text-primary">
                <span className="material-symbols-outlined text-[18px]">monitoring</span>
                Hot Signals
              </div>
              <h3 className="font-headline-lg text-headline-lg leading-tight text-on-surface">独立开发者趋势雷达</h3>
              <p className="mt-1 text-body-sm text-on-surface-variant">小红书、抖音、Product Hunt、V2EX 的热门内容聚合分析</p>
            </div>
            <div className="flex items-center gap-sm">
              <div className="flex rounded-full border border-outline-variant/30 bg-surface-container-low p-1">
                {TRENDING_PERIODS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handlePeriodChange(item.id)}
                    className={cn(
                      'h-8 rounded-full px-4 text-label-sm font-semibold transition-all',
                      period === item.id
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface',
                    )}
                  >
                    {item.id === 'day' ? '日榜' : item.id === 'week' ? '周榜' : '月榜'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => loadDashboard(period, true)}
                disabled={refreshing}
                className="flex h-9 items-center gap-xs rounded-full border border-outline-variant/30 bg-surface px-4 text-label-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary disabled:opacity-60"
              >
                <span className={cn('material-symbols-outlined text-[18px]', refreshing && 'animate-spin')}>sync</span>
                Refresh
              </button>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden bg-surface-container-low">
          {loading ? (
            <TrendingSkeleton />
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-sm p-xl text-center">
              <span className="material-symbols-outlined text-[48px] text-error">error</span>
              <p className="font-label-lg text-on-surface">Failed to load hot signals</p>
              <p className="max-w-lg text-body-sm text-on-surface-variant">{error}</p>
            </div>
          ) : (
            <div className="grid h-full grid-cols-1 gap-md overflow-y-auto p-md xl:grid-cols-4">
              {dashboard?.columns.map((column) => {
                const config = TRENDING_PLATFORM_CONFIGS[column.platform]
                return (
                  <section
                    key={column.platform}
                    className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-ambient"
                  >
                    <div className="shrink-0 border-b border-outline-variant/25 bg-surface px-md py-sm">
                      <div className="flex items-start justify-between gap-sm">
                        <div className="flex min-w-0 items-center gap-sm">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-low ring-1 ring-outline-variant/30">
                            <PlatformLogo platform={column.platform} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-title-md font-bold text-on-surface">{config.name}</h4>
                            <p className="line-clamp-1 text-[11px] text-on-surface-variant">{config.description}</p>
                          </div>
                        </div>
                        <HealthBadge health={column.health} />
                      </div>
                      <div className="mt-sm flex items-center justify-between border-t border-outline-variant/20 pt-sm text-[11px] font-medium text-on-surface-variant">
                        <span>{column.items.length} 条内容</span>
                        <span>{column.refreshedAt ? `Updated ${formatTime(column.refreshedAt)}` : 'Not refreshed'}</span>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      {column.items.length > 0 ? (
                        <div className="divide-y divide-outline-variant/20">
                          {column.items.map((item, index) => (
                            <TrendingItemCard
                              key={`${item.platform}-${item.externalId}`}
                              item={item}
                              rank={index + 1}
                              onOpen={() => setSelectedItem({ url: item.url, title: item.title })}
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptyColumn health={column.health} homepage={config.homepage} />
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {selectedItem && (
        <TrendingUrlViewer
          url={selectedItem.url}
          title={selectedItem.title}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  )
}

function TrendingItemCard({ item, rank, onOpen }: { item: TrendingItem; rank: number; onOpen: () => void }) {
  const tags = getDisplayTags(item).slice(0, 3)
  return (
    <button
      onClick={onOpen}
      className="group w-full bg-surface-container-lowest px-md py-sm text-left transition-colors hover:bg-primary-fixed/35"
    >
      <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-sm">
        <span className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-black',
          rank <= 3 ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high text-on-surface-variant',
        )}>
          {rank}
        </span>
        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-sm">
            <span className="truncate text-[11px] font-semibold text-on-surface-variant">{item.author || 'Unknown'}</span>
            <span className="shrink-0 text-[10px] text-on-surface-variant/70">{item.publishedAt ? formatDate(item.publishedAt) : 'Unknown'}</span>
          </div>
          <h5 className="line-clamp-2 text-[14px] font-bold leading-snug text-on-surface group-hover:text-primary">
            {item.title}
          </h5>
          {item.summary && item.summary !== item.title && (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-on-surface-variant">{item.summary}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="max-w-[120px] truncate rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
              {item.category}
            </span>
            {tags.map((tag) => (
              <span key={tag} className="max-w-[110px] truncate rounded-full bg-primary-fixed/70 px-2 py-0.5 text-[10px] font-semibold text-primary">
                #{tag}
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-sm">
            <span className="truncate text-[10px] font-medium text-on-surface-variant/75">{sourceLabel(item.source)}</span>
            <span className="shrink-0 rounded-full bg-surface-container-high px-2.5 py-1 text-[12px] font-black text-primary">
              {item.heatLabel || formatTrendingHeat(item.heatScore)}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

function PlatformLogo({ platform }: { platform: TrendingItem['platform'] }) {
  if (platform === 'v2ex') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 48 48" aria-label="V2EX">
        <rect width="48" height="48" rx="12" fill="#eef4ff" />
        <path fill="#2563eb" d="M9 14h6.7l7.2 18.6L30.2 14H37L26.4 38h-7L9 14Z" />
        <path fill="#1f2937" d="M31 28.4c0-4.8 7.8-5.4 7.8-8.4 0-1.3-1.1-2.1-2.8-2.1-1.9 0-3.5.9-5.1 2.4l-2.7-3.2c2.1-2.1 4.9-3.4 8.2-3.4 4.7 0 8 2.4 8 6.1 0 5.1-7.5 5.8-7.6 8.5h-5.8Zm-.3 4.5h6.4V38h-6.4v-5.1Z" />
      </svg>
    )
  }
  if (platform === 'xiaohongshu') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 48 48" aria-label="小红书">
        <rect width="48" height="48" rx="14" fill="#ff2442" />
        <text x="24" y="21" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="900">小红</text>
        <text x="24" y="34" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="900">书</text>
      </svg>
    )
  }
  if (platform === 'douyin') {
    return (
      <svg className="h-7 w-7" viewBox="0 0 48 48" aria-label="Douyin">
        <path fill="#111827" d="M25.8 8h7.1c.4 3.4 2.2 6.4 5.1 8.3 1.5 1 3.1 1.6 5 1.8v7.2c-3.7-.1-7.2-1.2-10.1-3.3v10.3c0 7.6-6.2 13.7-13.8 13.7S5.5 39.9 5.5 32.3s6.2-13.7 13.7-13.7c1.1 0 2.1.1 3.1.4v7.6c-.9-.4-1.9-.7-3.1-.7-3.5 0-6.4 2.9-6.4 6.4s2.9 6.4 6.4 6.4 6.6-2.8 6.6-6.4V8Z" />
        <path fill="#25f4ee" d="M32.9 8c.3 2 .9 3.8 1.9 5.3-2.4-.8-4.3-2.8-5.1-5.3h3.2ZM19.2 22.2c1.1 0 2.2.2 3.1.7v3.7c-.9-.4-1.9-.7-3.1-.7-3.5 0-6.4 2.9-6.4 6.4 0 1.4.5 2.7 1.2 3.8-2.2-1.1-3.8-3.4-3.8-6 0-4.3 4.1-7.9 9-7.9Z" opacity=".9" />
        <path fill="#fe2c55" d="M38 16.3c1.5 1 3.1 1.6 5 1.8v3.7c-3.2-.2-6.3-1.2-8.9-2.9 1.5-.3 2.8-1.2 3.9-2.6Z" opacity=".9" />
      </svg>
    )
  }
  if (platform === 'producthunt') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 48 48" aria-label="Product Hunt">
        <circle cx="24" cy="24" r="22" fill="#da552f" />
        <path fill="#fff" d="M20 14h8.1c5.1 0 8.6 3.3 8.6 8.1s-3.5 8.2-8.6 8.2h-3.7V38H20V14Zm8 11.8c2.4 0 4-1.5 4-3.7s-1.6-3.6-4-3.6h-3.6v7.3H28Z" />
      </svg>
    )
  }
  return null
}

function getDisplayTags(item: TrendingItem): string[] {
  const blocked = new Set([
    item.platform.toLowerCase(),
    'normal',
    'hot',
    'general',
    'unknown',
    '小红书',
    '抖音',
    'product hunt',
    'producthunt',
    'linuxdo',
    'linux.do',
    'v2ex',
    '热搜',
    '热点',
    '高热',
    '新热',
    '推荐',
    '榜单标签',
    '榜单标签1',
    '榜单标签2',
    '榜单标签3',
    'launch',
  ])
  const tags = item.tags
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .filter((tag) => !blocked.has(tag.toLowerCase()))
    .filter((tag, index, arr) => arr.findIndex((item) => item.toLowerCase() === tag.toLowerCase()) === index)

  const inferred = inferDisplayTags(`${item.title} ${item.summary ?? ''} ${item.category}`, item.platform)
  const merged = [...tags, ...inferred]
    .filter((tag) => !blocked.has(tag.toLowerCase()))
    .filter((tag, index, arr) => arr.findIndex((item) => item.toLowerCase() === tag.toLowerCase()) === index)

  return merged.length > 0 ? merged : [item.category || '热门']
}

function inferDisplayTags(text: string, platform: TrendingItem['platform']): string[] {
  const matchers: [RegExp, string][] = [
    [/AI|人工智能|大模型|agent|gpt|llm|模型|机器人|科技|芯片|api|github|代码|开发/iu, '科技'],
    [/电影|剧|综艺|音乐|明星|演唱会|演员|娱乐/u, '娱乐'],
    [/美食|餐厅|咖啡|甜品|吃/u, '美食'],
    [/旅行|出行|酒店|景区|城市|风景/u, '旅行'],
    [/高考|大学|学校|教育|考试|学习/u, '教育'],
    [/股票|基金|财经|房价|经济|创业|增长/u, '商业'],
    [/穿搭|护肤|妆|发型|家居|生活/u, '生活方式'],
    [/设计|figma|image|creative|ui|avatar/iu, '设计'],
    [/productivity|workflow|calendar|task|note|workspace|效率/iu, '效率工具'],
  ]
  const tags = matchers
    .filter(([pattern]) => pattern.test(text))
    .map(([, tag]) => tag)
  if (platform === 'producthunt' && tags.length === 0) tags.push('新品')
  if (platform === 'douyin' && tags.length === 0) tags.push('趋势')
  if (platform === 'xiaohongshu' && tags.length === 0) tags.push('种草')
  if (platform === 'v2ex' && tags.length === 0) tags.push('社区')
  return tags.slice(0, 4)
}

function sourceLabel(source: string): string {
  if (source.startsWith('xiaohongshu')) return '公开发现流'
  if (source.startsWith('douyin')) return '抖音热搜榜'
  if (source.startsWith('producthunt')) return 'Product Hunt Feed'
  if (source.includes('indie-fallback')) return '独立开发主题补齐'
  if (source === 'v2ex:local-fallback') return 'V2EX 本地兜底'
  if (source.startsWith('v2ex')) return 'V2EX 热门'
  return source
}

function HealthBadge({ health }: { health: TrendingProviderHealth }) {
  const style = health.status === 'ok'
    ? 'bg-primary/10 text-primary'
    : health.status === 'warn'
      ? 'bg-secondary-container text-on-secondary-container'
      : health.status === 'fixture'
        ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
        : health.status === 'stale'
          ? 'bg-secondary-container text-on-secondary-container'
      : health.status === 'off'
        ? 'bg-surface-container-high text-on-surface-variant'
        : 'bg-error/10 text-error'
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', style)} title={health.message}>
      {health.status}
    </span>
  )
}

function EmptyColumn({ health, homepage }: { health: TrendingProviderHealth; homepage: string }) {
  return (
    <div className="m-md flex h-[calc(100%-2rem)] flex-col items-center justify-center gap-sm rounded-xl border border-dashed border-outline-variant/40 bg-surface p-md text-center">
      <span className="material-symbols-outlined text-[34px] text-on-surface-variant/40">travel_explore</span>
      <p className="font-label-md text-on-surface">暂无可展示内容</p>
      <p className="line-clamp-4 max-w-[240px] text-body-sm text-on-surface-variant">{friendlyHealthMessage(health)}</p>
      <button
        onClick={() => window.electronAPI.openExternal(homepage)}
        className="mt-xs rounded-full bg-surface-container px-3 py-1 text-label-sm font-semibold text-on-surface-variant hover:text-primary"
      >
        打开平台
      </button>
    </div>
  )
}

function friendlyHealthMessage(health: TrendingProviderHealth): string {
  if (health.status === 'fixture') {
    return '当前没有可用的实时来源，展示的是开发验证数据。'
  }
  if (health.status === 'stale') {
    return '本地缓存已过期，刷新后会重新尝试读取公开来源。'
  }
  if (health.platform === 'v2ex' && health.status === 'error') {
    return 'V2EX 公开接口暂时不可达，刷新后将尝试使用本地独立开发者主题兜底。'
  }
  return health.message || '当前平台暂时没有可用缓存。'
}

function TrendingSkeleton() {
  return (
    <div className="grid h-full grid-cols-1 gap-md p-md xl:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-md">
          <div className="mb-md h-10 w-2/3 animate-pulse rounded-xl bg-surface-container" />
          <div className="space-y-sm">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl bg-surface-container" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
