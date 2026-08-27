import { createGuestResetRadarSnapshot, type ResetRadarHistoryEntry, type ResetRadarSnapshot } from '../../../shared/reset-radar'
import { session } from 'electron'
import { CHATGPT_SESSION_PARTITION, waitForChatGPTSession } from './account-session'
import { normalizeChatGPTUsage, normalizeResetCredits } from './account-usage'
import { getDatabase } from '../../database/connection'
import { ResetRadarRepository, type ResetRadarAccountSnapshotData } from '../../database/repositories/reset-radar-repository'
import { fetchPublicResetRadarSnapshot } from './public-signal'

const CACHE_DURATION_MS = 10 * 60 * 1000
const REQUEST_TIMEOUT_MS = 10_000

let cachedSnapshot: ResetRadarSnapshot | null = null
let cachedAt = 0

function getHistoryRepository(): ResetRadarRepository {
  return new ResetRadarRepository(getDatabase())
}

const CHATGPT_SESSION_URLS = [
  'https://chatgpt.com',
  'https://chat.openai.com',
  'https://auth.openai.com',
]

export async function getChatGPTAccountStatus(waitForSession = false): Promise<'connected' | 'signed_out' | 'error'> {
  try {
    const chatGPTSession = session.fromPartition(CHATGPT_SESSION_PARTITION)
    return await waitForChatGPTSession(
      async () => {
        const cookieLists = await Promise.all(
          CHATGPT_SESSION_URLS.map((url) => chatGPTSession.cookies.get({ url })),
        )
        return cookieLists.flat()
      },
      waitForSession ? { attempts: 6, delayMs: 250 } : undefined,
    )
  } catch {
    return 'error'
  }
}

async function addAccountStatus(snapshot: ResetRadarSnapshot, waitForSession = false): Promise<ResetRadarSnapshot> {
  const status = await getChatGPTAccountStatus(waitForSession)
  const historyRepository = getHistoryRepository()
  const persistedAccountSnapshot = historyRepository.getAccountSnapshot()
  const cachedAccountSnapshot = cachedSnapshot
  const accountData = cachedAccountSnapshot?.account ?? persistedAccountSnapshot
  const keepAccountData = status === 'connected' && accountData !== null
  const nextSnapshot: ResetRadarSnapshot = {
    ...snapshot,
    account: {
      ...snapshot.account,
      ...(keepAccountData && accountData ? {
        plan: accountData.plan,
        limitReached: accountData.limitReached,
        fetchedAt: accountData.fetchedAt,
      } : {}),
      status,
      fetchedAt: status === 'connected' ? new Date().toISOString() : snapshot.account.fetchedAt,
      lastResetAt: snapshot.account.lastResetAt ?? getHistoryRepository().getRecent(1)[0]?.occurredAt ?? null,
    },
    quotaWindows: keepAccountData && snapshot.quotaWindows.length === 0 && accountData
      ? (cachedAccountSnapshot?.quotaWindows ?? persistedAccountSnapshot?.quotaWindows ?? [])
      : snapshot.quotaWindows,
    resetCredits: keepAccountData && snapshot.resetCredits === null && accountData
      ? (cachedAccountSnapshot?.resetCredits ?? persistedAccountSnapshot?.resetCredits ?? null)
      : snapshot.resetCredits,
  }

  if (status === 'connected') {
    nextSnapshot.advice = {
      kind: 'none',
      title: 'ChatGPT 会话已连接',
      detail: '已复用本地登录会话；点击刷新可重新读取公开信号。',
    }
  }

  return nextSnapshot
}

function hasQuotaReset(previous: ResetRadarSnapshot | null, nextWindows: ResetRadarSnapshot['quotaWindows']): boolean {
  if (!previous || previous.quotaWindows.length === 0 || nextWindows.length === 0) return false
  return nextWindows.some((nextWindow) => previous.quotaWindows.some((previousWindow) => (
    previousWindow.kind === nextWindow.kind
    && previousWindow.remainingPercent !== null
    && nextWindow.remainingPercent !== null
    && nextWindow.remainingPercent - previousWindow.remainingPercent >= 20
    && previousWindow.resetAt !== nextWindow.resetAt
  )))
}

export function ingestChatGPTAccountUsage(rawUsage: unknown, rawCredits: unknown): ResetRadarSnapshot {
  const observedAt = new Date().toISOString()
  const usage = normalizeChatGPTUsage(rawUsage, observedAt)
  if (!usage) throw new Error('ChatGPT usage response did not contain rate-limit windows')

  const historyRepository = getHistoryRepository()
  const persistedAccountSnapshot = historyRepository.getAccountSnapshot()
  const previous = cachedSnapshot ?? (persistedAccountSnapshot ? {
    ...createGuestResetRadarSnapshot(persistedAccountSnapshot.fetchedAt),
    account: {
      ...createGuestResetRadarSnapshot(persistedAccountSnapshot.fetchedAt).account,
      status: 'connected' as const,
      fetchedAt: persistedAccountSnapshot.fetchedAt,
      plan: persistedAccountSnapshot.plan,
      limitReached: persistedAccountSnapshot.limitReached,
    },
    quotaWindows: persistedAccountSnapshot.quotaWindows,
    resetCredits: persistedAccountSnapshot.resetCredits,
  } : null)
  const history = historyRepository.getRecent(1)[0]
  let lastResetAt = previous?.account.lastResetAt ?? history?.occurredAt ?? null

  if (hasQuotaReset(previous, usage.windows)) {
    const entry = historyRepository.addReset(
      observedAt,
      '观测到配额窗口重置',
      'ChatGPT 用量窗口在连续采样中恢复，已记录为一次本地观测事件。',
      'ChatGPT usage',
    )
    lastResetAt = entry.occurredAt
  }

  const resetCredits = normalizeResetCredits(rawCredits, observedAt)
  const nextSnapshot: ResetRadarSnapshot = {
    ...(previous ?? createGuestResetRadarSnapshot(observedAt)),
    generatedAt: observedAt,
    account: {
      status: 'connected',
      fetchedAt: usage.fetchedAt,
      plan: usage.plan,
      limitReached: usage.limitReached,
      lastResetAt,
    },
    quotaWindows: usage.windows,
    resetCredits: resetCredits ?? previous?.resetCredits ?? null,
  }
  nextSnapshot.advice = {
    kind: usage.limitReached ? 'wait' : 'none',
    title: usage.limitReached ? '当前已达到用量限制' : 'ChatGPT 用量已同步',
    detail: usage.limitReached
      ? '等待窗口重置后再继续使用；时间轴只记录本地观测到的重置事件。'
      : '数据来自内置浏览器当前登录会话，最后同步时间已更新。',
  }

  cachedSnapshot = nextSnapshot
  cachedAt = Date.now()
  historyRepository.saveAccountSnapshot({
    plan: nextSnapshot.account.plan,
    limitReached: nextSnapshot.account.limitReached,
    quotaWindows: nextSnapshot.quotaWindows,
    resetCredits: nextSnapshot.resetCredits,
    fetchedAt: nextSnapshot.account.fetchedAt ?? observedAt,
  } satisfies ResetRadarAccountSnapshotData)
  return nextSnapshot
}

export function getResetRadarHistory(limit = 20): ResetRadarHistoryEntry[] {
  return getHistoryRepository().getRecent(limit)
}

function createUnavailableSnapshot(message: string): ResetRadarSnapshot {
  const snapshot = cachedSnapshot ?? createGuestResetRadarSnapshot()
  return {
    ...snapshot,
    generatedAt: new Date().toISOString(),
    sources: snapshot.sources.map((source, index) => index === 0
      ? { ...source, status: 'error', detail: message }
      : source),
  }
}

export async function getResetRadarSnapshot(forceRefresh = false): Promise<ResetRadarSnapshot> {
  const now = Date.now()
  if (!forceRefresh && cachedSnapshot && now - cachedAt < CACHE_DURATION_MS) {
    return addAccountStatus(cachedSnapshot, forceRefresh)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const snapshot = await addAccountStatus(await fetchPublicResetRadarSnapshot(controller.signal), forceRefresh)
    cachedSnapshot = snapshot
    cachedAt = Date.now()
    return snapshot
  } catch (error) {
    return addAccountStatus(createUnavailableSnapshot(error instanceof Error ? error.message : 'Public signal unavailable'), forceRefresh)
  } finally {
    clearTimeout(timeout)
  }
}
