import { getDatabase } from '../database/connection'
import { getResetRadarSnapshot } from './reset-radar/reset-radar-service'
import { buildCodexUsageDashboard, type CodexActivityDay, type CodexUsageRow, type CodexUsageDashboard } from '../../shared/codex-usage'

interface UsageAggregateRow {
  total_tokens: number | null
  peak_tokens: number | null
}

interface ActivityDayRow {
  date: string
  duration_minutes: number
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function getCodexUsageDashboard(forceRefresh = false): Promise<CodexUsageDashboard> {
  const snapshot = await getResetRadarSnapshot(forceRefresh)
  const db = getDatabase()
  const usageRows = db.prepare(
    'SELECT total_tokens, created_at FROM ai_usage_logs ORDER BY created_at DESC',
  ).all() as CodexUsageRow[]
  const activityDays = db.prepare(
    'SELECT date, SUM(duration_minutes) AS duration_minutes FROM activity_log GROUP BY date ORDER BY date DESC',
  ).all() as ActivityDayRow[]
  const aggregate = db.prepare(
    'SELECT COALESCE(SUM(total_tokens), 0) AS total_tokens, COALESCE(MAX(total_tokens), 0) AS peak_tokens FROM ai_usage_logs',
  ).get() as UsageAggregateRow

  const dashboard = buildCodexUsageDashboard({
    generatedAt: snapshot.generatedAt,
    account: snapshot.account,
    quotaWindows: snapshot.quotaWindows,
    usageRows,
    activityDays: activityDays as CodexActivityDay[],
    asOf: formatLocalDate(new Date()),
  })

  return {
    ...dashboard,
    activity: {
      ...dashboard.activity,
      totalTokens: Number(aggregate.total_tokens ?? dashboard.activity.totalTokens),
      peakTokens: Number(aggregate.peak_tokens ?? dashboard.activity.peakTokens),
    },
  }
}
