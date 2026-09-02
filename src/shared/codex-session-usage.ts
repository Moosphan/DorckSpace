export interface CodexSessionTokenUsage {
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface CodexSessionTokenEvent {
  sourceId: string
  timestamp: string
  usage: CodexSessionTokenUsage
}

export interface CodexSessionUsageDay {
  date: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface CodexSessionUsageSummary {
  dailyUsage: CodexSessionUsageDay[]
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

function asTokenCount(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0
}

function getDelta(current: number, previous: number | null): number {
  if (previous === null) return current
  return Math.max(0, current - previous)
}

function dateRange(asOf: string): string[] {
  const endTime = Date.parse(`${asOf}T00:00:00Z`)
  if (Number.isNaN(endTime)) return []
  return Array.from({ length: 7 }, (_, index) => new Date(endTime - (6 - index) * 86_400_000).toISOString().slice(0, 10))
}

export function buildCodexSessionUsageSummary(
  events: CodexSessionTokenEvent[],
  options: { asOf?: string } = {},
): CodexSessionUsageSummary {
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(options.asOf ?? '')
    ? options.asOf as string
    : new Date().toISOString().slice(0, 10)
  const validDates = new Set(dateRange(asOf))
  const totals = new Map<string, CodexSessionUsageDay>()
  const previousBySource = new Map<string, CodexSessionTokenUsage>()
  const sortedEvents = [...events]
    .filter((event) => /^\d{4}-\d{2}-\d{2}T/.test(event.timestamp))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId) || left.timestamp.localeCompare(right.timestamp))

  for (const event of sortedEvents) {
    const previous = previousBySource.get(event.sourceId) ?? null
    const current = {
      inputTokens: asTokenCount(event.usage.inputTokens),
      cachedInputTokens: asTokenCount(event.usage.cachedInputTokens),
      outputTokens: asTokenCount(event.usage.outputTokens),
      totalTokens: asTokenCount(event.usage.totalTokens),
    }
    previousBySource.set(event.sourceId, current)

    const date = event.timestamp.slice(0, 10)
    if (!validDates.has(date)) continue
    const day = totals.get(date) ?? { date, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    day.inputTokens += getDelta(current.inputTokens, previous?.inputTokens ?? null)
    day.outputTokens += getDelta(current.outputTokens, previous?.outputTokens ?? null)
    day.totalTokens += getDelta(current.totalTokens, previous?.totalTokens ?? null)
    totals.set(date, day)
  }

  const dailyUsage = dateRange(asOf).map((date) => totals.get(date) ?? {
    date,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  })

  return {
    dailyUsage,
    inputTokens: dailyUsage.reduce((sum, day) => sum + day.inputTokens, 0),
    outputTokens: dailyUsage.reduce((sum, day) => sum + day.outputTokens, 0),
    totalTokens: dailyUsage.reduce((sum, day) => sum + day.totalTokens, 0),
  }
}
