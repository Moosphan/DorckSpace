import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { usageProviderRegistry } from './usage-provider-registry'
import { decryptSecret } from './secret-crypto'

interface UsageResult {
  balance: number
  currency: string
  total_tokens: number
  input_tokens: number
  output_tokens: number
  is_available: boolean
}

// Official API endpoints for each provider
const PROVIDER_APIS: Record<string, { baseUrl: string; query: (apiKey: string, subscriptionBaseUrl?: string) => Promise<UsageResult> }> = {
  openai: {
    baseUrl: 'https://api.openai.com',
    async query(apiKey: string) {
      const res = await fetch('https://api.openai.com/v1/organization/costs', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`)
      const data = await res.json() as { data?: Array<{ results?: Array<{ amount?: { value?: number } }> }> }
      const totalCost = data.data?.reduce((sum, d) => {
        return sum + (d.results?.reduce((s, r) => s + (r.amount?.value ?? 0), 0) ?? 0)
      }, 0) ?? 0
      return { balance: 0, currency: 'USD', total_tokens: 0, input_tokens: 0, output_tokens: 0, is_available: true, cost: totalCost } as UsageResult & { cost: number }
    },
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    async query(apiKey: string) {
      // Anthropic doesn't have a public usage API yet, check if key is valid
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)
      return { balance: 0, currency: 'USD', total_tokens: 0, input_tokens: 0, output_tokens: 0, is_available: true }
    },
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    async query(apiKey: string) {
      const res = await fetch('https://api.deepseek.com/user/balance', {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) throw new Error(`DeepSeek API error: ${res.status}`)
      const data = await res.json() as { is_available?: boolean; balance?: string; currency?: string }
      return {
        balance: parseFloat(data.balance ?? '0'),
        currency: data.currency ?? 'CNY',
        total_tokens: 0,
        input_tokens: 0,
        output_tokens: 0,
        is_available: data.is_available ?? true,
      }
    },
  },
  mimo: {
    baseUrl: 'https://api.siliconflow.cn',
    async query(apiKey: string, subscriptionBaseUrl?: string) {
      console.log('[AI Usage] MIMO query starting...')
      console.log('[AI Usage] API Key:', apiKey?.substring(0, 15) + '...')
      console.log('[AI Usage] Base URL:', subscriptionBaseUrl)

      // Try relay service first (if custom base_url is provided)
      if (subscriptionBaseUrl) {
        try {
          // Remove trailing /anthropic or similar suffix for API calls
          const base = subscriptionBaseUrl.replace(/\/(anthropic|v1)$/, '')
          console.log('[AI Usage] Trying relay service:', `${base}/v1/chat/completions`)

          // Make a minimal test call to verify API key and get usage info
          const res = await fetch(`${base}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'mimo-v2.5',
              messages: [{ role: 'user', content: 'Hi' }],
              max_tokens: 1,
            }),
            signal: AbortSignal.timeout(15000),
          })

          console.log('[AI Usage] Relay service response status:', res.status)

          if (res.ok) {
            const data = await res.json() as {
              usage?: {
                prompt_tokens?: number
                completion_tokens?: number
                total_tokens?: number
              }
              model?: string
            }

            const usage = data.usage || {}
            console.log('[AI Usage] Relay service success! Usage:', JSON.stringify(usage))

            const result = {
              balance: 0,
              currency: 'CNY',
              total_tokens: usage.total_tokens || 0,
              input_tokens: usage.prompt_tokens || 0,
              output_tokens: usage.completion_tokens || 0,
              is_available: true,
            } as UsageResult

            console.log('[AI Usage] Returning result:', JSON.stringify(result))
            return result
          } else {
            console.log('[AI Usage] Relay service failed, trying SiliconFlow...')
          }
        } catch (err) {
          console.error('[AI Usage] Relay service error:', err)
          // Fall through to SiliconFlow API
        }
      }

      // Try SiliconFlow official API
      console.log('[AI Usage] Trying SiliconFlow API...')
      const res = await fetch('https://api.siliconflow.cn/v1/user/info', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      })

      console.log('[AI Usage] SiliconFlow response status:', res.status)

      if (!res.ok) throw new Error(`SiliconFlow API error: ${res.status}`)
      const data = await res.json() as {
        data?: { balance?: string; charge?: string; totalBalance?: string; id?: string }
      }
      const d = data.data || {}
      console.log('[AI Usage] SiliconFlow data:', JSON.stringify(d))

      const result = {
        balance: parseFloat(String(d.balance ?? d.totalBalance ?? '0')),
        currency: 'CNY',
        total_tokens: 0,
        input_tokens: 0,
        output_tokens: 0,
        is_available: true,
      }

      console.log('[AI Usage] Returning result:', JSON.stringify(result))
      return result
    },
  },
  qwen: {
    baseUrl: 'https://dashscope.aliyuncs.com',
    async query(apiKey: string) {
      // DashScope doesn't have a public balance API, validate key via models list
      const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) throw new Error(`DashScope API error: ${res.status}`)
      return { balance: 0, currency: 'CNY', total_tokens: 0, input_tokens: 0, output_tokens: 0, is_available: true }
    },
  },
}

function detectProvider(provider: string): string {
  const map: Record<string, string> = {
    openai: 'openai',
    anthropic: 'anthropic',
    deepseek: 'deepseek',
    mimo: 'mimo',
    qwen: 'qwen',
  }
  return map[provider] || ''
}

async function fetchUsage(subscription: { provider: string; api_key: string | null; base_url?: string | null }): Promise<{ result: UsageResult | null; error?: string }> {
  if (!subscription.api_key) return { result: null, error: 'No API key configured' }

  const providerKey = detectProvider(subscription.provider)

  // Check built-in providers first
  const api = PROVIDER_APIS[providerKey]
  if (api) {
    try {
      console.log(`[AI Usage] Calling ${subscription.provider} API...`)
      const result = await api.query(subscription.api_key, subscription.base_url ?? undefined)
      console.log(`[AI Usage] ${subscription.provider} result:`, JSON.stringify(result))
      return { result }
    } catch (err) {
      console.error(`[AI Usage] ${subscription.provider} exception:`, err)
      return { result: null, error: (err as Error).message }
    }
  }

  // Check plugin-registered providers
  const pluginProvider = usageProviderRegistry.get(subscription.provider)
  if (pluginProvider) {
    try {
      console.log(`[AI Usage] Calling plugin provider for ${subscription.provider}...`)
      const pResult = await pluginProvider(subscription.api_key, subscription.base_url ?? undefined)
      console.log(`[AI Usage] Plugin provider result:`, JSON.stringify(pResult))
      return {
        result: {
          balance: 0,
          currency: 'CNY',
          total_tokens: pResult.total_tokens,
          input_tokens: pResult.input_tokens,
          output_tokens: pResult.output_tokens,
          is_available: pResult.is_available,
        },
      }
    } catch (err) {
      console.error(`[AI Usage] Plugin provider exception:`, err)
      return { result: null, error: (err as Error).message }
    }
  }

  return { result: null, error: `Usage tracking not available for ${subscription.provider}` }
}

async function trackAllSubscriptions(): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const db = getDatabase()
  const subs = (db.prepare(
    "SELECT * FROM ai_subscriptions WHERE is_active = 1 AND api_key IS NOT NULL AND api_key != ''",
  ).all() as Array<{ id: number; provider: string; api_key: string | null; base_url?: string | null }>).map((sub) => ({
    ...sub,
    api_key: decryptSecret(sub.api_key),
  }))

  console.log(`[AI Usage] Tracking ${subs.length} subscriptions...`)
  const errors: string[] = []
  let updated = 0

  for (const sub of subs) {
    try {
      console.log(`[AI Usage] Processing ${sub.provider} (ID: ${sub.id})...`)
      const { result, error } = await fetchUsage(sub)
      if (result) {
        console.log(`[AI Usage] ${sub.provider} success: is_available=${result.is_available}`)
        db.prepare(
          `INSERT INTO ai_usage_logs (subscription_id, input_tokens, output_tokens, total_tokens, cost, model, snapshot_date)
           VALUES (?, ?, ?, ?, ?, ?, date('now'))`,
        ).run(sub.id, result.input_tokens, result.output_tokens, result.total_tokens, (result as unknown as { cost?: number }).cost ?? 0, '')
        updated++
      } else if (error) {
        console.log(`[AI Usage] ${sub.provider} error: ${error}`)
        errors.push(`${sub.provider}: ${error}`)
      }
    } catch (err) {
      console.log(`[AI Usage] ${sub.provider} exception: ${(err as Error).message}`)
      errors.push(`${sub.provider}: ${(err as Error).message}`)
    }
  }

  console.log(`[AI Usage] Done: ${updated} updated, ${errors.length} errors`)
  return { success: true, updated, errors }
}

let pollTimer: ReturnType<typeof setInterval> | null = null
let trackingPromise: Promise<{ success: boolean; updated: number; errors: string[] }> | null = null

function startPolling(intervalMs: number) {
  if (pollTimer) clearInterval(pollTimer)
  if (intervalMs <= 0) return
  pollTimer = setInterval(() => {
    if (trackingPromise) return
    trackingPromise = trackAllSubscriptions().finally(() => { trackingPromise = null })
  }, intervalMs)
}

export function registerAiUsageHandlers(): void {
  ipcMain.handle('ai:trackUsage', async () => {
    console.log('[AI Usage] IPC handler called: ai:trackUsage')
    try {
      if (!trackingPromise) {
        trackingPromise = trackAllSubscriptions().finally(() => { trackingPromise = null })
      }
      const result = await trackingPromise
      console.log('[AI Usage] IPC result:', JSON.stringify(result))
      return { success: true, data: result }
    } catch (err) {
      console.error('[AI Usage] IPC error:', err)
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai:getUsageLogs', (_event, subscriptionId: number, limit?: number) => {
    try {
      const db = getDatabase()
      const rows = db.prepare(
        'SELECT * FROM ai_usage_logs WHERE subscription_id = ? ORDER BY snapshot_date DESC LIMIT ?',
      ).all(subscriptionId, limit ?? 30)
      return { success: true, data: rows }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai:startUsagePolling', (_event, intervalMs: number) => {
    startPolling(intervalMs)
    return { success: true }
  })

  ipcMain.handle('ai:stopUsagePolling', () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
    return { success: true }
  })

  ipcMain.handle('ai:getRegisteredProviders', () => {
    return { success: true, data: usageProviderRegistry.list() }
  })
}
