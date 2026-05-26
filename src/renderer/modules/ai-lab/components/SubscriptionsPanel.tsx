import { useIpcData } from '@/hooks/useIpc'

interface Subscription {
  id: number
  provider: string
  plan_name: string
  monthly_cost: number | null
  currency: string
  tokens_used: number
  token_limit: number | null
  is_active: number
}

const providerColors: Record<string, string> = {
  openai: 'bg-on-surface',
  anthropic: 'bg-primary',
  google: 'bg-blue-500',
  midjourney: 'bg-purple-600',
}

const providerLabels: Record<string, string> = {
  openai: 'OAI',
  anthropic: 'ANT',
  google: 'GGL',
  midjourney: 'MJ',
}

export function SubscriptionsPanel() {
  const { data: subscriptions, loading } = useIpcData<Subscription[]>('ai:getSubscriptions')

  const activeSubs = subscriptions?.filter((s) => s.is_active) ?? []

  return (
    <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30">
      <div className="flex items-center justify-between mb-md">
        <h3 className="font-headline-sm text-headline-sm">Active Subscriptions</h3>
        <button className="text-primary text-label-md font-bold hover:underline">Manage All</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {[1, 2].map((i) => (
            <div key={i} className="p-md rounded-lg bg-surface-container-low animate-pulse h-20" />
          ))}
        </div>
      ) : activeSubs.length === 0 ? (
        <div className="p-md rounded-lg bg-surface-container-low text-center">
          <p className="text-body-sm text-on-surface-variant">No active subscriptions</p>
          <p className="text-[12px] text-on-surface-variant mt-xs">Add your AI service subscriptions to track usage.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {activeSubs.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between p-md rounded-lg bg-surface-container-lowest border border-outline-variant/50"
            >
              <div className="flex items-center gap-md">
                <div
                  className={`w-10 h-10 rounded-lg ${providerColors[sub.provider] || 'bg-on-surface'} flex items-center justify-center text-on-primary text-[10px] font-bold`}
                >
                  {providerLabels[sub.provider] || sub.provider.slice(0, 3).toUpperCase()}
                </div>
                <div>
                  <p className="font-label-md font-bold">{sub.plan_name}</p>
                  <p className="text-[10px] text-on-surface-variant">{sub.provider}</p>
                </div>
              </div>
              {sub.monthly_cost && (
                <p className="font-mono text-label-md font-bold text-primary">
                  ${sub.monthly_cost}/{sub.currency === 'USD' ? 'mo' : sub.currency}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
