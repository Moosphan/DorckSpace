const FIVE_HOURS_SECONDS = 18_000
const WEEK_SECONDS = 604_800
const MAX_CREDITS = 100

export interface NormalizedChatGPTWindow {
  kind: 'five_hour' | 'weekly' | 'generic'
  remainingPercent: number
  resetAt: string | null
  durationSeconds: number | null
  limitReached: boolean
}

export interface NormalizedChatGPTUsage {
  windows: NormalizedChatGPTWindow[]
  plan: string | null
  limitReached: boolean
  fetchedAt: string
}

export interface NormalizedResetCredits {
  availableCount: number
  nearestExpiry: string | null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function asInteger(value: unknown): number | null {
  const parsed = asNumber(value)
  return parsed !== null && Number.isInteger(parsed) ? parsed : null
}

function asPercent(value: unknown): number | null {
  const parsed = asNumber(value)
  return parsed === null ? null : Math.round(Math.min(100, Math.max(0, parsed)))
}

function asIsoDate(value: unknown): string | null {
  if (typeof value === 'number' || typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
    const parsed = Number(value)
    const milliseconds = parsed > 10_000_000_000 ? parsed : parsed * 1000
    const date = new Date(milliseconds)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeWindow(rawValue: unknown, observedAt: string): NormalizedChatGPTWindow | null {
  const raw = asRecord(rawValue)
  const usedPercent = asPercent(raw.used_percent ?? raw.usedPercent)
  if (usedPercent === null) return null

  const durationMinutes = asNumber(raw.window_duration_mins ?? raw.windowDurationMins)
  const durationSeconds = asInteger(
    raw.limit_window_seconds ?? raw.limitWindowSeconds ?? (durationMinutes === null ? null : durationMinutes * 60),
  )
  const afterSeconds = asInteger(raw.reset_after_seconds ?? raw.resetAfterSeconds)
  const explicitReset = asIsoDate(raw.reset_at ?? raw.resets_at ?? raw.resetsAt)
  const observedTimestamp = new Date(observedAt).getTime()
  const relativeReset = afterSeconds !== null && afterSeconds >= 0 && !Number.isNaN(observedTimestamp)
    ? new Date(observedTimestamp + afterSeconds * 1000).toISOString()
    : null
  const kind = durationSeconds === FIVE_HOURS_SECONDS
    ? 'five_hour'
    : durationSeconds === WEEK_SECONDS ? 'weekly' : 'generic'

  return {
    kind,
    remainingPercent: 100 - usedPercent,
    resetAt: explicitReset ?? relativeReset,
    durationSeconds: durationSeconds !== null && durationSeconds > 0 ? durationSeconds : null,
    limitReached: Boolean(raw.limit_reached ?? raw.limitReached),
  }
}

export function normalizeChatGPTUsage(payload: unknown, observedAt = new Date().toISOString()): NormalizedChatGPTUsage | null {
  const root = asRecord(payload)
  const rateLimit = asRecord(root.rate_limit ?? root.rateLimits)
  const candidates = [
    normalizeWindow(rateLimit.primary_window ?? rateLimit.primary, observedAt),
    normalizeWindow(rateLimit.secondary_window ?? rateLimit.secondary, observedAt),
  ].filter((window): window is NormalizedChatGPTWindow => window !== null)
  const limitReached = Boolean(rateLimit.limit_reached ?? rateLimit.limitReached ?? rateLimit.allowed === false)

  if (candidates.length === 0 && !limitReached) return null

  return {
    windows: candidates.map((window, index, all) => {
      if (window.kind === 'generic' || !all.slice(0, index).some((previous) => previous.kind === window.kind)) return window
      return { ...window, kind: 'generic' }
    }),
    plan: typeof root.plan_type === 'string' ? root.plan_type : typeof root.planType === 'string' ? root.planType : null,
    limitReached,
    fetchedAt: observedAt,
  }
}

export function normalizeResetCredits(payload: unknown, observedAt = new Date().toISOString()): NormalizedResetCredits | null {
  const root = asRecord(payload)
  const rawCredits = Array.isArray(root.credits) ? root.credits : []
  const availableCredits = rawCredits
    .map(asRecord)
    .filter((credit) => String(credit.status ?? 'available').toLowerCase() === 'available')
    .map((credit) => asIsoDate(credit.expires_at ?? credit.expiresAt))
  const rawCount = asInteger(root.available_count ?? root.availableCount)
  const availableCount = rawCount === null
    ? availableCredits.length
    : Math.min(MAX_CREDITS, Math.max(0, rawCount))
  const now = new Date(observedAt).getTime()
  const nearestExpiry = availableCredits
    .filter((value): value is string => value !== null && new Date(value).getTime() > now)
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0] ?? null

  return { availableCount, nearestExpiry }
}
