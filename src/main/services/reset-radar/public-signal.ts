import {
  createGuestResetRadarSnapshot,
  type ResetRadarConfidence,
  type ResetRadarSnapshot,
} from '../../../shared/reset-radar'

export const OPENAI_STATUS_URL = 'https://status.openai.com/api/v2/summary.json'

export interface OpenAIStatusSummary {
  indicator: 'none' | 'minor' | 'major' | 'critical' | 'unknown'
  description: string
  incidentCount: number
  sourceStatus: 'ok' | 'warn' | 'error'
  observedAt: string
}

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

export function buildPublicResetRadarSnapshot(status: OpenAIStatusSummary): ResetRadarSnapshot {
  const snapshot = createGuestResetRadarSnapshot(status.observedAt)
  const hasSignal = status.sourceStatus === 'warn'
  const confidence = hasSignal ? getConfidence(status.indicator) : 'low'

  snapshot.forecast.confidence = confidence
  snapshot.forecast.peakProbability = hasSignal ? (confidence === 'high' ? 0.35 : 0.2) : 0.12
  snapshot.forecast.label = hasSignal ? '检测到公开服务信号' : '暂无高置信公开信号'
  snapshot.sources[0] = {
    id: 'openai-status',
    label: 'OpenAI Status',
    status: status.sourceStatus,
    detail: status.description,
  }

  if (hasSignal) {
    snapshot.activeSignal = {
      title: status.description,
      detail: status.incidentCount > 0 ? `${status.incidentCount} 个公开事件仍在记录中` : '公开状态指标出现波动',
      source: 'OpenAI Status',
      url: 'https://status.openai.com',
      observedAt: status.observedAt,
      confidence,
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
  const response = await fetch(OPENAI_STATUS_URL, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw new Error(`OpenAI Status returned HTTP ${response.status}`)
  const payload = await response.json() as unknown
  return buildPublicResetRadarSnapshot(parseOpenAIStatusPayload(payload, observedAt))
}
