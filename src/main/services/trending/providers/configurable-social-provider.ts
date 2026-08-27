import type {
  TrendingItem,
  TrendingPeriod,
  TrendingPlatform,
} from '../../../../shared/social-trending'
import { formatTrendingHeat } from '../../../../shared/social-trending'
import type { FetchTrendingOptions, FetchTrendingResult, TrendingProvider } from './types'
import {
  buildFixtureItems,
  cleanTags,
  fetchJson,
  fetchRssItems,
  fetchText,
  focusIndieDeveloperItems,
  getBackendConfig,
  hashId,
  normalizeTags,
  nowHealth,
  runJsonCommand,
  toIsoDate,
} from './utils'

type RawTrendingItem = Record<string, unknown>

interface ConfigurableProviderOptions {
  platform: Extract<TrendingPlatform, 'xiaohongshu' | 'douyin'>
  commandEnv: string
  endpointEnv: string
  rsshubRouteEnv: string
  defaultRsshubRoute?: string
  homepage: string
  sourceLabel: string
  authHint: string
}

export class ConfigurableSocialProvider implements TrendingProvider {
  platform: Extract<TrendingPlatform, 'xiaohongshu' | 'douyin'>
  backends = ['public-web', 'command-json', 'http-json', 'rsshub', 'fixture']
  private readonly options: ConfigurableProviderOptions

  constructor(options: ConfigurableProviderOptions) {
    this.platform = options.platform
    this.options = options
  }

  async check() {
    const config = getBackendConfig()
    if (this.options.platform === 'xiaohongshu') {
      return nowHealth(this.platform, this.backends, 'ok', '小红书 public explore page is available without login as a best-effort source.', 'public-web')
    }
    if (this.options.platform === 'douyin') {
      return nowHealth(this.platform, this.backends, 'ok', '抖音 public hot-search API is available without login.', 'public-web')
    }
    if (process.env[this.options.commandEnv]) {
      return nowHealth(this.platform, this.backends, 'ok', `${this.options.commandEnv} is configured.`, 'command-json')
    }
    if (process.env[this.options.endpointEnv]) {
      return nowHealth(this.platform, this.backends, 'ok', `${this.options.endpointEnv} is configured.`, 'http-json')
    }
    if (process.env[this.options.rsshubRouteEnv] || this.options.defaultRsshubRoute) {
      return nowHealth(this.platform, this.backends, 'warn', 'RSSHub route is available as best-effort backend.', 'rsshub')
    }
    if (config.allowFixtures) {
      return nowHealth(this.platform, this.backends, 'warn', `${this.options.authHint} Fixture backend is enabled for validation.`, 'fixture')
    }
    return nowHealth(this.platform, this.backends, 'off', this.options.authHint, undefined)
  }

  async fetchTrending(options: FetchTrendingOptions): Promise<FetchTrendingResult> {
    const config = getBackendConfig()
    const errors: string[] = []

    try {
      const items = this.platform === 'xiaohongshu'
        ? await fetchXiaohongshuPublicExplore(options)
        : await fetchDouyinPublicHotSearch(options)
      if (items.length > 0) {
        const focused = focusIndieDeveloperItems(this.platform, items, options)
        return {
          items: focused.items,
          activeBackend: focused.supplemented ? 'public-web+indie-fallback' : 'public-web',
          message: focused.supplemented
            ? `Fetched ${items.length} public items; supplemented indie developer topics to keep 10 focused results.`
            : `Fetched ${focused.items.length} indie developer items from public web source without login.`,
        }
      }
      errors.push('public-web: source returned no items')
    } catch (err) {
      errors.push(`public-web: ${(err as Error).message}`)
    }

    const command = process.env[this.options.commandEnv]
    if (command) {
      try {
        const payload = await runJsonCommand<unknown>(expandTemplate(command, options.period, options.limit), config.fetchTimeoutMs)
        const items = normalizePayload(this.platform, payload, options, `${this.platform}:command-json`, this.options.homepage)
        if (items.length > 0) {
          const focused = focusIndieDeveloperItems(this.platform, items, options)
          return { items: focused.items, activeBackend: 'command-json', message: `Fetched ${focused.items.length} indie developer items via command backend.` }
        }
        errors.push('command-json: command returned no items')
      } catch (err) {
        errors.push(`command-json: ${(err as Error).message}`)
      }
    }

    const endpoint = process.env[this.options.endpointEnv]
    if (endpoint) {
      try {
        const payload = await fetchJson<unknown>(withQuery(endpoint, options.period, options.limit), config)
        const items = normalizePayload(this.platform, payload, options, `${this.platform}:http-json`, this.options.homepage)
        if (items.length > 0) {
          const focused = focusIndieDeveloperItems(this.platform, items, options)
          return { items: focused.items, activeBackend: 'http-json', message: `Fetched ${focused.items.length} indie developer items via HTTP backend.` }
        }
        errors.push('http-json: endpoint returned no items')
      } catch (err) {
        errors.push(`http-json: ${(err as Error).message}`)
      }
    }

    const route = process.env[this.options.rsshubRouteEnv] || this.options.defaultRsshubRoute
    if (route) {
      try {
        const feed = await fetchRssItems(`${config.rsshubBaseUrl.replace(/\/$/, '')}${expandTemplate(route, options.period, options.limit)}`, config)
        const items = (feed.items ?? [])
          .slice(0, Math.max(options.limit, 10))
          .map((item, index) => rssItemToTrending(this.platform, item as RawTrendingItem, index, options, this.options.homepage))
        if (items.length > 0) {
          const focused = focusIndieDeveloperItems(this.platform, items, options)
          return { items: focused.items, activeBackend: 'rsshub', message: `Fetched ${focused.items.length} indie developer items via RSSHub.` }
        }
        errors.push('rsshub: feed returned no items')
      } catch (err) {
        errors.push(`rsshub: ${(err as Error).message}`)
      }
    }

    if (config.allowFixtures) {
      return {
        items: focusIndieDeveloperItems(this.platform, buildFixtureItems(this.platform, options.period, options.limit, options), options).items,
        activeBackend: 'fixture',
        message: `Live ${this.options.sourceLabel} providers unavailable; using fixture data. ${errors.join('; ')}`,
      }
    }

    throw new Error(errors.join('; ') || this.options.authHint)
  }
}

export function createXiaohongshuProvider(): ConfigurableSocialProvider {
  return new ConfigurableSocialProvider({
    platform: 'xiaohongshu',
    commandEnv: 'XIAOHONGSHU_TRENDING_COMMAND',
    endpointEnv: 'XIAOHONGSHU_TRENDING_ENDPOINT',
    rsshubRouteEnv: 'XIAOHONGSHU_RSSHUB_ROUTE',
    homepage: 'https://www.xiaohongshu.com',
    sourceLabel: 'Xiaohongshu',
    authHint: '小红书公开发现流可免登录解析；若公开页面不可用，可配置 XIAOHONGSHU_TRENDING_COMMAND 或 XIAOHONGSHU_TRENDING_ENDPOINT。',
  })
}

export function createDouyinProvider(): ConfigurableSocialProvider {
  return new ConfigurableSocialProvider({
    platform: 'douyin',
    commandEnv: 'DOUYIN_TRENDING_COMMAND',
    endpointEnv: 'DOUYIN_TRENDING_ENDPOINT',
    rsshubRouteEnv: 'DOUYIN_RSSHUB_ROUTE',
    defaultRsshubRoute: '/douyin/hot',
    homepage: 'https://www.douyin.com',
    sourceLabel: 'Douyin',
    authHint: '抖音热搜可通过公开接口免登录获取；若公开接口不可用，可配置 DOUYIN_TRENDING_COMMAND 或 DOUYIN_TRENDING_ENDPOINT。',
  })
}

async function fetchDouyinPublicHotSearch(options: FetchTrendingOptions): Promise<TrendingItem[]> {
  const url = process.env.DOUYIN_PUBLIC_HOT_URL || 'https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/'
  const payload = await fetchJson<{ word_list?: RawTrendingItem[]; active_time?: string }>(url, getBackendConfig())
  return (payload.word_list ?? [])
    .slice(0, Math.max(options.limit, 10))
    .map((item, index) => {
      const title = firstString(item.word, item.sentence, item.title, item.desc) || `抖音热搜 #${index + 1}`
      const label = firstNumber(item.label, item.label_type)
      const heatScore = firstNumber(item.hot_value, item.hotValue, item.heat_score) || (Math.max(options.limit, 10) - index) * 100
      return {
        platform: 'douyin' as const,
        period: options.period,
        externalId: hashId(['douyin-hot', title]),
        title,
        url: `https://www.douyin.com/search/${encodeURIComponent(title)}?type=general`,
        author: extractAuthor(item) || '抖音热搜榜',
        publishedAt: toIsoDate(payload.active_time) ?? options.fetchedAt,
        heatScore,
        heatLabel: `${formatTrendingHeat(heatScore)} 热度`,
        tags: buildDouyinTags(title, item),
        category: firstString(item.category, item.type_name, item.word_type) || '热搜',
        rawMetrics: { hotValue: heatScore, label: label || null, rank: index + 1 },
        source: 'douyin:public-hotsearch',
        fetchedAt: options.fetchedAt,
        expiresAt: options.expiresAt,
      }
    })
}

async function fetchXiaohongshuPublicExplore(options: FetchTrendingOptions): Promise<TrendingItem[]> {
  const url = process.env.XIAOHONGSHU_PUBLIC_EXPLORE_URL || 'https://www.xiaohongshu.com/explore'
  const html = await fetchText(url, getBackendConfig(), {
    Referer: 'https://www.xiaohongshu.com/',
  })
  const state = extractXhsInitialState(html)
  const feeds = Array.isArray(state?.feed?.feeds) ? state.feed.feeds : []
  return feeds
    .map((feed, index) => xhsFeedToTrending(feed, index, options))
    .filter((item): item is TrendingItem => Boolean(item))
    .sort((a, b) => b.heatScore - a.heatScore)
    .slice(0, Math.max(options.limit, 10))
}

function extractXhsInitialState(html: string): { feed?: { feeds?: RawTrendingItem[] } } | null {
  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*(.*?)<\/script>/s)
  if (!match) return null
  try {
    return JSON.parse(match[1].trim().replace(/;$/, '').replace(/undefined/g, 'null')) as { feed?: { feeds?: RawTrendingItem[] } }
  } catch {
    return null
  }
}

function xhsFeedToTrending(feed: RawTrendingItem, index: number, options: FetchTrendingOptions): TrendingItem | null {
  const noteCard = isObject(feed.noteCard) ? feed.noteCard : null
  if (!noteCard) return null
  const user = isObject(noteCard.user) ? noteCard.user : {}
  const interactInfo = isObject(noteCard.interactInfo) ? noteCard.interactInfo : {}
  const noteId = firstString(feed.id, feed.trackId)
  const xsecToken = firstString(feed.xsecToken, feed.xsec_token)
  const title = firstString(noteCard.displayTitle, noteCard.title) || `小红书发现 #${index + 1}`
  const likedCount = parseCount(firstString(interactInfo.likedCount, interactInfo.likes))
  const url = noteId
    ? `https://www.xiaohongshu.com/explore/${noteId}${xsecToken ? `?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=pc_feed` : ''}`
    : 'https://www.xiaohongshu.com/explore'
  return {
    platform: 'xiaohongshu',
    period: options.period,
    externalId: noteId || hashId(['xhs-public', title]),
    title,
    url,
    author: firstString(user.nickname, user.nickName, user.userId) || '小红书用户',
    publishedAt: options.fetchedAt,
    heatScore: likedCount || (Math.max(options.limit, 10) - index) * 100,
    heatLabel: likedCount ? `${formatTrendingHeat(likedCount)} 赞` : `发现流 #${index + 1}`,
    tags: buildXhsTags(title, firstString(noteCard.type, noteCard.tag, noteCard.topic)),
    category: firstString(noteCard.type) === 'video' ? '视频' : '笔记',
    summary: title,
    rawMetrics: { likedCount, rank: index + 1 },
    source: 'xiaohongshu:public-explore',
    fetchedAt: options.fetchedAt,
    expiresAt: options.expiresAt,
  }
}

function buildDouyinTags(title: string, item: RawTrendingItem): string[] {
  const explicitTags = extractTagValues(item.tags, item.tag_list, item.hashtags, item.word_sub_board)
  const tags = [...explicitTags]
  const keywordMap: [RegExp, string][] = [
    [/AI|人工智能|机器人|大模型|科技|芯片|手机|造船/u, '科技'],
    [/冠军|比赛|球队|足球|篮球|网球|赛事|vs/iu, '体育'],
    [/电影|剧|综艺|音乐|演唱会|明星|演员/u, '娱乐'],
    [/旅行|川西|美景|城市|酒店|景区/u, '旅行'],
    [/高考|大学|学校|教育|考试/u, '教育'],
    [/美食|吃|餐厅|咖啡|茶/u, '美食'],
    [/财经|股票|基金|房价|经济/u, '财经'],
  ]
  for (const [pattern, tag] of keywordMap) {
    if (pattern.test(title)) tags.push(tag)
  }
  return cleanTags(tags, ['趋势'])
}

function buildXhsTags(title: string, type: string): string[] {
  const tags = [type === 'video' ? '视频' : '图文']
  const keywordMap: [RegExp, string][] = [
    [/穿搭|妆|口红|护肤|发型|身材|变美/u, '美妆穿搭'],
    [/吃|美食|餐厅|咖啡|甜品|大肠|肥牛/u, '美食'],
    [/旅行|出行|月亮|风景|川西|酒店|城市/u, '旅行生活'],
    [/宝宝|积食|健康|健身|八段锦|调理/u, '健康'],
    [/婚礼|情感|快乐|生活|家居/u, '生活方式'],
    [/AI|画面|扩展|教程|工具|效率/u, '创意工具'],
    [/电影|妲己|剧|明星|综艺/u, '影视娱乐'],
  ]
  for (const [pattern, tag] of keywordMap) {
    if (pattern.test(title)) tags.push(tag)
  }
  return cleanTags(tags, [type === 'video' ? '视频' : '笔记'])
}

function normalizePayload(
  platform: TrendingPlatform,
  payload: unknown,
  options: FetchTrendingOptions,
  source: string,
  homepage: string,
): TrendingItem[] {
  const items = extractItems(payload)
  return items
    .slice(0, Math.max(options.limit, 10))
    .map((item, index) => rawItemToTrending(platform, item, index, options, source, homepage))
    .sort((a, b) => b.heatScore - a.heatScore)
}

function extractItems(payload: unknown): RawTrendingItem[] {
  if (Array.isArray(payload)) return payload.filter(isObject)
  if (!isObject(payload)) return []
  const candidates = [
    payload.items,
    payload.data,
    payload.list,
    payload.notes,
    payload.videos,
    payload.aweme_list,
    isObject(payload.data) ? payload.data.items : undefined,
    isObject(payload.data) ? payload.data.list : undefined,
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter(isObject)
  }
  return []
}

function rawItemToTrending(
  platform: TrendingPlatform,
  item: RawTrendingItem,
  index: number,
  options: FetchTrendingOptions,
  source: string,
  homepage: string,
): TrendingItem {
  const metrics = extractMetrics(item)
  const heatScore = metrics.heatScore || metrics.likes * 10 + metrics.comments * 4 + metrics.shares * 8 + metrics.views
  const title = firstString(item.title, item.desc, item.description, item.content, item.name) || `Hot item #${index + 1}`
  const url = firstString(item.url, item.link, item.share_url, item.web_url, item.detail_url) || homepage
  const author = extractAuthor(item) || 'Unknown'
  const tags = normalizeTags(item.tags ?? item.tag_list ?? item.hashtags, [platform])
  const category = firstString(item.category, item.channel, item.topic, item.type) || tags[0] || 'Hot'
  return {
    platform,
    period: options.period,
    externalId: firstString(item.id, item.note_id, item.aweme_id, item.item_id, item.video_id) || hashId([platform, title, url]),
    title,
    url,
    author,
    publishedAt: toIsoDate(item.published_at ?? item.publish_time ?? item.create_time ?? item.created_at ?? item.time),
    heatScore,
    heatLabel: firstString(item.heat_label, item.hot_value, item.hotScore) || `${formatTrendingHeat(heatScore)} heat`,
    tags,
    category,
    summary: firstString(item.summary, item.desc, item.description),
    rawMetrics: metrics.raw,
    source,
    fetchedAt: options.fetchedAt,
    expiresAt: options.expiresAt,
  }
}

function rssItemToTrending(
  platform: TrendingPlatform,
  item: RawTrendingItem,
  index: number,
  options: FetchTrendingOptions,
  homepage: string,
): TrendingItem {
  const heatScore = (Math.max(options.limit, 10) - index) * 100
  return {
    platform,
    period: options.period,
    externalId: firstString(item.guid, item.id, item.link) || hashId([platform, item.title, item.link]),
    title: firstString(item.title) || `Hot item #${index + 1}`,
    url: firstString(item.link, item.url) || homepage,
    author: firstString(item.creator, item.author) || 'Unknown',
    publishedAt: toIsoDate(item.isoDate ?? item.pubDate ?? item.published_at),
    heatScore,
    heatLabel: `RSS rank #${index + 1}`,
    tags: cleanTags([platform, firstString(item.category, item.title)], ['RSS']),
    category: firstString(item.category) || 'RSS',
    summary: firstString(item.contentSnippet, item.content),
    rawMetrics: { rank: index + 1 },
    source: `${platform}:rsshub`,
    fetchedAt: options.fetchedAt,
    expiresAt: options.expiresAt,
  }
}

function extractMetrics(item: RawTrendingItem): { heatScore: number; likes: number; comments: number; shares: number; views: number; raw: Record<string, number | string | null> } {
  const likes = firstNumber(item.likes, item.like_count, item.liked_count, item.digg_count)
  const comments = firstNumber(item.comments, item.comment_count, item.comments_count)
  const shares = firstNumber(item.shares, item.share_count, item.repost_count)
  const views = firstNumber(item.views, item.view_count, item.play_count, item.read_count)
  const heatScore = firstNumber(item.heatScore, item.heat_score, item.hot_score, item.hot_value)
  return {
    heatScore,
    likes,
    comments,
    shares,
    views,
    raw: {
      likes,
      comments,
      shares,
      views,
      heatScore,
    },
  }
}

function withQuery(endpoint: string, period: TrendingPeriod, limit: number): string {
  const url = new URL(expandTemplate(endpoint, period, limit))
  if (!url.searchParams.has('period')) url.searchParams.set('period', period)
  if (!url.searchParams.has('limit')) url.searchParams.set('limit', String(Math.max(limit, 10)))
  return url.href
}

function expandTemplate(value: string, period: TrendingPeriod, limit: number): string {
  return value
    .replaceAll('{period}', period)
    .replaceAll('{limit}', String(Math.max(limit, 10)))
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return ''
}

function extractAuthor(item: RawTrendingItem): string {
  const direct = firstString(item.author, item.nickname, item.user_name, item.owner, item.creator, item.author_name)
  if (direct && direct !== '[object Object]') return direct
  const nestedCandidates = [item.user, item.author, item.owner, item.creator, item.account]
  for (const candidate of nestedCandidates) {
    if (!isObject(candidate)) continue
    const value = firstString(candidate.nickname, candidate.name, candidate.username, candidate.unique_id, candidate.sec_uid, candidate.id)
    if (value) return value
  }
  return ''
}

function extractTagValues(...values: unknown[]): string[] {
  const result: string[] = []
  for (const value of values) {
    if (!value) continue
    if (typeof value === 'string') {
      result.push(...value.split(/[,\s#，、]+/))
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') result.push(item)
        else if (isObject(item)) result.push(firstString(item.name, item.title, item.tag_name, item.text))
      }
      continue
    }
    if (isObject(value)) result.push(firstString(value.name, value.title, value.tag_name, value.text))
  }
  return result.filter(Boolean)
}

function firstNumber(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^\d.]/g, ''))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

function parseCount(value: string): number {
  const text = value.trim().replace(/\+/g, '')
  if (!text) return 0
  const multiplier = text.includes('万') ? 10_000 : text.toLowerCase().includes('k') ? 1_000 : 1
  const parsed = Number(text.replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) ? Math.round(parsed * multiplier) : 0
}

function isObject(value: unknown): value is RawTrendingItem {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
