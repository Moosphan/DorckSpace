import { useState } from 'react'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface Subscription {
  id: number
  provider: string
  plan_name: string
  base_url: string | null
  api_key: string | null
  monthly_cost: number | null
  currency: string
  billing_date: number | null
  token_limit: number | null
  tokens_used: number
  reset_date: string | null
  is_active: number
  metadata: string
}

function maskApiKey(key: string): string {
  if (!key || key.length <= 8) return key || ''
  return key.slice(0, 4) + '***' + key.slice(-4)
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', color: 'bg-on-surface', abbr: 'OAI', logo: 'https://thesvg.org/icons/openai/light.svg', logoDark: 'https://thesvg.org/icons/openai/dark.svg' },
  { value: 'anthropic', label: 'Anthropic', color: 'bg-primary', abbr: 'ANT', logo: 'https://thesvg.org/icons/claude/default.svg', logoDark: '' },
  { value: 'google', label: 'Google', color: 'bg-blue-500', abbr: 'GGL', logo: 'https://thesvg.org/icons/google/default.svg', logoDark: '' },
  { value: 'deepseek', label: 'DeepSeek', color: 'bg-teal-600', abbr: 'DS', logo: 'https://thesvg.org/icons/deepseek/default.svg', logoDark: '' },
  { value: 'zhipu', label: 'GLM', color: 'bg-indigo-600', abbr: 'GLM', logo: 'https://thesvg.org/icons/zhipu/default.svg', logoDark: '' },
  { value: 'minimax', label: 'MiniMax', color: 'bg-orange-500', abbr: 'MM', logo: 'https://thesvg.org/icons/minimax/default.svg', logoDark: '' },
  { value: 'qwen', label: 'Qwen', color: 'bg-sky-600', abbr: 'QW', logo: 'https://thesvg.org/icons/qwen/light.svg', logoDark: 'https://thesvg.org/icons/qwen/dark.svg' },
  { value: 'mimo', label: 'MiMo', color: 'bg-orange-600', abbr: 'MI', logo: 'https://thesvg.org/icons/xiaomi/default.svg', logoDark: '' },
  { value: 'midjourney', label: 'Midjourney', color: 'bg-purple-600', abbr: 'MJ', logo: 'https://thesvg.org/icons/midjourney/default.svg', logoDark: '' },
  { value: 'other', label: 'Other', color: 'bg-surface-variant', abbr: '...', logo: '', logoDark: '' },
]

const BILLING_CYCLES = [
  { value: 'daily', label: 'Daily', days: 1 },
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 90 },
  { value: 'semiannual', label: 'Semi-Annual', days: 180 },
  { value: 'yearly', label: 'Yearly', days: 365 },
]

function getNextRenewal(startDate: string, cycleDays: number): Date | null {
  if (!startDate || !cycleDays) return null
  const start = new Date(startDate)
  const now = new Date()
  let next = new Date(start)
  while (next <= now) {
    next.setDate(next.getDate() + cycleDays)
  }
  return next
}

function getProvider(value: string): { label: string; color: string; abbr: string; logo: string; logoDark: string } {
  const found = PROVIDERS.find((p) => p.value === value)
  if (found) return found
  // Custom provider
  return { label: value, color: 'bg-surface-variant', abbr: value.slice(0, 3).toUpperCase(), logo: '', logoDark: '' }
}

export function SubscriptionsPanel() {
  const { toast } = useToast()
  const { data: subscriptions, loading, refetch } = useIpcData<Subscription[]>('ai:getAllSubscriptions')
  const { mutate: createSub } = useIpcMutation<number>('ai:createSubscription')
  const { mutate: updateSub } = useIpcMutation<boolean>('ai:updateSubscription')
  const { mutate: deleteSub } = useIpcMutation<boolean>('ai:deleteSubscription')
  const { mutate: resetTokens } = useIpcMutation<boolean>('ai:resetTokens')

  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ provider: 'openai', custom_provider: '', plan_name: '', base_url: '', api_key: '', monthly_cost: '', token_limit: '', billing_cycle: 'monthly', start_date: '' })

  const activeSubs = subscriptions?.filter((s) => s.is_active) ?? []
  const totalCost = activeSubs.reduce((sum, s) => sum + (s.monthly_cost ?? 0), 0)

  const handleOpenCreate = () => {
    const today = new Date().toISOString().split('T')[0]
    setForm({ provider: 'openai', custom_provider: '', plan_name: '', base_url: '', api_key: '', monthly_cost: '', token_limit: '', billing_cycle: 'monthly', start_date: today })
    setEditingId(null)
    setShowDialog(true)
  }

  const handleOpenEdit = (sub: Subscription) => {
    const meta = sub.metadata ? JSON.parse(sub.metadata) : {}
    const isCustom = !PROVIDERS.some((p) => p.value === sub.provider)
    setForm({
      provider: isCustom ? 'other' : sub.provider,
      custom_provider: isCustom ? sub.provider : '',
      plan_name: sub.plan_name,
      base_url: sub.base_url || '',
      api_key: sub.api_key || '',
      monthly_cost: sub.monthly_cost?.toString() ?? '',
      token_limit: sub.token_limit?.toString() ?? '',
      billing_cycle: meta.billing_cycle || 'monthly',
      start_date: meta.start_date || '',
    })
    setEditingId(sub.id)
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.plan_name.trim()) return
    const provider = form.provider === 'other' ? (form.custom_provider.trim() || 'other') : form.provider
    const metadata = JSON.stringify({ billing_cycle: form.billing_cycle, start_date: form.start_date })
    if (editingId) {
      await updateSub(editingId, {
        provider,
        plan_name: form.plan_name.trim(),
        base_url: form.base_url.trim() || null,
        api_key: form.api_key.trim() || null,
        monthly_cost: form.monthly_cost ? Number(form.monthly_cost) : null,
        token_limit: form.token_limit ? Number(form.token_limit) : null,
        metadata,
      })
    } else {
      await createSub({
        provider,
        plan_name: form.plan_name.trim(),
        base_url: form.base_url.trim() || undefined,
        api_key: form.api_key.trim() || undefined,
        monthly_cost: form.monthly_cost ? Number(form.monthly_cost) : undefined,
        token_limit: form.token_limit ? Number(form.token_limit) : undefined,
        metadata,
      })
    }
    setShowDialog(false)
    setEditingId(null)
    await refetch()
  }

  const handleDelete = async (id: number) => {
    await deleteSub(id)
    await refetch()
  }

  const handleReset = async (id: number) => {
    await resetTokens(id)
    await refetch()
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30">
      <div className="flex items-center justify-between mb-md">
        <div>
          <h3 className="font-headline-sm text-headline-sm">Active Subscriptions</h3>
          {totalCost > 0 && (
            <p className="text-[11px] text-on-surface-variant mt-xs">
              Total: <span className="font-bold text-primary">${totalCost.toFixed(2)}</span>/mo
            </p>
          )}
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-xs px-3 py-1.5 bg-primary text-on-primary rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all text-body-sm"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add
        </button>
      </div>

      {loading ? (
        <div className="flex gap-sm overflow-x-auto pb-1">
          {[1, 2].map((i) => (
            <div key={i} className="w-60 shrink-0 p-sm rounded-lg bg-surface-container-low animate-pulse h-20" />
          ))}
        </div>
      ) : activeSubs.length === 0 ? (
        <div className="p-md rounded-lg bg-surface-container-low text-center">
          <p className="text-body-sm text-on-surface-variant">No active subscriptions</p>
          <p className="text-[12px] text-on-surface-variant mt-xs">Add your AI service subscriptions to track usage.</p>
        </div>
      ) : (
        <div className="flex gap-sm overflow-x-auto pb-1">
          {activeSubs.map((sub) => {
            const provider = getProvider(sub.provider)
            const usagePercent = sub.token_limit ? Math.min(Math.round((sub.tokens_used / sub.token_limit) * 100), 100) : 0
            const meta = sub.metadata ? JSON.parse(sub.metadata) : {}
            const cycle = BILLING_CYCLES.find((c) => c.value === meta.billing_cycle)
            const nextRenewal = getNextRenewal(meta.start_date, cycle?.days ?? 30)
            return (
              <div
                key={sub.id}
                className="group w-60 shrink-0 p-sm rounded-lg bg-surface-container-lowest border border-outline-variant/50 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-sm">
                    {provider.logo ? (
                      <div className="w-8 h-8 rounded-lg bg-surface-container-low p-0.5 relative">
                        {provider.logoDark ? (
                          <>
                            <img src={provider.logo} alt={provider.label} className="w-full h-full object-contain dark:hidden" />
                            <img src={provider.logoDark} alt={provider.label} className="w-full h-full object-contain hidden dark:block" />
                          </>
                        ) : (
                          <img src={provider.logo} alt={provider.label} className="w-full h-full object-contain" />
                        )}
                      </div>
                    ) : (
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-on-primary text-[9px] font-bold', provider.color)}>
                        {provider.abbr}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-label-md font-bold text-on-surface truncate">{sub.plan_name}</p>
                      <p className="text-[10px] text-on-surface-variant">{provider.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenEdit(sub)} className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                    </button>
                    <button onClick={() => handleDelete(sub.id)} className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {sub.monthly_cost != null && (
                    <p className="font-mono text-label-md font-bold text-primary">
                      ${sub.monthly_cost}<span className="text-on-surface-variant font-normal text-[10px]">/{cycle?.label?.toLowerCase() || 'mo'}</span>
                    </p>
                  )}
                  {nextRenewal && (
                    <p className="text-[10px] text-on-surface-variant flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">event</span>
                      {nextRenewal.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>

                {sub.token_limit != null && (
                  <div>
                    <Progress value={usagePercent} />
                    <div className="flex justify-between text-[10px] text-on-surface-variant mt-0.5">
                      <span>{sub.tokens_used.toLocaleString()} used</span>
                      <span>{sub.token_limit.toLocaleString()} limit</span>
                    </div>
                  </div>
                )}

                {sub.api_key && (
                  <div className="flex items-center gap-1 pt-1 border-t border-outline-variant/20">
                    <span className="material-symbols-outlined text-[12px] text-on-surface-variant">key</span>
                    <span className="font-mono text-[10px] text-on-surface-variant truncate flex-1">{maskApiKey(sub.api_key)}</span>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(sub.api_key!)
                          toast({ title: 'API key copied', variant: 'success' })
                        } catch { toast({ title: 'Copy failed', variant: 'error' }) }
                      }}
                      className="w-5 h-5 rounded flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                      title="Copy API key"
                    >
                      <span className="material-symbols-outlined text-[12px]">content_copy</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-md" onClick={() => setShowDialog(false)}>
          <div
            className="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-2xl border border-outline-variant/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-md py-3 border-b border-outline-variant/30">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">{editingId ? 'Edit Subscription' : 'Add Subscription'}</h3>
            </div>

            <div className="p-md space-y-md">
              <div className="space-y-xs">
                <label className="font-label-sm text-on-surface-variant">Provider</label>
                <div className="flex flex-wrap gap-xs">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setForm({ ...form, provider: p.value })}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-bold transition-all',
                        form.provider === p.value
                          ? cn(p.color, 'text-on-primary')
                          : 'border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-high',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {form.provider === 'other' && (
                  <input
                    type="text"
                    value={form.custom_provider}
                    onChange={(e) => setForm({ ...form, custom_provider: e.target.value })}
                    placeholder="e.g. Cohere, Mistral, Moonshot..."
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none mt-xs"
                    autoFocus
                  />
                )}
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-on-surface-variant">Plan Name</label>
                <input
                  type="text"
                  value={form.plan_name}
                  onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
                  placeholder="e.g. Pro, Team, Free"
                  className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none"
                />
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-on-surface-variant">Base URL <span className="opacity-50">(optional)</span></label>
                <input
                  type="text"
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                  placeholder="e.g. https://api.openai.com/v1"
                  className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none font-mono"
                />
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-on-surface-variant">API Key <span className="opacity-50">(optional)</span></label>
                <input
                  type="password"
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  placeholder="sk-..."
                  className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none font-mono"
                />
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-on-surface-variant">Billing Cycle</label>
                <div className="flex flex-wrap gap-xs">
                  {BILLING_CYCLES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm({ ...form, billing_cycle: c.value })}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-bold transition-all',
                        form.billing_cycle === c.value
                          ? 'bg-primary text-on-primary'
                          : 'border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-high',
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-on-surface-variant">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-sm">
                <div className="space-y-xs">
                  <label className="font-label-sm text-on-surface-variant">Cost ($)</label>
                  <input
                    type="number"
                    value={form.monthly_cost}
                    onChange={(e) => setForm({ ...form, monthly_cost: e.target.value })}
                    placeholder="20"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none"
                  />
                </div>
                <div className="space-y-xs">
                  <label className="font-label-sm text-on-surface-variant">Token Limit</label>
                  <input
                    type="number"
                    value={form.token_limit}
                    onChange={(e) => setForm({ ...form, token_limit: e.target.value })}
                    placeholder="1000000"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-md py-3 bg-surface-container border-t border-outline-variant/30 flex justify-end gap-sm rounded-b-2xl">
              <button onClick={() => { setShowDialog(false); setEditingId(null) }} className="px-md py-1.5 rounded-full font-label-md text-on-surface-variant hover:bg-surface-variant transition-colors text-body-sm">
                Cancel
              </button>
              <button onClick={handleSave} className="px-md py-1.5 rounded-full bg-primary text-on-primary font-label-md hover:brightness-110 active:scale-95 transition-all text-body-sm">
                {editingId ? 'Save' : 'Add Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
