import type { ResetRadarSnapshot } from './reset-radar'

export interface CodexUsageSample {
  observedAt: string
  quotaWindows: ResetRadarSnapshot['quotaWindows']
}

export interface CodexUsageActivity {
  fiveHourUsedPercent: number | null
  weeklyUsedPercent: number | null
  observedActiveDays: number
  currentStreakDays: number
  longestStreakDays: number
  sampleCount: number
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
  dailyUsage: Array<{ date: string; consumedPercent: number }>
  activity: CodexUsageActivity
}

interface CodexUsageInput {
  generatedAt: string
  account: Pick<ResetRadarSnapshot['account'], 'status' | 'fetchedAt' | 'plan' | 'email' | 'name' | 'subscriptionExpiresAt'>
  quotaWindows: ResetRadarSnapshot['quotaWindows']
  usageSamples: CodexUsageSample[]
  asOf?: string
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getWindow(sample: CodexUsageSample, kind: 'five_hour' | 'weekly') {
  return sample.quotaWindows.find((window) => window.kind === kind)
}

function getConsumptionDelta(previous: CodexUsageSample, current: CodexUsageSample, kind: 'five_hour' | 'weekly'): number {
  const previousWindow = getWindow(previous, kind)
  const currentWindow = getWindow(current, kind)
  if (!previousWindow || !currentWindow) return 0
  if (previousWindow.remainingPercent === null || currentWindow.remainingPercent === null) return 0
  if (previousWindow.resetAt && currentWindow.resetAt && previousWindow.resetAt !== currentWindow.resetAt) return 0
  return Math.max(0, previousWindow.remainingPercent - currentWindow.remainingPercent)
}

function getDailyUsage(usageSamples: CodexUsageSample[], asOf?: string): Array<{ date: string; consumedPercent: number }> {
  const totals = new Map<string, number>()
  const samples = usageSamples
    .filter((sample) => /^\d{4}-\d{2}-\d{2}T/.test(sample.observedAt))
    .sort((left, right) => left.observedAt.localeCompare(right))

  for (let index = 1; index < samples.length; index += 1) {
    const current = samples[index]
    const date = current.observedAt.slice(0, 10)
    const weeklyDelta = getConsumptionDelta(samples[index - 1], current, 'weekly')
    const fiveHourDelta = getConsumptionDelta(samples[index - 1], current, 'five_hour')
    const delta = Math.max(weeklyDelta, fiveHourDelta)
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && delta > 0) {
      totals.set(date, (totals.get(date) ?? 0) + delta)
    }
  }

  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(asOf ?? '') ? asOf as string : formatDate(new Date())
  const endTime = Date.parse(`${endDate}T00:00:00Z`)
  if (Number.isNaN(endTime)) return []

  return Array.from({ length: 7 }, (_, index) => {
    const date = formatDate(new Date(endTime - (6 - index) * 86_400_000))
    return { date, consumedPercent: totals.get(date) ?? 0 }
  })
}

function getStreaks(dailyUsage: Array<{ date: string; consumedPercent: number }>): Pick<CodexUsageActivity, 'currentStreakDays' | 'longestStreakDays'> {
  const activeDates = dailyUsage.filter((day) => day.consumedPercent > 0).map((day) => day.date)
  if (activeDates.length === 0) return { currentStreakDays: 0, longestStreakDays: 0 }

  let longestStreakDays = 0
  let currentStreakDays = 0
  let streak = 0
  for (const day of dailyUsage) {
    if (day.consumedPercent > 0) {
      streak += 1
      longestStreakDays = Math.max(longestStreakDays, streak)
    } else {
      streak = 0
    }
  }
  for (let index = dailyUsage.length - 1; index >= 0 && dailyUsage[index].consumedPercent > 0; index -= 1) {
    currentStreakDays += 1
  }
  return { currentStreakDays, longestStreakDays }
}

export function buildCodexUsageDashboard(input: CodexUsageInput): CodexUsageDashboard {
  const dailyUsage = getDailyUsage(input.usageSamples, input.asOf)
  const activity = getStreaks(dailyUsage)
  const fiveHour = input.quotaWindows.find((window) => window.kind === 'five_hour')
  const weekly = input.quotaWindows.find((window) => window.kind === 'weekly')

  return {
    generatedAt: input.generatedAt,
    lastSyncedAt: input.account.fetchedAt,
    accountStatus: input.account.status,
    plan: input.account.plan,
    accountEmail: input.account.email,
    accountName: input.account.name,
    subscriptionExpiresAt: input.account.subscriptionExpiresAt,
    quotaWindows: input.quotaWindows,
    dailyUsage,
    activity: {
      fiveHourUsedPercent: fiveHour?.remainingPercent === null || fiveHour?.remainingPercent === undefined ? null : 100 - fiveHour.remainingPercent,
      weeklyUsedPercent: weekly?.remainingPercent === null || weekly?.remainingPercent === undefined ? null : 100 - weekly.remainingPercent,
      observedActiveDays: dailyUsage.filter((day) => day.consumedPercent > 0).length,
      ...activity,
      sampleCount: input.usageSamples.length,
    },
  }
}
