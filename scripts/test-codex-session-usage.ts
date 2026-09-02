import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCodexSessionUsageSummary } from '../src/shared/codex-session-usage'

test('derives token deltas from cumulative Codex session counters', () => {
  const summary = buildCodexSessionUsageSummary([
    {
      sourceId: 'session-a',
      timestamp: '2026-09-01T08:00:00.000Z',
      usage: { inputTokens: 80, cachedInputTokens: 40, outputTokens: 20, totalTokens: 100 },
    },
    {
      sourceId: 'session-a',
      timestamp: '2026-09-01T09:00:00.000Z',
      usage: { inputTokens: 110, cachedInputTokens: 60, outputTokens: 35, totalTokens: 145 },
    },
    {
      sourceId: 'session-b',
      timestamp: '2026-09-02T08:00:00.000Z',
      usage: { inputTokens: 45, cachedInputTokens: 20, outputTokens: 5, totalTokens: 50 },
    },
  ], { asOf: '2026-09-02' })

  assert.deepEqual(summary.dailyUsage.slice(-2), [
    { date: '2026-09-01', inputTokens: 110, outputTokens: 35, totalTokens: 145 },
    { date: '2026-09-02', inputTokens: 45, outputTokens: 5, totalTokens: 50 },
  ])
  assert.equal(summary.totalTokens, 195)
  assert.equal(summary.inputTokens, 155)
  assert.equal(summary.outputTokens, 40)
})

test('does not double count an unchanged cumulative token event', () => {
  const summary = buildCodexSessionUsageSummary([
    {
      sourceId: 'session-a',
      timestamp: '2026-09-02T08:00:00.000Z',
      usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 20, totalTokens: 120 },
    },
    {
      sourceId: 'session-a',
      timestamp: '2026-09-02T08:05:00.000Z',
      usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 20, totalTokens: 120 },
    },
  ], { asOf: '2026-09-02' })

  assert.equal(summary.totalTokens, 120)
})

test('does not count a lower counter from a forked or reverted session as new usage', () => {
  const summary = buildCodexSessionUsageSummary([
    {
      sourceId: 'session-a',
      timestamp: '2026-09-02T08:00:00.000Z',
      usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 20, totalTokens: 120 },
    },
    {
      sourceId: 'session-a',
      timestamp: '2026-09-02T08:05:00.000Z',
      usage: { inputTokens: 80, cachedInputTokens: 0, outputTokens: 16, totalTokens: 96 },
    },
  ], { asOf: '2026-09-02' })

  assert.equal(summary.totalTokens, 120)
})
