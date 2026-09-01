import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCodexUsageDashboard } from '../src/shared/codex-usage'
import { buildUsageRhythmBars, buildUsageRhythmPercentBars } from '../src/shared/codex-usage-display'

test('builds Codex usage summary from quota windows and local activity', () => {
  const dashboard = buildCodexUsageDashboard({
    generatedAt: '2026-08-28T08:00:00.000Z',
    account: {
      status: 'connected',
      fetchedAt: '2026-08-28T07:55:00.000Z',
      plan: 'pro',
      email: 'dorck@example.com',
      name: 'Dorck',
      subscriptionExpiresAt: '2026-09-01T00:00:00.000Z',
    },
    quotaWindows: [
      { kind: 'five_hour', remainingPercent: 72, resetAt: '2026-08-28T10:00:00.000Z', durationSeconds: 18000 },
      { kind: 'weekly', remainingPercent: 93, resetAt: '2026-08-30T10:00:00.000Z', durationSeconds: 604800 },
    ],
    usageSamples: [
      { observedAt: '2026-08-22T08:00:00.000Z', quotaWindows: [{ kind: 'weekly', remainingPercent: 100, resetAt: '2026-08-30T10:00:00.000Z', durationSeconds: 604800 }] },
      { observedAt: '2026-08-23T08:00:00.000Z', quotaWindows: [{ kind: 'weekly', remainingPercent: 99, resetAt: '2026-08-30T10:00:00.000Z', durationSeconds: 604800 }] },
      { observedAt: '2026-08-24T08:00:00.000Z', quotaWindows: [{ kind: 'weekly', remainingPercent: 98, resetAt: '2026-08-30T10:00:00.000Z', durationSeconds: 604800 }] },
      { observedAt: '2026-08-25T08:00:00.000Z', quotaWindows: [{ kind: 'weekly', remainingPercent: 98, resetAt: '2026-08-30T10:00:00.000Z', durationSeconds: 604800 }] },
      { observedAt: '2026-08-26T08:00:00.000Z', quotaWindows: [{ kind: 'weekly', remainingPercent: 96, resetAt: '2026-08-30T10:00:00.000Z', durationSeconds: 604800 }] },
      { observedAt: '2026-08-27T08:00:00.000Z', quotaWindows: [{ kind: 'weekly', remainingPercent: 94, resetAt: '2026-08-30T10:00:00.000Z', durationSeconds: 604800 }] },
      { observedAt: '2026-08-28T08:00:00.000Z', quotaWindows: [{ kind: 'weekly', remainingPercent: 93, resetAt: '2026-08-30T10:00:00.000Z', durationSeconds: 604800 }] },
    ],
    asOf: '2026-08-28',
  })

  assert.equal(dashboard.plan, 'pro')
  assert.equal(dashboard.accountEmail, 'dorck@example.com')
  assert.equal(dashboard.accountName, 'Dorck')
  assert.equal(dashboard.quotaWindows[0].remainingPercent, 72)
  assert.deepEqual(dashboard.activity, {
    fiveHourUsedPercent: 28,
    weeklyUsedPercent: 7,
    observedActiveDays: 5,
    currentStreakDays: 3,
    longestStreakDays: 3,
    sampleCount: 7,
  })
  assert.equal(dashboard.lastSyncedAt, '2026-08-28T07:55:00.000Z')
  assert.deepEqual(dashboard.dailyUsage, [
    { date: '2026-08-22', consumedPercent: 0 },
    { date: '2026-08-23', consumedPercent: 1 },
    { date: '2026-08-24', consumedPercent: 1 },
    { date: '2026-08-25', consumedPercent: 0 },
    { date: '2026-08-26', consumedPercent: 2 },
    { date: '2026-08-27', consumedPercent: 2 },
    { date: '2026-08-28', consumedPercent: 1 },
  ])
})

test('does not invent quota or activity values when data is unavailable', () => {
  const dashboard = buildCodexUsageDashboard({
    generatedAt: '2026-08-28T08:00:00.000Z',
    account: { status: 'signed_out', fetchedAt: null, plan: null, email: null, name: null, subscriptionExpiresAt: null },
    quotaWindows: [],
    usageSamples: [],
    asOf: '2026-08-28',
  })

  assert.equal(dashboard.plan, null)
  assert.equal(dashboard.accountEmail, null)
  assert.equal(dashboard.accountName, null)
  assert.deepEqual(dashboard.quotaWindows, [])
  assert.deepEqual(dashboard.activity, {
    fiveHourUsedPercent: null,
    weeklyUsedPercent: null,
    observedActiveDays: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    sampleCount: 0,
  })
  assert.equal(dashboard.dailyUsage.length, 7)
  assert.ok(dashboard.dailyUsage.every((day) => day.consumedPercent === 0))
})

test('builds visible labels for usage rhythm bars', () => {
  const bars = buildUsageRhythmBars([
    { date: '2026-08-25', totalTokens: 0 },
    { date: '2026-08-26', totalTokens: 1400 },
    { date: '2026-08-27', totalTokens: 12500 },
  ])

  assert.deepEqual(bars.map((bar) => ({
    dateLabel: bar.dateLabel,
    valueLabel: bar.valueLabel,
    heightPercent: bar.heightPercent,
    isEmpty: bar.isEmpty,
  })), [
    { dateLabel: '08/25', valueLabel: '0', heightPercent: 10, isEmpty: true },
    { dateLabel: '08/26', valueLabel: '1.4K', heightPercent: 11, isEmpty: false },
    { dateLabel: '08/27', valueLabel: '12.5K', heightPercent: 100, isEmpty: false },
  ])
})

test('builds visible labels for observed account consumption bars', () => {
  const bars = buildUsageRhythmPercentBars([
    { date: '2026-08-27', consumedPercent: 0 },
    { date: '2026-08-28', consumedPercent: 3 },
  ])

  assert.deepEqual(bars.map((bar) => ({
    valueLabel: bar.valueLabel,
    heightPercent: bar.heightPercent,
    isEmpty: bar.isEmpty,
  })), [
    { valueLabel: '0%', heightPercent: 10, isEmpty: true },
    { valueLabel: '3%', heightPercent: 100, isEmpty: false },
  ])
})
