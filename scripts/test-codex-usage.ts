import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCodexUsageDashboard } from '../src/shared/codex-usage'

test('builds Codex usage summary from quota windows and local activity', () => {
  const dashboard = buildCodexUsageDashboard({
    generatedAt: '2026-08-28T08:00:00.000Z',
    account: {
      status: 'connected',
      fetchedAt: '2026-08-28T07:55:00.000Z',
      plan: 'pro',
      subscriptionExpiresAt: '2026-09-01T00:00:00.000Z',
    },
    quotaWindows: [
      { kind: 'five_hour', remainingPercent: 72, resetAt: '2026-08-28T10:00:00.000Z', durationSeconds: 18000 },
      { kind: 'weekly', remainingPercent: 44, resetAt: '2026-08-30T10:00:00.000Z', durationSeconds: 604800 },
    ],
    usageRows: [
      { total_tokens: 1200, created_at: '2026-08-28T07:00:00.000Z' },
      { total_tokens: 3400, created_at: '2026-08-27T07:00:00.000Z' },
      { total_tokens: 500, created_at: '2026-08-27T08:00:00.000Z' },
    ],
    activityDays: [
      { date: '2026-08-28', durationMinutes: 45 },
      { date: '2026-08-27', durationMinutes: 30 },
      { date: '2026-08-25', durationMinutes: 10 },
    ],
    asOf: '2026-08-28',
  })

  assert.equal(dashboard.plan, 'pro')
  assert.equal(dashboard.quotaWindows[0].remainingPercent, 72)
  assert.equal(dashboard.activity.totalTokens, 5100)
  assert.equal(dashboard.activity.peakTokens, 3400)
  assert.equal(dashboard.activity.totalDurationMinutes, 85)
  assert.equal(dashboard.activity.currentStreakDays, 2)
  assert.equal(dashboard.activity.longestStreakDays, 2)
  assert.equal(dashboard.lastSyncedAt, '2026-08-28T07:55:00.000Z')
  assert.deepEqual(dashboard.dailyUsage, [
    { date: '2026-08-22', totalTokens: 0 },
    { date: '2026-08-23', totalTokens: 0 },
    { date: '2026-08-24', totalTokens: 0 },
    { date: '2026-08-25', totalTokens: 0 },
    { date: '2026-08-26', totalTokens: 0 },
    { date: '2026-08-27', totalTokens: 3900 },
    { date: '2026-08-28', totalTokens: 1200 },
  ])
})

test('does not invent quota or activity values when data is unavailable', () => {
  const dashboard = buildCodexUsageDashboard({
    generatedAt: '2026-08-28T08:00:00.000Z',
    account: { status: 'signed_out', fetchedAt: null, plan: null, subscriptionExpiresAt: null },
    quotaWindows: [],
    usageRows: [],
    activityDays: [],
    asOf: '2026-08-28',
  })

  assert.equal(dashboard.plan, null)
  assert.deepEqual(dashboard.quotaWindows, [])
  assert.deepEqual(dashboard.activity, {
    totalTokens: 0,
    peakTokens: 0,
    totalDurationMinutes: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
  })
  assert.equal(dashboard.dailyUsage.length, 7)
  assert.ok(dashboard.dailyUsage.every((day) => day.totalTokens === 0))
})
