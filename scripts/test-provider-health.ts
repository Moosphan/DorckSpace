import assert from 'node:assert/strict'
import test from 'node:test'
import { NotificationDeduper, resolveProviderHealth } from '../src/main/services/provider-health'

test('marks fixture and expired providers explicitly', () => {
  const checkedAt = '2026-08-28T10:00:00.000Z'
  assert.equal(resolveProviderHealth({ activeBackend: 'fixture', checkedAt, expiresAt: '2026-08-28T11:00:00.000Z', now: checkedAt }).status, 'fixture')
  assert.equal(resolveProviderHealth({ activeBackend: 'public-web', checkedAt, expiresAt: '2026-08-28T09:00:00.000Z', now: checkedAt }).status, 'stale')
  assert.equal(resolveProviderHealth({ activeBackend: 'public-web', checkedAt, expiresAt: null, error: 'HTTP 503', now: checkedAt }).status, 'error')
})

test('suppresses duplicate notifications during the quiet window', () => {
  const deduper = new NotificationDeduper(60_000)
  assert.equal(deduper.shouldNotify('reset:x-123', 1_000), true)
  assert.equal(deduper.shouldNotify('reset:x-123', 30_000), false)
  assert.equal(deduper.shouldNotify('reset:x-123', 61_000), true)
  assert.equal(deduper.shouldNotify('reset:x-456', 30_000), true)
})
