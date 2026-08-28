import {
  createGuestResetRadarSnapshot,
  type ResetRadarPublicSignal,
  type ResetRadarConfidence,
  type ResetRadarResetType,
  type ResetRadarSnapshot,
} from '../../../shared/reset-radar'

export const OPENAI_STATUS_URL = 'https://status.openai.com/api/v2/summary.json'
export const CODEX_LEAD_X_URL = process.env.CODEX_LEAD_X_URL || 'https://api.dayclaw.com/api/source/public/x/thsottiaux/items'

export interface OpenAIStatusSummary {
  indicator: 'none' | 'minor' | 'major' | 'critical' | 'unknown'
  description: string
  incidentCount: number
  sourceStatus: 'ok' | 'warn' | 'error'
  observedAt: string
}

export interface XResetAnnouncement {
  externalId: string
  title: string
  detail: string
  author: string
  publishedAt: string
  url: string
  resetType: ResetRadarResetType
}

export type XSourceStatus = 'ok' | 'error'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeIndicator(value: unknown): OpenAIStatusSummary['indicator'] {
  if (value === 'none' || value === 'minor' || value === 'major' || value === 'critical') return value
  return 'unknown'
}

function asIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const raw = String(value).trim()
  if (!raw) return null
  const normalized = typeof value === 'string' && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)
    ? `${raw}Z`
    : raw
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function isResetAnnouncement(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ')
  if (/password reset|git reset|reset button|reset config|reset cache|重置密码|重置配置/.test(normalized)) return false
  const mentionsQuota = /codex|chatgpt work|usage|limit|quota|allowance|credits|rate limit|额度|配额|限额/.test(normalized)
  const mentionsReset = /reset(?:ed|ting|s)?|refill|restore|replenish|regain|恢复|重置/.test(normalized)
  return mentionsQuota && mentionsReset
}

export function classifyResetType(text: string): ResetRadarResetType {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ')
  if (/banked reset|reset credit|gift(?:ed|ing)? reset|赠送|重置卡|credits? to everyone/.test(normalized)) return 'gift'
  if (/global reset|all (?:paid )?users|all plans|all chatgpt|all codex|全局|所有用户|全部用户/.test(normalized)) return 'global'
  return 'unknown'
}

export function parseXResetAnnouncements(payload: unknown): XResetAnnouncement[] {
  const root = asRecord(payload)
  const source = asRecord(root.source)
  const items = Array.isArray(root.items) ? root.items : []
  const sourceAuthor = asString(source.user_name, 'thsottiaux')

  return items.map((value): XResetAnnouncement | null => {
    const item = asRecord(value)
    const externalId = asString(item.external_id ?? item.id, '')
    const detail = asString(item.content ?? item.text, '')
    const title = asString(item.title, detail)
    const publishedAt = asIsoDate(item.published_at ?? item.created_at)
    if (!externalId || !detail || !publishedAt || !isResetAnnouncement(`${title} ${detail}`)) return null
    const author = asString(item.author ?? asRecord(item.metadata).author_user_name, sourceAuthor)
    const url = asString(item.url, `https://x.com/${author}/status/${externalId}`)
    return { externalId, title, detail, author, publishedAt, url, resetType: classifyResetType(`${title} ${detail}`) }
  }).filter((item): item is XResetAnnouncement => item !== null)
    .filter((item, index, items) => items.findIndex((candidate) => candidate.externalId === item.externalId) === index)
    .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())
}

export function parseOpenAIStatusPayload(payload: unknown, observedAt = new Date().toISOString()): OpenAIStatusSummary {
  const root = asRecord(payload)
  const status = asRecord(root.status)
  const incidents = Array.isArray(root.incidents) ? root.incidents : []
  const indicator = normalizeIndicator(status.indicator)

  return {
    indicator,
    description: asString(status.description, 'OpenAI Status response received'),
    incidentCount: incidents.length,
    sourceStatus: indicator === 'unknown' ? 'error' : indicator === 'none' ? 'ok' : 'warn',
    observedAt,
  }
}

function getConfidence(indicator: OpenAIStatusSummary['indicator']): ResetRadarConfidence {
  return indicator === 'critical' || indicator === 'major' ? 'high' : 'medium'
}

export function buildPublicResetRadarSnapshot(
  status: OpenAIStatusSummary,
  announcements: XResetAnnouncement[] = [],
  xSourceStatus: XSourceStatus = 'ok',
): ResetRadarSnapshot {
  const snapshot = createGuestResetRadarSnapshot(status.observedAt)
  const observedTimestamp = new Date(status.observedAt).getTime()
  const latestAnnouncement = announcements.find((announcement) => {
    const publishedTimestamp = new Date(announcement.publishedAt).getTime()
    return publishedTimestamp <= observedTimestamp + 5 * 60 * 1000
      && observedTimestamp - publishedTimestamp <= 72 * 60 * 60 * 1000
  })
  const hasStatusSignal = status.sourceStatus === 'warn'
  const hasRecentXSignal = Boolean(latestAnnouncement)
  const confidence = hasRecentXSignal ? 'high' : hasStatusSignal ? getConfidence(status.indicator) : 'low'

  snapshot.forecast.confidence = confidence
  snapshot.forecast.peakProbability = hasRecentXSignal ? 0.85 : hasStatusSignal ? (confidence === 'high' ? 0.35 : 0.2) : 0.12
  snapshot.forecast.label = hasRecentXSignal ? '检测到 X 官方重置公告' : hasStatusSignal ? '检测到公开服务信号' : '暂无高置信公开信号'
  snapshot.sources[0] = {
    id: 'openai-status',
    label: 'OpenAI Status',
    status: status.sourceStatus,
    detail: status.description,
  }
  snapshot.sources[1] = {
    id: 'codex-lead-x',
    label: 'X / Codex 负责人',
    status: xSourceStatus === 'error' ? 'error' : hasRecentXSignal ? 'ok' : 'stale',
    detail: xSourceStatus === 'error'
      ? 'X 公开动态源暂时不可用'
      : hasRecentXSignal ? `已读取 ${announcements.length} 条重置相关动态` : '暂未发现新的重置相关动态',
  }
  snapshot.publicSignals = announcements.map((announcement): ResetRadarPublicSignal => ({
    id: `x:${announcement.externalId}`,
    title: announcement.title,
    detail: announcement.detail,
    source: 'X / Codex 负责人',
    url: announcement.url,
    observedAt: announcement.publishedAt,
    confidence: 'high',
    resetType: announcement.resetType,
  }))

  if (hasRecentXSignal && latestAnnouncement) {
    snapshot.activeSignal = {
      id: `x:${latestAnnouncement.externalId}`,
      title: latestAnnouncement.title,
      detail: latestAnnouncement.detail,
      source: 'X / Codex 负责人',
      url: latestAnnouncement.url,
      observedAt: latestAnnouncement.publishedAt,
      confidence: 'high',
      resetType: latestAnnouncement.resetType,
    }
    snapshot.advice = {
      kind: 'wait',
      title: '官方 X 已发布重置相关动态',
      detail: '这是公开公告信号，不代表每个账户都已完成同步；可刷新账户用量确认实际状态。',
    }
  } else if (hasStatusSignal) {
    snapshot.activeSignal = {
      id: `status:${status.observedAt}`,
      title: status.description,
      detail: status.incidentCount > 0 ? `${status.incidentCount} 个公开事件仍在记录中` : '公开状态指标出现波动',
      source: 'OpenAI Status',
      url: 'https://status.openai.com',
      observedAt: status.observedAt,
      confidence,
      resetType: 'unknown',
    }
    snapshot.advice = {
      kind: 'wait',
      title: '先查看公开状态，再决定是否等待',
      detail: '公开服务异常不等于 Codex 一定会重置，雷达只提供辅助判断。',
    }
  }

  return snapshot
}

export async function fetchPublicResetRadarSnapshot(signal?: AbortSignal): Promise<ResetRadarSnapshot> {
  const observedAt = new Date().toISOString()
  const [statusResult, xResult] = await Promise.allSettled([
    fetch(OPENAI_STATUS_URL, { headers: { Accept: 'application/json' }, signal }),
    fetch(CODEX_LEAD_X_URL, { headers: { Accept: 'application/json' }, signal }),
  ])
  const errors: string[] = []
  let status = parseOpenAIStatusPayload({}, observedAt)
  let xAnnouncements: XResetAnnouncement[] = []
  let xSourceStatus: XSourceStatus = 'error'

  if (statusResult.status === 'fulfilled' && statusResult.value.ok) {
    status = parseOpenAIStatusPayload(await statusResult.value.json() as unknown, observedAt)
  } else {
    errors.push(statusResult.status === 'fulfilled' ? `OpenAI Status HTTP ${statusResult.value.status}` : String(statusResult.reason))
  }

  if (xResult.status === 'fulfilled' && xResult.value.ok) {
    xAnnouncements = parseXResetAnnouncements(await xResult.value.json() as unknown)
    xSourceStatus = 'ok'
  } else {
    errors.push(xResult.status === 'fulfilled' ? `X source HTTP ${xResult.value.status}` : String(xResult.reason))
  }

  const statusAvailable = statusResult.status === 'fulfilled' && statusResult.value.ok
  const xAvailable = xResult.status === 'fulfilled' && xResult.value.ok
  if (!statusAvailable && !xAvailable) {
    throw new Error(errors.join('; ') || 'Public reset signal sources unavailable')
  }
  return buildPublicResetRadarSnapshot(status, xAnnouncements, xSourceStatus)
}
