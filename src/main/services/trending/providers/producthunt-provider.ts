import type { TrendingItem } from '../../../../shared/social-trending'
import { formatTrendingHeat } from '../../../../shared/social-trending'
import type { FetchTrendingOptions, FetchTrendingResult, TrendingProvider } from './types'
import {
  buildFixtureItems,
  fetchRssItems,
  getBackendConfig,
  hashId,
  nowHealth,
  toIsoDate,
} from './utils'

interface ProductHuntGraphqlResponse {
  data?: {
    posts?: {
      edges?: {
        node?: {
          id?: string
          name?: string
          tagline?: string
          url?: string
          website?: string
          votesCount?: number
          commentsCount?: number
          createdAt?: string
          user?: { name?: string; username?: string }
          topics?: { edges?: { node?: { name?: string } }[] }
        }
      }[]
    }
  }
  errors?: { message?: string }[]
}

export class ProductHuntProvider implements TrendingProvider {
  platform = 'producthunt' as const
  backends = ['official-api', 'public-feed', 'rsshub', 'fixture']

  async check() {
    if (getProductHuntToken()) {
      return nowHealth(this.platform, this.backends, 'ok', 'Product Hunt official API token is configured.', 'official-api')
    }
    return nowHealth(this.platform, this.backends, 'ok', 'Product Hunt public Atom feed is available without login.', 'public-feed')
  }

  async fetchTrending(options: FetchTrendingOptions): Promise<FetchTrendingResult> {
    const config = getBackendConfig()
    const errors: string[] = []

    const token = getProductHuntToken()
    if (token) {
      try {
        const items = await fetchProductHuntOfficial(token, options)
        if (items.length > 0) return { items, activeBackend: 'official-api', message: `Fetched ${items.length} launches from Product Hunt API.` }
      } catch (err) {
        errors.push(`official-api: ${(err as Error).message}`)
      }
    }

    try {
      const items = await fetchProductHuntPublicFeed(options)
      if (items.length > 0) return { items, activeBackend: 'public-feed', message: `Fetched ${items.length} launches from Product Hunt public feed.` }
    } catch (err) {
      errors.push(`public-feed: ${(err as Error).message}`)
    }

    try {
      const items = await fetchProductHuntRss(config.rsshubBaseUrl, options)
      if (items.length > 0) return { items, activeBackend: 'rsshub', message: `Fetched ${items.length} launches from RSSHub.` }
    } catch (err) {
      errors.push(`rsshub: ${(err as Error).message}`)
    }

    if (config.allowFixtures) {
      return {
        items: buildFixtureItems(this.platform, options.period, options.limit, options),
        activeBackend: 'fixture',
        message: `Live Product Hunt providers unavailable; using fixture data. ${errors.join('; ')}`,
      }
    }

    throw new Error(errors.join('; ') || 'No Product Hunt backend is available.')
  }
}

function getProductHuntToken(): string {
  return process.env.PRODUCTHUNT_TOKEN || process.env.PRODUCT_HUNT_TOKEN || process.env.PRODUCTHUNT_DEVELOPER_TOKEN || ''
}

async function fetchProductHuntOfficial(token: string, options: FetchTrendingOptions): Promise<TrendingItem[]> {
  const after = getPeriodStart(options.period).toISOString()
  const query = `
    query HulkDashTrending($limit: Int!, $after: DateTime!) {
      posts(first: $limit, order: VOTES, postedAfter: $after) {
        edges {
          node {
            id
            name
            tagline
            url
            website
            votesCount
            commentsCount
            createdAt
            user { name username }
            topics { edges { node { name } } }
          }
        }
      }
    }
  `
  const apiUrl = process.env.PRODUCTHUNT_API_URL || 'https://api.producthunt.com/v2/api/graphql'
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables: { limit: Math.max(options.limit, 10), after } }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = await res.json() as ProductHuntGraphqlResponse
  if (body.errors?.length) throw new Error(body.errors.map((item) => item.message).join('; '))

  return (body.data?.posts?.edges ?? [])
    .map((edge) => edge.node)
    .filter((node): node is NonNullable<typeof node> => Boolean(node?.id && node?.name))
    .map((node) => {
      const votes = Number(node.votesCount ?? 0)
      const comments = Number(node.commentsCount ?? 0)
      const heatScore = votes * 10 + comments * 3
      const tags = (node.topics?.edges ?? [])
        .map((edge) => edge.node?.name)
        .filter((tag): tag is string => Boolean(tag))
        .slice(0, 5)
      return {
        platform: 'producthunt' as const,
        period: options.period,
        externalId: node.id ?? hashId([node.name, node.url]),
        title: node.name ?? 'Untitled launch',
        url: node.url || node.website || 'https://www.producthunt.com',
        author: node.user?.name || node.user?.username || 'Product Hunt',
        publishedAt: toIsoDate(node.createdAt),
        heatScore,
        heatLabel: `${formatTrendingHeat(votes)} votes`,
        tags,
        category: tags[0] || 'Productivity',
        summary: node.tagline,
        rawMetrics: { votes, comments },
        source: 'producthunt:official-api',
        fetchedAt: options.fetchedAt,
        expiresAt: options.expiresAt,
      }
    })
    .sort((a, b) => b.heatScore - a.heatScore)
    .slice(0, Math.max(options.limit, 10))
}

async function fetchProductHuntPublicFeed(options: FetchTrendingOptions): Promise<TrendingItem[]> {
  const feedUrl = process.env.PRODUCTHUNT_FEED_URL || 'https://www.producthunt.com/feed'
  const feed = await fetchRssItems(feedUrl, getBackendConfig())
  return productHuntFeedToItems(feed.items ?? [], options, 'producthunt:public-feed')
}

async function fetchProductHuntRss(rsshubBaseUrl: string, options: FetchTrendingOptions): Promise<TrendingItem[]> {
  const feed = await fetchRssItems(`${rsshubBaseUrl.replace(/\/$/, '')}/producthunt/today`, getBackendConfig())
  return productHuntFeedToItems(feed.items ?? [], options, 'producthunt:rsshub')
}

function productHuntFeedToItems(items: NonNullable<Awaited<ReturnType<typeof fetchRssItems>>['items']>, options: FetchTrendingOptions, source: string): TrendingItem[] {
  return items
    .slice(0, Math.max(options.limit, 10))
    .map((item, index) => {
      const heatScore = (Math.max(options.limit, 10) - index) * 100
      const tags = inferProductHuntTags(`${item.title ?? ''} ${item.contentSnippet ?? ''} ${item.link ?? ''}`)
      return {
        platform: 'producthunt' as const,
        period: options.period,
        externalId: item.guid || hashId([item.title, item.link]),
        title: item.title || 'Untitled launch',
        url: item.link || 'https://www.producthunt.com',
        author: item.creator || item.author || 'Product Hunt',
        publishedAt: toIsoDate(item.isoDate || item.pubDate),
        heatScore,
        heatLabel: `RSS rank #${index + 1}`,
        tags,
        category: tags[0] || 'Launch',
        summary: item.contentSnippet,
        rawMetrics: { rank: index + 1 },
        source,
        fetchedAt: options.fetchedAt,
        expiresAt: options.expiresAt,
      }
    })
}

function inferProductHuntTags(text: string): string[] {
  const lower = text.toLowerCase()
  const tags: string[] = []
  const matchers: [string, string[]][] = [
    ['AI', ['ai', 'agent', 'llm', 'gpt', 'model', 'automation']],
    ['Developer Tools', ['api', 'github', 'code', 'developer', 'vercel', 'linear', 'database', 'devtool']],
    ['Design', ['design', 'avatar', 'image', 'figma', 'creative', 'ui']],
    ['Productivity', ['task', 'calendar', 'workflow', 'productivity', 'workspace', 'note']],
    ['Marketing', ['seo', 'marketing', 'sales', 'growth', 'crm']],
    ['Audio/Video', ['video', 'audio', 'voice', 'podcast', 'music']],
    ['Analytics', ['analytics', 'dashboard', 'data', 'insight']],
  ]
  for (const [tag, keys] of matchers) {
    if (keys.some((key) => lower.includes(key))) tags.push(tag)
  }
  return tags.length > 0 ? tags.slice(0, 4) : ['Launch']
}

function getPeriodStart(period: FetchTrendingOptions['period']): Date {
  const date = new Date()
  const days = period === 'month' ? 30 : period === 'week' ? 7 : 1
  date.setDate(date.getDate() - days)
  return date
}
