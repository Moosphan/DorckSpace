import { ipcMain } from 'electron'
import Parser from 'rss-parser'
import { getDatabase } from '../database/connection'
import { RSSFeedRepository, RSSArticleRepository } from '../database/repositories/rss-repository'

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'DorckDashboard/1.0 RSS Reader',
  },
})

async function fetchFeedArticles(feedId: number, feedUrl: string): Promise<number> {
  const db = getDatabase()
  const articleRepo = new RSSArticleRepository(db)

  try {
    const feed = await parser.parseURL(feedUrl)
    let addedCount = 0

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

      if (result > 0) addedCount++
    }

    // Update last fetched time
    const feedRepo = new RSSFeedRepository(db)
    feedRepo.updateLastFetched(feedId)

    return addedCount
  } catch (err) {
    console.error(`Failed to fetch RSS feed ${feedUrl}:`, (err as Error).message)
    return 0
  }
}

async function fetchAllFeeds(): Promise<{ total: number; feeds: number }> {
  const db = getDatabase()
  const feedRepo = new RSSFeedRepository(db)
  const feeds = feedRepo.findActive()

  let totalAdded = 0
  for (const feed of feeds) {
    const added = await fetchFeedArticles(feed.id, feed.url)
    totalAdded += added
  }

  return { total: totalAdded, feeds: feeds.length }
}

export function registerRssFetcherHandlers(): void {
  // Fetch articles for a specific feed
  ipcMain.handle('rss:fetchFeed', async (_event, feedId: number, feedUrl: string) => {
    try {
      const count = await fetchFeedArticles(feedId, feedUrl)
      return { success: true, data: count }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Auto-fetch on startup (runs in background)
  ipcMain.handle('rss:startAutoFetch', () => {
    setTimeout(() => {
      fetchAllFeeds().catch(() => {})
    }, 5000)

    setInterval(() => {
      fetchAllFeeds().catch(() => {})
    }, 30 * 60 * 1000)

    return { success: true }
  })
}
