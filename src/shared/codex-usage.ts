import type { ResetRadarSnapshot } from './reset-radar'

export interface CodexUsageRow {
  total_tokens: number
  created_at: string
}

export interface CodexActivityDay {
  date: string
  durationMinutes: number
}

export interface CodexUsageActivity {
  totalTokens: number
  peakTokens: number
  totalDurationMinutes: number
  currentStreakDays: number
  longestStreakDays: number
}

export interface CodexUsageDashboard {
  generatedAt: string
  lastSyncedAt: string | null
  accountStatus: ResetRadarSnapshot['account']['status']
  plan: string | null
  subscriptionExpiresAt: string | null
  quotaWindows: ResetRadarSnapshot['quotaWindows']
  dailyUsage: Array<{ date: string; totalTokens: number }>
  activity: CodexUsageActivity
}

interface CodexUsageInput {
  generatedAt: string
  account: Pick<ResetRadarSnapshot['account'], 'status' | 'fetchedAt' | 'plan'>
  quotaWindows: ResetRadarSnapshot['quotaWindows']
  usageRows: CodexUsageRow[]
  activityDays: CodexActivityDay[]
  asOf?: string
}

function getDayDifference(left: string, right: string): number {
  const leftTime = Date.parse(`${left}T00:00:00Z`)
  const rightTime = Date.parse(`${right}T00:00:00Z`)
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return Number.NaN
  return Math.round((leftTime - rightTime) / 86_400_000)
}

function getStreaks(activityDays: CodexActivityDay[]): Pick<CodexUsageActivity, 'currentStreakDays' | 'longestStreakDays'> {
  const dates = [...new Set(activityDays.map((day) => day.date).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort((left, right) => right.localeCompare(left))
  if (dates.length === 0) return { currentStreakDays: 0, longestStreakDays: 0 }

  let longestStreakDays = 1
  let currentStreakDays = 1
  let streak = 1
  for (let index = 1; index < dates.length; index += 1) {
    if (getDayDifference(dates[index - 1], dates[index]) === 1) {
      streak += 1
      if (index === streak - 1) currentStreakDays = streak
    } else {
      streak = 1
    }
    longestStreakDays = Math.max(longestStreakDays, streak)
  }

  return { currentStreakDays, longestStreakDays }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getDailyUsage(usageRows: CodexUsageRow[], asOf?: string): Array<{ date: string; totalTokens: number }> {
  const totals = new Map<string, number>()
  for (const row of usageRows) {
    const date = typeof row.created_at === 'string' ? row.created_at.slice(0, 10) : ''
    const tokens = Number(row.total_tokens)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(tokens) || tokens < 0) continue
    totals.set(date, (totals.get(date) ?? 0) + tokens)
  }
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(asOf ?? '') ? asOf as string : formatDate(new Date())
  const endTime = Date.parse(`${endDate}T00:00:00Z`)
  if (Number.isNaN(endTime)) return []

  return Array.from({ length: 7 }, (_, index) => {
    const date = formatDate(new Date(endTime - (6 - index) * 86_400_000))
    return { date, totalTokens: totals.get(date) ?? 0 }
  })
}

export function buildCodexUsageDashboard(input: CodexUsageInput): CodexUsageDashboard {
  const tokenValues = input.usageRows
    .map((row) => Number(row.total_tokens))
    .filter((tokens) => Number.isFinite(tokens) && tokens >= 0)
  const activity = getStreaks(input.activityDays)

  return {
    generatedAt: input.generatedAt,
    lastSyncedAt: input.account.fetchedAt,
    accountStatus: input.account.status,
    plan: input.account.plan,
    subscriptionExpiresAt: input.account.subscriptionExpiresAt,
    quotaWindows: input.quotaWindows,
    dailyUsage: getDailyUsage(input.usageRows, input.asOf),
    activity: {
      totalTokens: tokenValues.reduce((sum, tokens) => sum + tokens, 0),
      peakTokens: tokenValues.length > 0 ? Math.max(...tokenValues) : 0,
      totalDurationMinutes: input.activityDays.reduce((sum, day) => sum + Math.max(0, Number(day.durationMinutes) || 0), 0),
      ...activity,
    },
  }
}
