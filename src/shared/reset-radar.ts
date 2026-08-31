export type ResetRadarAccountStatus = 'signed_out' | 'connected' | 'stale' | 'error'
export type ResetRadarConfidence = 'low' | 'medium' | 'high'
export type ResetRadarTone = 'quiet' | 'watch' | 'active'
export type ResetRadarResetType = 'global' | 'gift' | 'unknown'

export interface ResetRadarSourceHealth {
  id: string
  label: string
  status: 'ok' | 'warn' | 'stale' | 'error'
  detail: string
}

export interface ResetRadarPublicSignal {
  id: string
  title: string
  detail: string
  source: string
  url: string
  observedAt: string
  confidence: ResetRadarConfidence
  resetType: ResetRadarResetType
}

export interface ResetRadarSnapshot {
  generatedAt: string
  account: {
    status: ResetRadarAccountStatus
    fetchedAt: string | null
    plan: string | null
    email: string | null
    name: string | null
    subscriptionExpiresAt: string | null
    limitReached: boolean | null
    lastResetAt: string | null
  }
  quotaWindows: Array<{
    kind: 'five_hour' | 'weekly' | 'generic'
    remainingPercent: number | null
    resetAt: string | null
    durationSeconds: number | null
  }>
  resetCredits: {
    availableCount: number | null
    nearestExpiry: string | null
  } | null
  activeSignal: {
    id: string
    title: string
    detail: string
    source: string
    url: string
    observedAt: string
    confidence: ResetRadarConfidence
    resetType: ResetRadarResetType
  } | null
  publicSignals: ResetRadarPublicSignal[]
  forecast: {
    windowHours: number
    confidence: ResetRadarConfidence
    peakProbability: number
    nextWindowAt: string | null
    label: string
  }
  advice: {
    kind: 'hold' | 'wait' | 'check_account' | 'none'
    title: string
    detail: string
  }
  sources: ResetRadarSourceHealth[]
}

export interface ResetRadarHistoryEntry {
  id: number
  kind: 'reset'
  occurredAt: string
  title: string
  detail: string
  source: string
  url: string | null
  resetType: ResetRadarResetType
}

export function createGuestResetRadarSnapshot(generatedAt = new Date().toISOString()): ResetRadarSnapshot {
  return {
    generatedAt,
    account: {
      status: 'signed_out',
      fetchedAt: null,
      plan: null,
      email: null,
      name: null,
      subscriptionExpiresAt: null,
      limitReached: null,
      lastResetAt: null,
    },
    quotaWindows: [],
    resetCredits: null,
    activeSignal: null,
    publicSignals: [],
    forecast: {
      windowHours: 72,
      confidence: 'low',
      peakProbability: 0.12,
      nextWindowAt: null,
      label: '暂无高置信公开信号',
    },
    advice: {
      kind: 'check_account',
      title: '外部浏览器登录后可手动刷新',
      detail: '登录态不会自动回传，访客模式不读取或推断账户配额。',
    },
    sources: [
      {
        id: 'openai-status',
        label: 'OpenAI Status',
        status: 'warn',
        detail: '等待首次刷新',
      },
      {
        id: 'community-history',
        label: 'Community history',
        status: 'stale',
        detail: '历史信号接入准备中',
      },
    ],
  }
}

export function getResetTypeLabel(resetType: ResetRadarResetType): string {
  if (resetType === 'global') return '全局重置'
  if (resetType === 'gift') return '赠送重置卡'
  return '类型待确认'
}

export function getResetRadarTone(
  confidence: ResetRadarConfidence,
  hasActiveSignal: boolean,
): ResetRadarTone {
  if (hasActiveSignal && confidence === 'high') return 'active'
  if (hasActiveSignal || confidence === 'medium') return 'watch'
  return 'quiet'
}

export function getResetRadarFooterActions(accountStatus: ResetRadarAccountStatus): {
  primaryLabel: string
  primaryAction: 'status' | 'account'
  secondaryLabel: string
} {
  if (accountStatus === 'connected') {
    return {
      primaryLabel: '更换绑定',
      primaryAction: 'account',
      secondaryLabel: '打开会话',
    }
  }

  return {
    primaryLabel: '查看公开依据',
    primaryAction: 'status',
    secondaryLabel: '应用内登录',
  }
}
