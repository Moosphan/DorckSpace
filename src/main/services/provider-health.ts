import type { TrendingProviderStatus } from '../../shared/social-trending'

export interface ProviderHealthInput {
  status?: TrendingProviderStatus
  activeBackend?: string | null
  checkedAt?: string | null
  expiresAt?: string | null
  error?: string | null
  now?: string | Date
}

export interface ProviderHealthResult {
  status: TrendingProviderStatus
  message: string
}

export function resolveProviderHealth(input: ProviderHealthInput): ProviderHealthResult {
  if (input.error || input.status === 'error') {
    return { status: 'error', message: input.error || 'Provider request failed.' }
  }
  if (input.activeBackend === 'fixture') {
    return { status: 'fixture', message: 'Live provider unavailable; showing fixture data.' }
  }

  const now = input.now instanceof Date ? input.now.getTime() : new Date(input.now ?? Date.now()).getTime()
  if (!input.checkedAt || (input.expiresAt && new Date(input.expiresAt).getTime() <= now)) {
    return { status: 'stale', message: 'Cached provider data has expired.' }
  }
  if (input.status === 'warn') return { status: 'warn', message: 'Provider returned a fallback result.' }
  return { status: 'ok', message: 'Provider data is current.' }
}

export class NotificationDeduper {
  private readonly lastSentAt = new Map<string, number>()

  constructor(private readonly quietWindowMs = 6 * 60 * 60 * 1000) {}

  shouldNotify(key: string, now = Date.now()): boolean {
    const previous = this.lastSentAt.get(key)
    if (previous !== undefined && now - previous < this.quietWindowMs) return false
    this.lastSentAt.set(key, now)
    return true
  }
}
