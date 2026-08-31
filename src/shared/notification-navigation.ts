export interface NotificationNavigationPayload {
  route: string
}

export type NotificationNavigationTarget =
  | { type: 'task'; taskId: number }
  | { type: 'reset-radar'; signalId?: string }
  | { type: 'rss-article'; articleId: number }
  | { type: 'insights-trending'; platform?: string; period?: string }

const ALLOWED_ROUTE_PREFIXES = ['/dashboard', '/ai-lab', '/insights', '/writing', '/video']

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

function appendParam(params: URLSearchParams, key: string, value: string | undefined): void {
  if (!value) return
  params.set(key, value)
}

export function normalizeNotificationRoute(route: string | undefined | null): string | null {
  if (!route) return null
  const trimmed = route.trim()
  if (!trimmed.startsWith('/')) return null
  if (trimmed.startsWith('//')) return null
  if (!ALLOWED_ROUTE_PREFIXES.some((prefix) => trimmed === prefix || trimmed.startsWith(`${prefix}?`))) return null
  return trimmed
}

export function createNotificationNavigationPayload(
  target: NotificationNavigationTarget | undefined,
): NotificationNavigationPayload | null {
  if (!target) return null

  if (target.type === 'task') {
    if (!isPositiveInteger(target.taskId)) return null
    return { route: `/dashboard?taskId=${target.taskId}` }
  }

  if (target.type === 'reset-radar') {
    const params = new URLSearchParams({ panel: 'reset-radar' })
    appendParam(params, 'signalId', target.signalId)
    return { route: `/ai-lab?${params.toString()}` }
  }

  if (target.type === 'rss-article') {
    if (!isPositiveInteger(target.articleId)) return null
    return { route: `/insights?articleId=${target.articleId}` }
  }

  const params = new URLSearchParams({ panel: 'trending' })
  appendParam(params, 'platform', target.platform)
  appendParam(params, 'period', target.period)
  return { route: `/insights?${params.toString()}` }
}
