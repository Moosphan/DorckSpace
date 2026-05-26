import { useIpcData } from '@/hooks/useIpc'
import { Progress } from '@/components/ui/progress'

interface Subscription {
  id: number
  tokens_used: number
  token_limit: number | null
  reset_date: string | null
}

export function TokenUsage() {
  const { data: subscriptions } = useIpcData<Subscription[]>('ai:getSubscriptions')

  const totalUsed = subscriptions?.reduce((sum, s) => sum + s.tokens_used, 0) ?? 0
  const totalLimit = subscriptions?.reduce((sum, s) => sum + (s.token_limit ?? 0), 0) ?? 0
  const percentage = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0

  return (
    <div className="col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-md">
          <h3 className="font-headline-sm text-headline-sm">Token Usage</h3>
          <span className="material-symbols-outlined text-on-surface-variant opacity-50">data_usage</span>
        </div>
        <Progress value={percentage} />
        <div className="flex justify-between text-[11px] text-on-surface-variant font-bold mt-sm">
          <span>{totalUsed.toLocaleString()} tokens used</span>
          <span>{totalLimit > 0 ? totalLimit.toLocaleString() : '∞'} limit</span>
        </div>
      </div>
      <div className="pt-md border-t border-outline-variant/30 mt-md">
        <p className="text-[11px] text-on-surface-variant italic">
          {totalLimit > 0 ? `${100 - percentage}% remaining` : 'No limits set'}
        </p>
      </div>
    </div>
  )
}
