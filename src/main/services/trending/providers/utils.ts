import { exec } from 'child_process'
import { createHash } from 'crypto'
import { promisify } from 'util'
import Parser from 'rss-parser'
import type {
  TrendingItem,
  TrendingPeriod,
  TrendingPlatform,
  TrendingProviderHealth,
} from '../../../../shared/social-trending'
import { formatTrendingHeat } from '../../../../shared/social-trending'
import type { BackendConfig, FetchTrendingOptions } from './types'

const execAsync = promisify(exec)
const parser = new Parser()

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

export function getBackendConfig(): BackendConfig {
  const fixtureMode = process.env.TRENDING_ALLOW_FIXTURES
  const nodeEnv = process.env.NODE_ENV
  return {
    rsshubBaseUrl: process.env.TRENDING_RSSHUB_BASE || 'https://rsshub.app',
    allowFixtures: fixtureMode === undefined ? nodeEnv !== 'production' : fixtureMode === '1',
    fetchTimeoutMs: Number(process.env.TRENDING_FETCH_TIMEOUT_MS || 12000),
    userAgent: process.env.TRENDING_USER_AGENT || DEFAULT_USER_AGENT,
  }
}

export async function fetchJson<T>(url: string, config: BackendConfig, headers: Record<string, string> = {}): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.fetchTimeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': config.userAgent,
        ...headers,
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json() as T
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchText(url: string, config: BackendConfig, headers: Record<string, string> = {}): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.fetchTimeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html, application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': config.userAgent,
        ...headers,
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchRssItems(url: string, config: BackendConfig) {
  const xml = await fetchText(url, config)
  return parser.parseString(xml)
}

export async function runJsonCommand<T>(command: string, timeoutMs: number): Promise<T> {
  const { stdout } = await execAsync(command, {
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024 * 8,
    env: process.env,
  })
  return JSON.parse(stdout) as T
}

export function nowHealth(
  platform: TrendingPlatform,
  backends: string[],
  status: TrendingProviderHealth['status'],
  message: string,
  activeBackend?: string,
): TrendingProviderHealth {
  return {
    platform,
    status,
    message,
    activeBackend,
    checkedAt: new Date().toISOString(),
    backends,
  }
}

export function hashId(parts: (string | number | null | undefined)[]): string {
  return createHash('sha1')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 20)
}

export function normalizeTags(tags: unknown, fallback: string[] = []): string[] {
  if (!tags) return fallback
  const values = Array.isArray(tags) ? tags : String(tags).split(/[,\s#，、]+/)
  return cleanTags(values, fallback)
}

export function cleanTags(tags: unknown[], fallback: string[] = []): string[] {
  const blocked = new Set([
    'hot',
    'general',
    'unknown',
    'normal',
    '热搜',
    '热点',
    '高热',
    '新热',
    '推荐',
    '榜单标签',
    '榜单标签1',
    '榜单标签2',
    '榜单标签3',
    '小红书',
    '抖音',
    'producthunt',
    'product hunt',
    'v2ex',
    'hulkdash',
  ])

  const result = tags
    .map((tag) => String(tag).trim().replace(/^#/, ''))
    .filter(Boolean)
    .filter((tag) => !blocked.has(tag.toLowerCase()))
    .filter((tag, index, arr) => arr.findIndex((item) => item.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, 5)
  return result.length > 0 ? result : fallback
}

export function isIndieDeveloperTopic(...values: unknown[]): boolean {
  const text = values.map((value) => String(value ?? '')).join(' ').toLowerCase()
  return INDIE_DEVELOPER_MATCHERS.some(({ keys }) => keys.some((key) => text.includes(key.toLowerCase())))
}

export function inferIndieDeveloperTags(...values: unknown[]): string[] {
  const text = values.map((value) => String(value ?? '')).join(' ').toLowerCase()
  const tags = INDIE_DEVELOPER_MATCHERS
    .filter(({ keys }) => keys.some((key) => text.includes(key.toLowerCase())))
    .map(({ tag }) => tag)
  return cleanTags(tags, ['独立开发'])
}

export function focusIndieDeveloperItems(
  platform: Extract<TrendingPlatform, 'xiaohongshu' | 'douyin' | 'v2ex'>,
  items: TrendingItem[],
  options: FetchTrendingOptions,
): { items: TrendingItem[]; supplemented: boolean } {
  const focused = items
    .filter((item) => isIndieDeveloperTopic(item.title, item.summary, item.category, item.tags.join(' ')))
    .map((item) => ({
      ...item,
      tags: inferIndieDeveloperTags(item.title, item.summary, item.category, item.tags.join(' ')),
      category: normalizeIndieCategory(item.category, item.title, item.summary),
    }))

  const seen = new Set(focused.map((item) => item.externalId || item.url))
  const fallback = buildIndieDeveloperFallbackItems(platform, options)
    .filter((item) => {
      const key = item.externalId || item.url
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  const limit = Math.max(options.limit, 10)
  return {
    items: [...focused, ...fallback].slice(0, limit),
    supplemented: focused.length < limit,
  }
}

export function buildIndieDeveloperFallbackItems(
  platform: Extract<TrendingPlatform, 'xiaohongshu' | 'douyin' | 'v2ex'>,
  options: FetchTrendingOptions,
): TrendingItem[] {
  const platformLabel = {
    xiaohongshu: '小红书',
    douyin: '抖音',
    v2ex: 'V2EX',
  }[platform]
  const source = {
    xiaohongshu: 'xiaohongshu:indie-fallback',
    douyin: 'douyin:indie-fallback',
    v2ex: 'v2ex:local-fallback',
  }[platform]
  const home = {
    xiaohongshu: 'https://www.xiaohongshu.com/search_result?keyword=%E7%8B%AC%E7%AB%8B%E5%BC%80%E5%8F%91',
    douyin: 'https://www.douyin.com/search/%E7%8B%AC%E7%AB%8B%E5%BC%80%E5%8F%91',
    v2ex: 'https://www.v2ex.com/?tab=hot',
  }[platform]
  const topics: Array<[string, string, string, number]> = [
    ['独立开发', '独立开发者如何找到第一个愿意付费的用户？', 'maker-lab', 96],
    ['个人开发者', '一个人做产品，最容易被低估的不是代码而是分发', 'solo-build', 84],
    ['AI 工具', '用 AI 自动整理用户反馈，我把周报时间从 3 小时压到 20 分钟', 'ai-maker', 78],
    ['SaaS', '小而美 SaaS 的定价页应该先验证哪三个指标？', 'tiny-saas', 72],
    ['出海', '面向海外开发者工具的冷启动复盘：从 0 到第一批种子用户', 'global-maker', 66],
    ['增长', '个人项目没有预算，如何用内容和社区做第一波增长？', 'growth-dev', 61],
    ['效率工具', '把自己每天重复操作做成桌面工具后，意外收获了付费用户', 'desktop-kit', 55],
    ['开源', '开源项目商业化之前，应该先补齐哪些基础设施？', 'open-builder', 49],
    ['Product Hunt', 'Product Hunt 发布当天应该准备的素材清单', 'launch-day', 44],
    ['Electron', 'Electron 小工具从脚本到产品的打磨清单', 'electron-solo', 39],
  ]
  return topics.map(([category, title, author, heat], index) => ({
    platform,
    period: options.period,
    externalId: `${platform}-indie-${options.period}-${index + 1}`,
    title,
    url: `${home}${home.includes('?') ? '&' : '?'}hulkdash_indie_rank=${index + 1}`,
    author: platform === 'douyin' ? `${platformLabel}创作者` : author,
    publishedAt: new Date(Date.now() - (index + 1) * 3600_000).toISOString(),
    heatScore: heat * 100 + (topics.length - index) * 10,
    heatLabel: platform === 'v2ex' ? `${heat} 回复` : `${formatTrendingHeat(heat * 100)} 热度`,
    tags: inferIndieDeveloperTags(category, title),
    category,
    summary: `${platformLabel} 当前公开源缺少足够独立开发者主题内容时的同主题兜底。`,
    rawMetrics: { heat, rank: index + 1, fallback: '1' },
    source,
    fetchedAt: options.fetchedAt,
    expiresAt: options.expiresAt,
  }))
}

export function normalizeIndieCategory(category: string, ...values: unknown[]): string {
  const tags = inferIndieDeveloperTags(category, ...values)
  return tags[0] || category || '独立开发'
}

const INDIE_DEVELOPER_MATCHERS: Array<{ tag: string; keys: string[] }> = [
  { tag: '独立开发', keys: ['独立开发', 'indie hacker', 'indiehackers', 'indie maker', 'indie dev', 'solo founder'] },
  { tag: '个人开发者', keys: ['个人开发者', '一个人开发', 'solo developer', 'solo dev', 'side project', '副业项目'] },
  { tag: 'SaaS', keys: ['saas', '订阅制', 'mrr', 'arr', '付费用户', '定价页'] },
  { tag: 'AI 工具', keys: ['ai 工具', 'ai工具', 'agent', 'llm', 'gpt', 'rag', '大模型'] },
  { tag: '开发者工具', keys: ['开发者工具', 'devtool', 'developer tool', 'github', 'api', 'sdk', 'electron', 'typescript'] },
  { tag: '产品增长', keys: ['增长', '冷启动', '获客', '用户反馈', '转化率', '留存', 'product hunt', 'launch'] },
  { tag: '出海', keys: ['出海', '海外用户', '海外市场', 'global', 'stripe', 'paddle'] },
  { tag: '开源商业化', keys: ['开源商业化', 'open source', '开源项目', 'github sponsor'] },
]

export function toIsoDate(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'number') {
    const ms = value > 10_000_000_000 ? value : value * 1000
    return new Date(ms).toISOString()
  }
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export function buildFixtureItems(
  platform: TrendingPlatform,
  period: TrendingPeriod,
  limit: number,
  options: FetchTrendingOptions,
): TrendingItem[] {
  const platformNames: Record<TrendingPlatform, string> = {
    xiaohongshu: '小红书',
    douyin: '抖音',
    producthunt: 'Product Hunt',
    v2ex: 'V2EX',
  }
  const categories: Record<TrendingPlatform, string[]> = {
    xiaohongshu: ['AI 工具', '效率工作台', '创作者增长', '灵感笔记'],
    douyin: ['科技热点', '效率技巧', 'AI 应用', '创意视频'],
    producthunt: ['Productivity', 'AI', 'Developer Tools', 'Design Tools'],
    v2ex: ['程序员', '分享发现', 'AI', '酷工作'],
  }
  const home: Record<TrendingPlatform, string> = {
    xiaohongshu: 'https://www.xiaohongshu.com',
    douyin: 'https://www.douyin.com',
    producthunt: 'https://www.producthunt.com',
    v2ex: 'https://www.v2ex.com',
  }
  const count = Math.max(limit, 10)
  return Array.from({ length: count }, (_, index) => {
    const rank = index + 1
    const heatScore = (count - index) * 1000 + (period === 'month' ? 300 : period === 'week' ? 150 : 30)
    const category = categories[platform][index % categories[platform].length]
    return {
      platform,
      period,
      externalId: `fixture-${period}-${rank}`,
      title: `${platformNames[platform]} ${period} hot signal #${rank}`,
      url: `${home[platform]}?hulkdash_trending_fixture=${period}-${rank}`,
      author: `${platformNames[platform]} Creator ${rank}`,
      publishedAt: new Date(Date.now() - rank * 60 * 60 * 1000).toISOString(),
      heatScore,
      heatLabel: formatTrendingHeat(heatScore),
      tags: [category, 'HulkDash', period],
      category,
      summary: 'Fixture data used only for local validation when live providers are unavailable.',
      rawMetrics: { rank, heatScore, fixture: '1' },
      source: 'fixture',
      fetchedAt: options.fetchedAt,
      expiresAt: options.expiresAt,
    }
  })
}
