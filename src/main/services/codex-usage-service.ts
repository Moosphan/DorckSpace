import { getDatabase } from '../database/connection'
import { getResetRadarSnapshot } from './reset-radar/reset-radar-service'
import { ResetRadarRepository } from '../database/repositories/reset-radar-repository'
import { buildCodexUsageDashboard, type CodexUsageDashboard } from '../../shared/codex-usage'

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function getCodexUsageDashboard(forceRefresh = false): Promise<CodexUsageDashboard> {
  const snapshot = await getResetRadarSnapshot(forceRefresh)
  const usageSamples = new ResetRadarRepository(getDatabase()).getUsageSamplesSince(
    new Date(Date.now() - 6 * 86_400_000).toISOString(),
  )

  const dashboard = buildCodexUsageDashboard({
    generatedAt: snapshot.generatedAt,
    account: snapshot.account,
    quotaWindows: snapshot.quotaWindows,
    usageSamples,
    asOf: formatLocalDate(new Date()),
  })
  return dashboard
}
