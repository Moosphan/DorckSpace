import { getResetRadarSnapshot } from './reset-radar/reset-radar-service'
import { buildCodexUsageDashboard, type CodexUsageDashboard } from '../../shared/codex-usage'
import { getRecentCodexSessionUsage } from './codex-session-usage-service'

export async function getCodexUsageDashboard(forceRefresh = false): Promise<CodexUsageDashboard> {
  const snapshot = await getResetRadarSnapshot(forceRefresh)
  const sessionUsage = await getRecentCodexSessionUsage(forceRefresh)

  const dashboard = buildCodexUsageDashboard({
    generatedAt: snapshot.generatedAt,
    account: snapshot.account,
    quotaWindows: snapshot.quotaWindows,
    sessionUsage,
  })
  return dashboard
}
