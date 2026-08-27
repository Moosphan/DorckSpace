import assert from 'node:assert/strict'
import test from 'node:test'
import { createGuestResetRadarSnapshot, getResetRadarTone } from '../src/shared/reset-radar'
import { buildPublicResetRadarSnapshot, parseOpenAIStatusPayload } from '../src/main/services/reset-radar/public-signal'
import { hasChatGPTSessionCookie, waitForChatGPTSession } from '../src/main/services/reset-radar/account-session'
import { normalizeChatGPTUsage, normalizeResetCredits } from '../src/main/services/reset-radar/account-usage'

test('guest radar snapshot never presents private quota data', () => {
  const snapshot = createGuestResetRadarSnapshot('2026-08-27T00:00:00.000Z')

  assert.equal(snapshot.account.status, 'signed_out')
  assert.equal(snapshot.account.limitReached, null)
  assert.equal(snapshot.quotaWindows.length, 0)
  assert.equal(snapshot.resetCredits, null)
  assert.equal(snapshot.forecast.confidence, 'low')
})

test('radar tone follows deterministic confidence and signal state', () => {
  assert.equal(getResetRadarTone('low', false), 'quiet')
  assert.equal(getResetRadarTone('medium', true), 'watch')
  assert.equal(getResetRadarTone('high', true), 'active')
})

test('parses an operational OpenAI status response without creating a reset signal', () => {
  const status = parseOpenAIStatusPayload({
    status: { indicator: 'none', description: 'All Systems Operational' },
    incidents: [],
  }, '2026-08-28T00:00:00.000Z')

  assert.equal(status.indicator, 'none')
  assert.equal(status.incidentCount, 0)
  assert.equal(status.sourceStatus, 'ok')
  assert.equal(buildPublicResetRadarSnapshot(status).activeSignal, null)
})

test('turns a public service incident into a cautious radar signal', () => {
  const status = parseOpenAIStatusPayload({
    status: { indicator: 'minor', description: 'Some systems are experiencing issues' },
    incidents: [{ name: 'Elevated errors for Codex' }],
  }, '2026-08-28T00:00:00.000Z')

  const snapshot = buildPublicResetRadarSnapshot(status)

  assert.equal(snapshot.activeSignal?.source, 'OpenAI Status')
  assert.equal(snapshot.activeSignal?.confidence, 'medium')
  assert.equal(snapshot.forecast.confidence, 'medium')
  assert.equal(snapshot.sources[0].status, 'warn')
})

test('recognizes a persisted ChatGPT session without exposing cookie values', () => {
  assert.equal(hasChatGPTSessionCookie([{ name: '__Secure-next-auth.session-token', value: 'secret' }]), true)
  assert.equal(hasChatGPTSessionCookie([{ name: '__Secure-next-auth.session-token.0', value: 'secret-part' }]), true)
  assert.equal(hasChatGPTSessionCookie([{ name: 'oai-did', value: 'device-only' }]), false)
  assert.equal(hasChatGPTSessionCookie([]), false)
})

test('waits for a session cookie that is written just after login', async () => {
  let reads = 0
  const status = await waitForChatGPTSession(async () => {
    reads += 1
    return reads === 1
      ? []
      : [{ name: '__Secure-next-auth.session-token.0', value: 'secret-part' }]
  }, { attempts: 2, delayMs: 0 })

  assert.equal(status, 'connected')
  assert.equal(reads, 2)
})

test('normalizes ChatGPT usage windows and reset credits', () => {
  const usage = normalizeChatGPTUsage({
    plan_type: 'pro',
    rate_limit: {
      primary_window: {
        used_percent: 72,
        limit_window_seconds: 18000,
        reset_after_seconds: 3600,
        limit_reached: false,
      },
      secondary_window: {
        used_percent: 35,
        limit_window_seconds: 604800,
        reset_at: '2026-08-28T06:00:00.000Z',
      },
    },
  }, '2026-08-28T05:00:00.000Z')

  assert.equal(usage?.plan, 'pro')
  assert.equal(usage?.windows[0].kind, 'five_hour')
  assert.equal(usage?.windows[0].remainingPercent, 28)
  assert.equal(usage?.windows[1].kind, 'weekly')
  assert.equal(usage?.limitReached, false)

  const credits = normalizeResetCredits({
    available_count: 2,
    credits: [
      { status: 'available', expires_at: '2026-08-29T00:00:00.000Z' },
      { status: 'redeemed', expires_at: '2026-08-28T00:00:00.000Z' },
    ],
  }, '2026-08-28T05:00:00.000Z')

  assert.deepEqual(credits, {
    availableCount: 2,
    nearestExpiry: '2026-08-29T00:00:00.000Z',
  })
})
