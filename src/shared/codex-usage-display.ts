export interface UsageRhythmInput {
  date: string
  totalTokens: number
}

export interface UsageRhythmBar {
  date: string
  dateLabel: string
  valueLabel: string
  totalTokens: number
  heightPercent: number
  isEmpty: boolean
}

export interface UsageRhythmPercentInput {
  date: string
  consumedPercent: number
}

export function formatUsageTokens(value: number): string {
  const tokens = Math.max(0, Math.round(Number.isFinite(value) ? value : 0))
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toLocaleString()
}

export function buildUsageRhythmBars(days: UsageRhythmInput[]): UsageRhythmBar[] {
  const maxDailyTokens = Math.max(...days.map((item) => Math.max(0, Number(item.totalTokens) || 0)), 1)

  return days.map((day) => {
    const totalTokens = Math.max(0, Math.round(Number(day.totalTokens) || 0))
    const proportionalHeight = Math.round((totalTokens / maxDailyTokens) * 100)
    return {
      date: day.date,
      dateLabel: day.date.slice(5).replace('-', '/'),
      valueLabel: formatUsageTokens(totalTokens),
      totalTokens,
      heightPercent: totalTokens > 0 ? Math.max(10, proportionalHeight) : 10,
      isEmpty: totalTokens === 0,
    }
  })
}

export function buildUsageRhythmPercentBars(days: UsageRhythmPercentInput[]): UsageRhythmBar[] {
  const maxDailyConsumption = Math.max(...days.map((item) => Math.max(0, Number(item.consumedPercent) || 0)), 1)

  return days.map((day) => {
    const consumedPercent = Math.max(0, Math.round(Number(day.consumedPercent) || 0))
    const proportionalHeight = Math.round((consumedPercent / maxDailyConsumption) * 100)
    return {
      date: day.date,
      dateLabel: day.date.slice(5).replace('-', '/'),
      valueLabel: `${consumedPercent}%`,
      totalTokens: consumedPercent,
      heightPercent: consumedPercent > 0 ? Math.max(10, proportionalHeight) : 10,
      isEmpty: consumedPercent === 0,
    }
  })
}
