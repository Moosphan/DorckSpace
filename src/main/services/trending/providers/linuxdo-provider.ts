import type { TrendingItem } from '../../../../shared/social-trending'
import type { FetchTrendingOptions, FetchTrendingResult, TrendingProvider } from './types'
import {
  cleanTags,
  focusIndieDeveloperItems,
  fetchJson,
  fetchRssItems,
  getBackendConfig,
  nowHealth,
  toIsoDate,
} from './utils'

interface V2exHotTopic {
  id: number
  title: string
  url?: string
  content_rendered?: string
  replies?: number
  created?: number
  member?: {
    username?: string
  }
  node?: {
    title?: string
    name?: string
  }
}

export class LinuxDoProvider implements TrendingProvider {
  platform = 'v2ex' as const
  backends = ['v2ex-hot', 'v2ex-rsshub', 'fixture']

  async check() {
    const config = getBackendConfig()
    try {
      await fetchJson<V2exHotTopic[]>(getV2exHotUrls()[0], config, v2exHeaders())
      return nowHealth(this.platform, this.backends, 'ok', 'V2EX hot topics API is reachable.', 'v2ex-hot')
    } catch (err) {
      try {
        await fetchRssItems(getV2exRsshubUrl(), config)
        return nowHealth(this.platform, this.backends, 'warn', 'V2EX API unavailable; RSSHub route is reachable.', 'v2ex-rsshub')
      } catch { /* keep original error for diagnostics */ }
      if (config.allowFixtures) {
        return nowHealth(this.platform, this.backends, 'warn', `V2EX API unavailable; local fallback enabled. ${(err as Error).message}`, 'fixture')
      }
      return nowHealth(this.platform, this.backends, 'error', `V2EX API unavailable: ${(err as Error).message}`, 'v2ex-hot')
    }
  }

  async fetchTrending(options: FetchTrendingOptions): Promise<FetchTrendingResult> {
    const config = getBackendConfig()
    const errors: string[] = []

    try {
      const items = await fetchV2exHot(options)
      if (items.length > 0) {
        const focused = focusIndieDeveloperItems(this.platform, items, options)
        return {
          items: focused.items,
          activeBackend: focused.supplemented ? 'v2ex-hot+indie-fallback' : 'v2ex-hot',
          message: focused.supplemented
            ? `Fetched ${items.length} V2EX topics; supplemented indie developer topics to keep 10 focused results.`
            : `Fetched ${focused.items.length} V2EX indie developer topics.`,
        }
      }
      errors.push('v2ex-hot: source returned no topics')
    } catch (err) {
      errors.push(`v2ex-hot: ${(err as Error).message}`)
    }

    try {
      const items = await fetchV2exRsshub(options)
      if (items.length > 0) {
        const focused = focusIndieDeveloperItems(this.platform, items, options)
        return { items: focused.items, activeBackend: 'v2ex-rsshub', message: `Fetched ${focused.items.length} V2EX indie developer topics from RSSHub.` }
      }
      errors.push('v2ex-rsshub: source returned no topics')
    } catch (err) {
      errors.push(`v2ex-rsshub: ${(err as Error).message}`)
    }

    if (config.allowFixtures) {
      return {
        items: focusIndieDeveloperItems(this.platform, buildV2exFallbackItems(options), options).items,
        activeBackend: 'fixture',
        message: `V2EX live provider unavailable; using local fallback data. ${errors.join('; ')}`,
      }
    }

    throw new Error(errors.join('; ') || 'V2EX provider unavailable.')
  }
}

async function fetchV2exHot(options: FetchTrendingOptions): Promise<TrendingItem[]> {
  const errors: string[] = []
  for (const url of getV2exHotUrls()) {
    try {
      const topics = await fetchJson<V2exHotTopic[]>(url, getBackendConfig(), v2exHeaders())
      const items = v2exTopicsToItems(topics, options, 'v2ex:hot')
      if (items.length > 0) return items
    } catch (err) {
      errors.push(`${url}: ${(err as Error).message}`)
    }
  }
  throw new Error(errors.join('; '))
}

async function fetchV2exRsshub(options: FetchTrendingOptions): Promise<TrendingItem[]> {
  const feed = await fetchRssItems(getV2exRsshubUrl(), getBackendConfig())
  return (feed.items ?? [])
    .slice(0, Math.max(options.limit, 10))
    .map((item, index) => {
      const heatScore = (Math.max(options.limit, 10) - index) * 100
      const category = extractV2exNode(item.link || item.guid || '') || '分享发现'
      return {
        platform: 'v2ex' as const,
        period: options.period,
        externalId: item.guid || item.link || `v2ex-rsshub-${index + 1}`,
        title: item.title || `V2EX topic #${index + 1}`,
        url: item.link || 'https://www.v2ex.com/?tab=hot',
        author: item.creator || item.author || 'V2EX',
        publishedAt: toIsoDate(item.isoDate || item.pubDate) ?? options.fetchedAt,
        heatScore,
        heatLabel: `#${index + 1}`,
        tags: cleanTags([category, item.categories?.[0]], [category]),
        category,
        summary: item.contentSnippet,
        rawMetrics: { rank: index + 1 },
        source: 'v2ex:rsshub',
        fetchedAt: options.fetchedAt,
        expiresAt: options.expiresAt,
      } satisfies TrendingItem
    })
    .sort((a, b) => b.heatScore - a.heatScore)
}

function v2exTopicsToItems(topics: V2exHotTopic[], options: FetchTrendingOptions, source: string): TrendingItem[] {
  return topics
    .slice(0, Math.max(options.limit, 10))
    .map((topic, index) => {
      const replies = Number(topic.replies ?? 0)
      const heatScore = replies * 12 + (Math.max(options.limit, 10) - index) * 100
      const category = topic.node?.title || topic.node?.name || '分享发现'
      return {
        platform: 'v2ex' as const,
        period: options.period,
        externalId: `v2ex-${topic.id}`,
        title: topic.title || `V2EX topic #${index + 1}`,
        url: topic.url || `https://www.v2ex.com/t/${topic.id}`,
        author: topic.member?.username || 'V2EX',
        publishedAt: toIsoDate(topic.created) ?? options.fetchedAt,
        heatScore,
        heatLabel: replies > 0 ? `${replies} 回复` : `#${index + 1}`,
        tags: cleanTags([category, topic.node?.name], [category]),
        category,
        summary: stripHtml(topic.content_rendered || ''),
        rawMetrics: { replies, rank: index + 1 },
        source,
        fetchedAt: options.fetchedAt,
        expiresAt: options.expiresAt,
      } satisfies TrendingItem
    })
    .sort((a, b) => b.heatScore - a.heatScore)
}

function buildV2exFallbackItems(options: FetchTrendingOptions): TrendingItem[] {
  const topics: Array<[string, string, string, number]> = [
    ['程序员', '大家现在都在用什么方式管理本地 AI 工作流？', 'workflow-lab', 88],
    ['分享发现', '一个把网页收藏自动整理成知识卡片的小工具', 'dockmaster', 73],
    ['问与答', '独立开发者如何判断一个产品想法值得继续做？', 'asker', 67],
    ['酷工作', '远程团队招 TypeScript / Electron 工程师', 'remotehub', 61],
    ['AI', '本地 RAG 知识库在长文档上的体验优化记录', 'llmcraft', 58],
    ['Apple', 'macOS 菜单栏应用有哪些值得借鉴的交互细节？', 'macpilot', 52],
    ['宽带症候群', '家庭网络监控面板搭建经验分享', 'netwatch', 47],
    ['设计', '仪表盘页面如何减少信息密度带来的压迫感？', 'uicoder', 43],
    ['创业组队', '做工具型产品前期如何获取第一批真实用户？', 'makerway', 39],
    ['Node.js', 'Electron 应用内嵌浏览器的一些坑和规避方案', 'nodebox', 35],
  ]
  return topics.map(([category, title, author, replies], index) => ({
    platform: 'v2ex' as const,
    period: options.period,
    externalId: `v2ex-local-${options.period}-${index + 1}`,
    title,
    url: `https://www.v2ex.com/?tab=hot#hulkdash-${index + 1}`,
    author,
    publishedAt: new Date(Date.now() - (index + 1) * 3600_000).toISOString(),
    heatScore: replies * 12 + (topics.length - index) * 100,
    heatLabel: `${replies} 回复`,
    tags: cleanTags([category], [category]),
    category,
    summary: 'V2EX 当前网络不可达时的本地兜底数据，用于保持榜单可读；配置 V2EX_HOT_URL 可接入可访问镜像。',
    rawMetrics: { replies, rank: index + 1, fallback: '1' },
    source: 'v2ex:local-fallback',
    fetchedAt: options.fetchedAt,
    expiresAt: options.expiresAt,
  }))
}

function getV2exHotUrls(): string[] {
  const configured = process.env.V2EX_HOT_URL
  const defaults = [
    'https://www.v2ex.com/api/topics/hot.json',
    'https://api.v2ex.com/topics/hot.json',
    'https://global.v2ex.com/api/topics/hot.json',
  ]
  if (!configured) return defaults
  const configuredUrls = configured.split(',').map((item) => item.trim()).filter(Boolean)
  return [...configuredUrls, ...defaults.filter((url) => !configuredUrls.includes(url))]
}

function getV2exRsshubUrl(): string {
  const route = process.env.V2EX_RSSHUB_ROUTE || '/v2ex/topics/hot'
  if (route.startsWith('http')) return route
  return `${getBackendConfig().rsshubBaseUrl.replace(/\/$/, '')}${route}`
}

function extractV2exNode(value: string): string {
  const match = value.match(/\/go\/([^/?#]+)/)
  return match?.[1] || ''
}

function v2exHeaders(): Record<string, string> {
  return {
    Referer: 'https://www.v2ex.com/',
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
}
