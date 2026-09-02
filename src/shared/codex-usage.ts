import type { CodexSessionUsageSummary } from './codex-session-usage'
import type { ResetRadarSnapshot } from './reset-radar'

export interface CodexUsageActivity {
  totalTokens: number
  todayTokens: number
  peakDayTokens: number
  currentStreakDays: number
  longestStreakDays: number
}

export interface CodexUsageDashboard {
  generatedAt: string
  lastSyncedAt: string | null
  accountStatus: ResetRadarSnapshot['account']['status']
  plan: string | null
  accountEmail: string | null
  accountName: string | null
  subscriptionExpiresAt: string | null
  quotaWindows: ResetRadarSnapshot['quotaWindows']
  dailyUsage: CodexSessionUsageSummary['dailyUsage']
  activity: CodexUsageActivity
}

interface CodexUsageInput {
  generatedAt: string
  account: Pick<ResetRadarSnapshot['account'], 'status' | 'fetchedAt' | 'plan' | 'email' | 'name' | 'subscriptionExpiresAt'>
  quotaWindows: ResetRadarSnapshot['quotaWindows']
  sessionUsage: CodexSessionUsageSummary
}

function getStreaks(dailyUsage: CodexSessionUsageSummary['dailyUsage']): Pick<CodexUsageActivity, 'currentStreakDays' | 'longestStreakDays'> {
  let longestStreakDays = 0
  let currentStreakDays = 0
  let streak = 0

  for (const day of dailyUsage) {
    if (day.totalTokens > 0) {
      streak += 1
      longestStreakDays = Math.max(longestStreakDays, streak)
    } else {
      streak = 0
    }
  }
  for (let index = dailyUsage.length - 1; index >= 0 && dailyUsage[index].totalTokens > 0; index -= 1) {
    currentStreakDays += 1
  }
  return { currentStreakDays, longestStreakDays }
}

export function buildCodexUsageDashboard(input: CodexUsageInput): CodexUsageDashboard {
  const activity = getStreaks(input.sessionUsage.dailyUsage)
  const today = input.sessionUsage.dailyUsage.at(-1)

  return {
    generatedAt: input.generatedAt,
    lastSyncedAt: input.account.fetchedAt,
    accountStatus: input.account.status,
    plan: input.account.plan,
    accountEmail: input.account.email,
    accountName: input.account.name,
    subscriptionExpiresAt: input.account.subscriptionExpiresAt,
    quotaWindows: input.quotaWindows,
    dailyUsage: input.sessionUsage.dailyUsage,
    activity: {
      totalTokens: input.sessionUsage.totalTokens,
      todayTokens: today?.totalTokens ?? 0,
      peakDayTokens: Math.max(0, ...input.sessionUsage.dailyUsage.map((day) => day.totalTokens)),
      ...activity,
    },
  }
}
