import Database from 'better-sqlite3'
import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { runMigrations } from '../src/main/database/migrations'
import { SocialTrendingRepository } from '../src/main/database/repositories/social-trending-repository'
import { SocialTrendingService } from '../src/main/services/trending/social-trending-service'
import {
  TRENDING_PLATFORMS,
  type TrendingItem,
  type TrendingPeriod,
} from '../src/shared/social-trending'

process.env.NODE_ENV = 'test'
process.env.TRENDING_ALLOW_FIXTURES = '1'
process.env.TRENDING_FETCH_TIMEOUT_MS = process.env.TRENDING_FETCH_TIMEOUT_MS || '2500'

interface AssertionResult {
  name: string
  ok: boolean
  detail?: string
}

const assertions: AssertionResult[] = []

function assert(name: string, condition: boolean, detail?: string): void {
  assertions.push({ name, ok: condition, detail })
  const marker = condition ? 'OK' : 'FAIL'
  console.log(`${marker.padEnd(5)} ${name}${detail ? ` - ${detail}` : ''}`)
}

function assertSortedByHeat(name: string, items: TrendingItem[]): void {
  const sorted = items.every((item, index) => index === 0 || items[index - 1].heatScore >= item.heatScore)
  assert(name, sorted, `scores=${items.slice(0, 3).map((item) => item.heatScore).join(',')}`)
}

async function main() {
  await runFixtureLoopTest()
  await runMockLiveProviderTest()
  await runV2exProviderTest()
  await runV2exFallbackProviderTest()

  const failed = assertions.filter((item) => !item.ok)
  console.log('\n' + '='.repeat(72))
  console.log(`Assertions: ${assertions.length} | Passed: ${assertions.length - failed.length} | Failed: ${failed.length}`)

  if (failed.length > 0) {
    console.log('\nFailed assertions:')
    for (const item of failed) console.log(`- ${item.name}${item.detail ? `: ${item.detail}` : ''}`)
    process.exit(1)
  }
  process.exit(0)
}

async function runV2exProviderTest() {
  console.log('\nTesting V2EX provider...\n')

  const server = await startMockTrendingServer()
  const baseUrl = `http://127.0.0.1:${server.port}`
  const previousEnv = snapshotEnv([
    'TRENDING_ALLOW_FIXTURES',
    'V2EX_HOT_URL',
  ])

  process.env.TRENDING_ALLOW_FIXTURES = '0'
  process.env.V2EX_HOT_URL = `${baseUrl}/v2ex/hot.json`

  try {
    const db = new Database(':memory:')
    runMigrations(db)
    const repo = new SocialTrendingRepository(db)
    const service = new SocialTrendingService(repo)
    const result = await service.refresh('v2ex', 'day', 10)
    const items = repo.getItems('v2ex', 'day', 10)
    assert('v2ex-provider: refresh status ok', result.status === 'ok', result.message)
    assert('v2ex-provider: at least 10 items', items.length >= 10, `count=${items.length}`)
    assert('v2ex-provider: source is focused v2ex', items.every((item) => item.source.startsWith('v2ex:')))
    assert('v2ex-provider: indie developer focused', items.every(isIndieDeveloperItem))
    assertSortedByHeat('v2ex-provider: heat desc', items)
    db.close()
  } finally {
    restoreEnv(previousEnv)
    await server.close()
  }
}

async function runV2exFallbackProviderTest() {
  console.log('\nTesting V2EX local fallback when live endpoints are unavailable...\n')

  const previousEnv = snapshotEnv([
    'TRENDING_ALLOW_FIXTURES',
    'V2EX_HOT_URL',
    'V2EX_RSSHUB_ROUTE',
  ])

  process.env.TRENDING_ALLOW_FIXTURES = '1'
  process.env.V2EX_HOT_URL = 'http://127.0.0.1:9/v2ex-down.json'
  process.env.V2EX_RSSHUB_ROUTE = 'http://127.0.0.1:9/v2ex-down.xml'

  try {
    const db = new Database(':memory:')
    runMigrations(db)
    const repo = new SocialTrendingRepository(db)
    const service = new SocialTrendingService(repo)
    const result = await service.refresh('v2ex', 'day', 10)
    const items = repo.getItems('v2ex', 'day', 10)
    assert('v2ex-fallback: refresh status fixture', result.status === 'fixture', result.message)
    assert('v2ex-fallback: at least 10 items', items.length >= 10, `count=${items.length}`)
    assert('v2ex-fallback: source is local fallback', items.every((item) => item.source === 'v2ex:local-fallback'))
    assert('v2ex-fallback: tags are meaningful', items.every((item) => item.tags.length > 0 && !item.tags.includes('V2EX')))
    db.close()
  } finally {
    restoreEnv(previousEnv)
  }
}

async function runFixtureLoopTest() {
  process.env.TRENDING_ALLOW_FIXTURES = '1'
  const db = new Database(':memory:')
  runMigrations(db)
  const repo = new SocialTrendingRepository(db)
  const service = new SocialTrendingService(repo)
  const periods: TrendingPeriod[] = ['day', 'week', 'month']

  console.log('Testing social trending provider/service loop...\n')

  for (const period of periods) {
    const dashboard = await service.getDashboard({ period, limit: 10, forceRefresh: true })
    assert(`${period}: dashboard period`, dashboard.period === period)
    assert(`${period}: all platform columns`, dashboard.columns.length === TRENDING_PLATFORMS.length)

    for (const platform of TRENDING_PLATFORMS) {
      const column = dashboard.columns.find((item) => item.platform === platform)
      assert(`${period}/${platform}: column exists`, Boolean(column))
      if (!column) continue

      assert(`${period}/${platform}: at least 10 items`, column.items.length >= 10, `count=${column.items.length}`)
      assertSortedByHeat(`${period}/${platform}: heat desc`, column.items)
      assert(`${period}/${platform}: required fields`, column.items.every(hasRequiredFields))
      if (platform === 'xiaohongshu' || platform === 'douyin' || platform === 'v2ex') {
        assert(`${period}/${platform}: indie developer focused`, column.items.every(isIndieDeveloperItem))
      }
      assert(`${period}/${platform}: refresh state saved`, Boolean(repo.getRefreshState(platform, period)))
      assert(`${period}/${platform}: cache saved`, repo.getItems(platform, period, 10).length >= 10)
    }
  }

  const cached = await service.getDashboard({ period: 'day', limit: 10, forceRefresh: false })
  assert('cache read: all columns still available', cached.columns.length === TRENDING_PLATFORMS.length)
  assert('cache read: no empty columns', cached.columns.every((column) => column.items.length >= 10))

  const doctor = await service.doctor()
  assert('doctor: all providers reported', doctor.length === TRENDING_PLATFORMS.length)
  assert('doctor: known statuses only', doctor.every((item) => ['ok', 'warn', 'stale', 'fixture', 'off', 'error'].includes(item.status)))

  db.close()
}

async function runMockLiveProviderTest() {
  console.log('\nTesting mock live provider backends without fixture fallback...\n')

  const server = await startMockTrendingServer()
  const baseUrl = `http://127.0.0.1:${server.port}`
  const previousEnv = snapshotEnv([
    'TRENDING_ALLOW_FIXTURES',
    'PRODUCTHUNT_FEED_URL',
    'V2EX_HOT_URL',
    'XIAOHONGSHU_PUBLIC_EXPLORE_URL',
    'DOUYIN_PUBLIC_HOT_URL',
  ])

  process.env.TRENDING_ALLOW_FIXTURES = '0'
  delete process.env.PRODUCTHUNT_TOKEN
  process.env.PRODUCTHUNT_FEED_URL = `${baseUrl}/producthunt/feed`
  process.env.V2EX_HOT_URL = `${baseUrl}/v2ex/hot.json`
  process.env.XIAOHONGSHU_PUBLIC_EXPLORE_URL = `${baseUrl}/xiaohongshu/explore`
  process.env.DOUYIN_PUBLIC_HOT_URL = `${baseUrl}/douyin/hot`

  try {
    const db = new Database(':memory:')
    runMigrations(db)
    const repo = new SocialTrendingRepository(db)
    const service = new SocialTrendingService(repo)

    const dashboard = await service.getDashboard({ period: 'day', limit: 10, forceRefresh: true })
    assert('mock-live: all platform columns', dashboard.columns.length === TRENDING_PLATFORMS.length)

    for (const platform of TRENDING_PLATFORMS) {
      const column = dashboard.columns.find((item) => item.platform === platform)
      assert(`mock-live/${platform}: column exists`, Boolean(column))
      if (!column) continue
      assert(`mock-live/${platform}: at least 10 items`, column.items.length >= 10, `count=${column.items.length}`)
      assertSortedByHeat(`mock-live/${platform}: heat desc`, column.items)
      assert(`mock-live/${platform}: no fixture source`, column.items.every((item) => item.source !== 'fixture'))
      if (platform === 'xiaohongshu' || platform === 'douyin' || platform === 'v2ex') {
        assert(`mock-live/${platform}: indie developer focused`, column.items.every(isIndieDeveloperItem))
      }
      if (platform !== 'v2ex') {
        assert(`mock-live/${platform}: public source`, column.items.every((item) => item.source.includes('public')))
      }
      if (platform === 'douyin') {
        assert('mock-live/douyin: nested author parsed', column.items[0]?.author === '抖音作者 1', column.items[0]?.author)
      }
      assert(`mock-live/${platform}: cached`, repo.getItems(platform, 'day', 10).length >= 10)
      const state = repo.getRefreshState(platform, 'day')
      assert(`mock-live/${platform}: provider ok`, state?.status === 'ok', state?.message)
    }

    db.close()
  } finally {
    restoreEnv(previousEnv)
    await server.close()
  }
}

function hasRequiredFields(item: TrendingItem): boolean {
  return Boolean(
    item.title
    && item.url
    && item.author
    && typeof item.heatScore === 'number'
    && item.heatLabel
    && Array.isArray(item.tags)
    && item.tags.length > 0
    && item.category
    && item.source
    && item.fetchedAt
    && item.expiresAt,
  )
}

function isIndieDeveloperItem(item: TrendingItem): boolean {
  const text = `${item.title} ${item.category} ${item.tags.join(' ')}`.toLowerCase()
  return [
    '独立开发',
    '个人开发',
    'saas',
    'ai 工具',
    '开发者工具',
    '产品增长',
    '出海',
    '开源商业化',
    'electron',
    'product hunt',
  ].some((keyword) => text.includes(keyword.toLowerCase()))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

function snapshotEnv(keys: string[]): Record<string, string | undefined> {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]))
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

async function startMockTrendingServer(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = createServer((req, res) => {
    routeMockRequest(req, res)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Failed to start mock server')
  return {
    port: address.port,
    close: () => new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve())),
  }
}

function routeMockRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/producthunt/feed') {
    sendXml(res, mockProductHuntFeed())
    return
  }
  if (url.pathname === '/v2ex/hot.json') {
    sendJson(res, mockV2exHot())
    return
  }
  if (url.pathname === '/xiaohongshu/explore') {
    sendHtml(res, mockXiaohongshuExploreHtml())
    return
  }
  if (url.pathname === '/douyin/hot') {
    sendJson(res, mockDouyinHotSearch())
    return
  }
  res.statusCode = 404
  res.end('not found')
}

function sendJson(res: ServerResponse, body: unknown): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function sendXml(res: ServerResponse, body: string): void {
  res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8')
  res.end(body)
}

function sendHtml(res: ServerResponse, body: string): void {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(body)
}

function mockProductHuntFeed(): string {
  const entries = Array.from({ length: 10 }, (_, index) => `
    <entry>
      <id>tag:producthunt.com,2026:mock-${index + 1}</id>
      <title>Mock Product ${index + 1}</title>
      <updated>${new Date(Date.now() - index * 3600_000).toISOString()}</updated>
      <link rel="alternate" type="text/html" href="https://www.producthunt.com/products/mock-${index + 1}"/>
      <author><name>Maker ${index + 1}</name></author>
      <summary>Launch summary ${index + 1}</summary>
    </entry>
  `).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Product Hunt</title>${entries}</feed>`
}

function mockDouyinHotSearch() {
  return {
    active_time: new Date().toISOString(),
    status_code: 0,
    word_list: Array.from({ length: 10 }, (_, index) => ({
      word: index % 2 === 0 ? `独立开发者 AI 工具冷启动 ${index + 1}` : `个人开发者 SaaS 增长复盘 ${index + 1}`,
      hot_value: 9000 - index * 500,
      label: index % 4,
      user: {
        nickname: `抖音作者 ${index + 1}`,
      },
      tags: index % 2 === 0 ? ['独立开发', 'AI 工具', '独立开发'] : ['个人开发者', 'SaaS'],
    })),
  }
}

function mockXiaohongshuExploreHtml(): string {
  const feeds = Array.from({ length: 10 }, (_, index) => ({
    id: `xhs-public-${index + 1}`,
    trackId: `xhs-public-${index + 1}`,
    xsecToken: `mock-xsec-token-${index + 1}`,
    noteCard: {
      type: index % 2 === 0 ? 'normal' : 'video',
      displayTitle: index % 2 === 0 ? `独立开发者做 AI 工具复盘 ${index + 1}` : `个人开发者副业项目增长 ${index + 1}`,
      user: {
        nickname: `小红书用户 ${index + 1}`,
        userId: `xhs-user-${index + 1}`,
      },
      interactInfo: {
        likedCount: index === 0 ? '1.2万' : String(9000 - index * 500),
      },
    },
  }))
  const state = JSON.stringify({ feed: { feeds } })
  return `<!doctype html><html><body><script>window.__INITIAL_STATE__=${state}</script></body></html>`
}

function mockV2exHot() {
  return Array.from({ length: 10 }, (_, index) => ({
    id: 2000 + index,
    title: `V2EX hot topic ${index + 1}`,
    url: `https://www.v2ex.com/t/${2000 + index}`,
    content_rendered: `<p>V2EX hot topic summary ${index + 1}</p>`,
    replies: 300 - index * 10,
    created: Math.floor((Date.now() - index * 3600_000) / 1000),
    member: { username: `v2ex-user-${index + 1}` },
    node: { title: index % 2 === 0 ? 'AI' : '程序员', name: index % 2 === 0 ? 'ai' : 'programmer' },
  }))
}
