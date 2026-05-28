import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { usePanelRefresh } from '@/hooks/usePanelRefresh'
import { cn } from '@/lib/utils'
import { SOCIAL_PLATFORMS, formatMetricValue, formatChange, type SocialPlatformConfig } from '@shared/social-platforms'

interface AccountData {
  id: number
  platform: string
  account_name: string
  profile_url: string | null
  api_config: { nickname?: string; avatar?: string; logo?: string }
  metrics: Record<string, number>
  prevMetrics: Record<string, number>
  trend: Record<string, { date: string; value: number }[]>
}

function generateSparklinePath(points: { date: string; value: number }[]): string {
  if (points.length < 2) return 'M0,15 L100,15'
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = 100 / (values.length - 1)

  return values
    .map((v, i) => {
      const x = i * step
      const y = 28 - ((v - min) / range) * 24
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')
}

function PlatformLogo({ platform, className }: { platform: string; className?: string }) {
  if (platform === 'bilibili') {
    return (
      <svg className={className} viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#FB7299"/>
        <path d="M33.5 14h1.5c1.2 0 2.2.4 3 1.2.8.8 1.2 1.8 1.2 3v8c0 1.2-.4 2.2-1.2 3-.8.8-1.8 1.2-3 1.2H13.5c-1.2 0-2.2-.4-3-1.2-.8-.8-1.2-1.8-1.2-3v-8c0-1.2.4-2.2 1.2-3 .8-.8 1.8-1.2 3-1.2H16l-1.5-1.5c-.4-.4-.6-.9-.6-1.5 0-.6.2-1.1.6-1.5.4-.4.9-.6 1.5-.6.6 0 1.1.2 1.5.6L21 14h6l3.5-3.5c.4-.4.9-.6 1.5-.6.6 0 1.1.2 1.5.6.4.4.6.9.6 1.5 0 .6-.2 1.1-.6 1.5L33.5 14zM16 18c-.6 0-1 .2-1.4.6-.4.4-.6.8-.6 1.4v2c0 .6.2 1 .6 1.4.4.4.8.6 1.4.6s1-.2 1.4-.6c.4-.4.6-.8.6-1.4v-2c0-.6-.2-1-.6-1.4-.4-.4-.8-.6-1.4-.6zm16 0c-.6 0-1 .2-1.4.6-.4.4-.6.8-.6 1.4v2c0 .6.2 1 .6 1.4.4.4.8.6 1.4.6s1-.2 1.4-.6c.4-.4.6-.8.6-1.4v-2c0-.6-.2-1-.6-1.4-.4-.4-.8-.6-1.4-.6z" fill="white"/>
      </svg>
    )
  }
  if (platform === 'youtube') {
    return (
      <svg className={className} viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#FF0000"/>
        <path d="M38.3 14.7a4.5 4.5 0 0 0-3.2-3.2C32.7 11 24 11 24 11s-8.7 0-11.1.5a4.5 4.5 0 0 0-3.2 3.2C9 17.1 9 24 9 24s0 6.9.7 9.3a4.5 4.5 0 0 0 3.2 3.2c2.4.5 11.1.5 11.1.5s8.7 0 11.1-.5a4.5 4.5 0 0 0 3.2-3.2c.7-2.4.7-9.3.7-9.3s0-6.9-.7-9.3zM20.5 30.5V17.5L31 24l-10.5 6.5z" fill="white"/>
      </svg>
    )
  }
  if (platform === 'xiaohongshu') {
    return (
      <svg className={className} viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#FE2C55"/>
        <path d="M30 12H18c-1.1 0-2 .9-2 2v20c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V14c0-1.1-.9-2-2-2zm-6 18c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-8H18v-4h12v4z" fill="white"/>
      </svg>
    )
  }
  return null
}

function buildProfileUrl(account: AccountData, config: SocialPlatformConfig): string {
  if (account.profile_url) return account.profile_url
  return config.profileUrlPrefix + account.account_name
}

function PlatformCard({ account, config }: { account: AccountData; config: SocialPlatformConfig }) {
  const primaryValue = account.metrics[config.primaryMetric] ?? 0
  const prevPrimary = account.prevMetrics[config.primaryMetric] ?? 0
  const trendData = account.trend[config.primaryMetric] ?? []
  const sparklinePath = generateSparklinePath(trendData)
  const displayName = account.api_config?.nickname || account.account_name
  const avatarUrl = account.api_config?.avatar
  const logoUrl = account.api_config?.logo
  const profileUrl = buildProfileUrl(account, config)
  const gridCols = config.secondaryMetrics.length > 4 ? 'grid-cols-3' : 'grid-cols-2'

  const handleOpenProfile = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.electronAPI.openExternal(profileUrl)
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/30">
      <div className="flex justify-between items-start mb-md">
        <div className="flex items-center gap-sm">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm bg-surface-container">
              {logoUrl ? (
                <img src={logoUrl} alt={config.name} className="w-full h-full object-cover" />
              ) : (
                <PlatformLogo platform={account.platform} className="w-full h-full" />
              )}
            </div>
          )}
          <div>
            <p className="font-bold text-body-sm">{config.name}</p>
            <p className="text-[11px] text-on-surface-variant truncate max-w-[140px]">{displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-xs">
          <span className="text-secondary font-bold text-body-sm bg-secondary/10 px-sm py-xs rounded-full">
            {formatChange(primaryValue, prevPrimary)}
          </span>
          <button
            onClick={handleOpenProfile}
            className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
            title="Open profile"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </button>
        </div>
      </div>

      <div className="mb-md">
        <p className="text-on-surface-variant text-[12px] font-medium">{config.primaryLabel}</p>
        <p className="text-headline-lg font-headline-lg text-primary">{formatMetricValue(primaryValue, config.primaryMetric)}</p>
      </div>

      <div className="h-10 w-full mb-md">
        <svg className="w-full h-full" viewBox="0 0 100 30">
          <path
            className="stroke-primary stroke-[2.5] fill-none stroke-linecap-round stroke-linejoin-round"
            d={sparklinePath}
          />
        </svg>
      </div>

      <div className={cn('grid gap-y-sm pt-md border-t border-outline-variant/30', gridCols)}>
        {config.secondaryMetrics.map((stat) => (
          <div key={stat.key}>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-tight font-bold">{stat.label}</p>
            <p className="font-bold text-on-surface text-body-sm">
              {formatMetricValue(account.metrics[stat.key] ?? 0, stat.key)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SocialCards() {
  const { data, loading, refetch } = useIpcData<AccountData[]>('social:getDashboard')
  const { mutate: fetchAll, loading: fetching } = useIpcMutation<{ success: boolean; updated: number }>('social:fetchAll')

  const { refreshing, refresh } = usePanelRefresh({
    autoFetch: true,
    onFetch: async () => {
      await fetchAll()
      refetch()
    },
  })

  return (
    <div className="col-span-12 lg:col-span-4 space-y-md">
      <div className="flex items-center justify-between mb-sm">
        <h2 className="font-headline-lg text-headline-lg leading-none">Social Performance</h2>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors disabled:opacity-50"
          title="Refresh data"
        >
          <span className={cn('material-symbols-outlined text-[18px] translate-y-[1px]', refreshing && 'animate-spin')}>sync</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-md">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/30 animate-pulse h-48" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-xl border border-outline-variant/30 text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-sm block">analytics</span>
          <p className="text-body-md text-on-surface-variant">No social accounts configured</p>
          <p className="text-body-sm text-on-surface-variant mt-xs">Add accounts in Settings</p>
        </div>
      ) : (
        data.map((account) => {
          const config = SOCIAL_PLATFORMS[account.platform]
          if (!config) return null
          return <PlatformCard key={account.id} account={account} config={config} />
        })
      )}
    </div>
  )
}
