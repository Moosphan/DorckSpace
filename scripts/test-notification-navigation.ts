import assert from 'node:assert/strict'
import test from 'node:test'
import { createNotificationNavigationPayload, normalizeNotificationRoute } from '../src/shared/notification-navigation'

test('builds notification routes for task details', () => {
  assert.deepEqual(createNotificationNavigationPayload({ type: 'task', taskId: 42 }), {
    route: '/dashboard?taskId=42',
  })
})

test('builds notification routes for AI reset radar details', () => {
  assert.deepEqual(createNotificationNavigationPayload({ type: 'reset-radar', signalId: 'reset-2026-08-31' }), {
    route: '/ai-lab?panel=reset-radar&signalId=reset-2026-08-31',
  })
})

test('builds notification routes for insight articles and trending panels', () => {
  assert.deepEqual(createNotificationNavigationPayload({ type: 'rss-article', articleId: 7 }), {
    route: '/insights?articleId=7',
  })
  assert.deepEqual(createNotificationNavigationPayload({ type: 'insights-trending', platform: 'producthunt', period: 'day' }), {
    route: '/insights?panel=trending&platform=producthunt&period=day',
  })
})

test('rejects unsafe or unsupported notification routes', () => {
  assert.equal(normalizeNotificationRoute('https://example.com/dashboard'), null)
  assert.equal(normalizeNotificationRoute('javascript:alert(1)'), null)
  assert.equal(normalizeNotificationRoute('/settings'), null)
  assert.equal(normalizeNotificationRoute('/dashboard?taskId=42'), '/dashboard?taskId=42')
})
