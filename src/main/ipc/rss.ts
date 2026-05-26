import { ipcMain } from 'electron'
import Parser from 'rss-parser'
import { getDatabase } from '../database/connection'
import { RSSFeedRepository, RSSArticleRepository } from '../database/repositories/rss-repository'

const rssParser = new Parser({ timeout: 10000, headers: { 'User-Agent': 'DorckDashboard/1.0' } })

async function fetchAndStoreArticles(feedId: number, feedUrl: string): Promise<number> {
  const db = getDatabase()
  const articleRepo = new RSSArticleRepository(db)
  const feed = await rssParser.parseURL(feedUrl)
  let count = 0
  for (const item of feed.items ?? []) {
    if (!item.title || !item.link) continue
    const result = articleRepo.create({
      feed_id: feedId,
      title: item.title,
      url: item.link,
      author: item.creator || item.author || undefined,
      summary: item.contentSnippet || item.content?.substring(0, 300) || undefined,
      published_at: item.isoDate || item.pubDate || undefined,
    })
    if (result > 0) count++
  }
  const feedRepo = new RSSFeedRepository(db)
  feedRepo.updateLastFetched(feedId)
  return count
}

const RSS_CHANNELS = {
  GET_FEEDS: 'rss:getFeeds',
  GET_FEED_DETAIL: 'rss:getFeedDetail',
  ADD_FEED: 'rss:addFeed',
  UPDATE_FEED: 'rss:updateFeed',
  DELETE_FEED: 'rss:deleteFeed',
  TOGGLE_FEED_ACTIVE: 'rss:toggleFeedActive',
  GET_ARTICLES: 'rss:getArticles',
  GET_FILTERED_ARTICLES: 'rss:getFilteredArticles',
  GET_ARTICLE_CATEGORIES: 'rss:getArticleCategories',
  GET_UNREAD: 'rss:getUnread',
  MARK_READ: 'rss:markRead',
  TOGGLE_STAR: 'rss:toggleStar',
} as const

function getFeedRepo(): RSSFeedRepository {
  return new RSSFeedRepository(getDatabase())
}

function getArticleRepo(): RSSArticleRepository {
  return new RSSArticleRepository(getDatabase())
}

export function registerRssIpcHandlers(): void {
  ipcMain.handle(RSS_CHANNELS.GET_FEEDS, () => {
    try {
      return { success: true, data: getFeedRepo().findAllFeeds() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(RSS_CHANNELS.ADD_FEED, async (_event, data: { title: string; url: string; category?: string }) => {
    try {
      const id = getFeedRepo().create(data)
      let articleCount = 0
      if (id) {
        try {
          articleCount = await fetchAndStoreArticles(id, data.url)
        } catch (fetchErr) {
          console.error('RSS fetch error:', (fetchErr as Error).message)
          // Feed was created but articles couldn't be fetched
        }
      }
      return { success: true, data: { feedId: id, articleCount } }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Fetch all feeds
  ipcMain.handle('rss:fetchAll', async () => {
    try {
      const feeds = getFeedRepo().findActive()
      let total = 0
      for (const feed of feeds) {
        try {
          const added = await fetchAndStoreArticles(feed.id, feed.url)
          total += added
        } catch (fetchErr) {
          console.error(`RSS fetch error for ${feed.title}:`, (fetchErr as Error).message)
        }
      }
      return { success: true, data: { total, feeds: feeds.length } }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(RSS_CHANNELS.DELETE_FEED, (_event, id: number) => {
    try {
      return { success: true, data: getFeedRepo().deleteById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(RSS_CHANNELS.TOGGLE_FEED_ACTIVE, (_event, id: number) => {
    try {
      return { success: true, data: getFeedRepo().toggleActive(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(RSS_CHANNELS.GET_FEED_DETAIL, (_event, id: number) => {
    try {
      return { success: true, data: getFeedRepo().findByIdWithStats(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(RSS_CHANNELS.UPDATE_FEED, (_event, id: number, data: { title?: string; url?: string; category?: string }) => {
    try {
      return { success: true, data: getFeedRepo().updateFeed(id, data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(RSS_CHANNELS.GET_ARTICLES, (_event, limit?: number) => {
    try {
      return { success: true, data: getArticleRepo().findRecent(limit) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(RSS_CHANNELS.GET_FILTERED_ARTICLES, (_event, filters: { dateRange?: string; category?: string; starred?: boolean; limit?: number }) => {
    try {
      return { success: true, data: getArticleRepo().findWithFilter(filters) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(RSS_CHANNELS.GET_ARTICLE_CATEGORIES, () => {
    try {
      return { success: true, data: getArticleRepo().getCategories() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(RSS_CHANNELS.GET_UNREAD, (_event, limit?: number) => {
    try {
      return { success: true, data: getArticleRepo().findUnread(limit) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(RSS_CHANNELS.MARK_READ, (_event, id: number) => {
    try {
      getArticleRepo().markAsRead(id)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(RSS_CHANNELS.TOGGLE_STAR, (_event, id: number) => {
    try {
      getArticleRepo().toggleStar(id)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
