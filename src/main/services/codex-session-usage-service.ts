import { createReadStream, promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import {
  buildCodexSessionUsageSummary,
  type CodexSessionTokenEvent,
  type CodexSessionUsageSummary,
} from '../../shared/codex-session-usage'

const CACHE_DURATION_MS = 60_000
const SESSIONS_DIR = join(homedir(), '.codex', 'sessions')

let cachedSummary: { at: number; summary: CodexSessionUsageSummary } | null = null

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function asCount(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0
}

function parseTokenEvent(line: string, sourceId: string): CodexSessionTokenEvent | null {
  try {
    const root = asRecord(JSON.parse(line))
    const payload = asRecord(root?.payload)
    const info = asRecord(payload?.info)
    const total = asRecord(info?.total_token_usage)
    const timestamp = typeof root?.timestamp === 'string' ? root.timestamp : null
    if (!root || root.type !== 'event_msg' || payload?.type !== 'token_count' || !total || !timestamp) return null
    const totalTokens = asCount(total.total_tokens)
    const inputTokens = asCount(total.input_tokens)
    const outputTokens = asCount(total.output_tokens)
    if (totalTokens === 0 && inputTokens === 0 && outputTokens === 0) return null
    return {
      sourceId,
      timestamp,
      usage: {
        inputTokens,
        cachedInputTokens: asCount(total.cached_input_tokens ?? total.cache_read_input_tokens),
        outputTokens,
        totalTokens: totalTokens || inputTokens + outputTokens,
      },
    }
  } catch {
    return null
  }
}

function parseSessionId(line: string): string | null {
  try {
    const root = asRecord(JSON.parse(line))
    const payload = asRecord(root?.payload)
    if (!root || root.type !== 'session_meta' || !payload) return null
    const sessionId = payload.session_id ?? payload.id
    return typeof sessionId === 'string' && sessionId ? sessionId : null
  } catch {
    return null
  }
}

async function findRecentSessionFiles(directory: string, since: number): Promise<string[]> {
  let entries: Awaited<ReturnType<typeof fs.readdir>>
  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch {
    return []
  }

  const files: string[] = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await findRecentSessionFiles(path, since))
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      try {
        if ((await fs.stat(path)).mtimeMs >= since) files.push(path)
      } catch {
        // A session may be rotated while it is being read.
      }
    }
  }
  return files
}

async function readTokenEvents(path: string): Promise<CodexSessionTokenEvent[]> {
  const events: CodexSessionTokenEvent[] = []
  const lines = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity })
  let sourceId = path
  try {
    for await (const line of lines) {
      sourceId = parseSessionId(line) ?? sourceId
      const event = parseTokenEvent(line, sourceId)
      if (event) events.push(event)
    }
  } catch {
    // A partially-written session line is ignored and retried on the next refresh.
  }
  return events
}

export async function getRecentCodexSessionUsage(forceRefresh = false): Promise<CodexSessionUsageSummary> {
  const now = Date.now()
  if (!forceRefresh && cachedSummary && now - cachedSummary.at < CACHE_DURATION_MS) return cachedSummary.summary

  const files = await findRecentSessionFiles(SESSIONS_DIR, now - 8 * 86_400_000)
  const eventGroups = await Promise.all(files.map(readTokenEvents))
  const summary = buildCodexSessionUsageSummary(eventGroups.flat())
  cachedSummary = { at: now, summary }
  return summary
}
