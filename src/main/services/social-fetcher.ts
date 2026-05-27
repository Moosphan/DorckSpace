import { ipcMain, BrowserWindow, session } from 'electron'
import { getDatabase } from '../database/connection'
import { SocialRepository } from '../database/repositories/social-repository'
import { SOCIAL_PLATFORMS } from '@shared/social-platforms'

const XHS_PARTITION = 'persist:xhs'

interface SocialAccountRow {
  id: number
  platform: string
  account_name: string
  profile_url: string | null
  api_config: string
}

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...headers,
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

async function fetchBilibiliProfile(mid: number): Promise<{ followers: number; videos: number }> {
  const [statRes, navRes] = await Promise.all([
    fetchJson<{ code: number; data: { follower: number } }>(
      `https://api.bilibili.com/x/relation/stat?vmid=${mid}`,
    ),
    fetchJson<{ code: number; data: { video: number } }>(
      `https://api.bilibili.com/x/space/navnum?mid=${mid}`,
      { Referer: 'https://www.bilibili.com/' },
    ),
  ])
  return {
    followers: statRes.code === 0 ? statRes.data.follower : 0,
    videos: navRes.code === 0 ? navRes.data.video : 0,
  }
}

interface XhsProfile {
  nickname: string
  avatar: string
  desc: string
  followers: number
  likes: number
  favorites: number
  shares: number
  views: number
  notes: number
}

function extractXhsDataFromHtml(html: string): XhsProfile {
  const empty: XhsProfile = { nickname: '', avatar: '', desc: '', followers: 0, likes: 0, favorites: 0, shares: 0, views: 0, notes: 0 }
  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\})\s*;?\s*<\/script>/s)
  if (!match) return empty

  try {
    const data = JSON.parse(match[1].replace(/undefined/g, 'null'))
    const userPage = data?.user?.userPageData || data?.user || {}
    const basicInfo = userPage.basicInfo || {}
    const interactions = userPage.interactions || []
    const notesData = userPage.notes || []

    const getInteraction = (type: string): number => {
      const item = interactions.find((i: { type: string }) => i.type === type)
      if (!item) return 0
      const count = item.count
      if (typeof count === 'number') return count
      if (typeof count === 'string') {
        const parsed = parseInt(count.replace(/[^0-9]/g, ''))
        return isNaN(parsed) ? 0 : parsed
      }
      return 0
    }

    let totalLikes = 0
    let totalFavorites = 0
    let totalShares = 0
    let totalViews = 0
    if (Array.isArray(notesData)) {
      for (const note of notesData) {
        totalLikes += note.likedCount || note.likes || 0
        totalFavorites += note.favCount || note.collectCount || 0
        totalShares += note.shareCount || note.share_count || 0
        totalViews += note.viewCount || note.readCount || note.view_count || 0
      }
    }

    return {
      nickname: basicInfo.nickname || '',
      avatar: basicInfo.images || basicInfo.imageb || '',
      desc: basicInfo.desc || '',
      followers: getInteraction('fans'),
      likes: totalLikes || getInteraction('interaction'),
      favorites: totalFavorites,
      shares: totalShares,
      views: totalViews,
      notes: Array.isArray(notesData) ? notesData.length : 0,
    }
  } catch {
    return empty
  }
}

async function fetchXhsViaWebview(userId: string): Promise<XhsProfile> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      width: 1200,
      height: 800,
      webPreferences: {
        partition: XHS_PARTITION,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    const timeout = setTimeout(() => {
      win.destroy()
      resolve({ nickname: '', avatar: '', desc: '', followers: 0, likes: 0, notes: 0 })
    }, 15000)

    win.webContents.on('did-finish-load', async () => {
      try {
        const html = await win.webContents.executeJavaScript(
          'document.documentElement.outerHTML',
        )
        const result = extractXhsDataFromHtml(html)
        clearTimeout(timeout)
        win.destroy()
        resolve(result)
      } catch {
        clearTimeout(timeout)
        win.destroy()
        resolve({ nickname: '', avatar: '', desc: '', followers: 0, likes: 0, notes: 0 })
      }
    })

    win.webContents.on('did-fail-load', () => {
      clearTimeout(timeout)
      win.destroy()
      resolve({ nickname: '', avatar: '', desc: '', followers: 0, likes: 0, notes: 0 })
    })

    win.loadURL(`https://www.xiaohongshu.com/user/profile/${userId}`)
  })
}

async function openXhsLoginWindow(): Promise<boolean> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show: true,
      width: 500,
      height: 700,
      title: 'Login to Xiaohongshu',
      webPreferences: {
        partition: XHS_PARTITION,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    win.loadURL('https://www.xiaohongshu.com')

    const timeout = setTimeout(() => {
      win.destroy()
      resolve(false)
    }, 120000)

    const checkLogin = async () => {
      try {
        const cookies = await session.fromPartition(XHS_PARTITION).cookies.get({ domain: '.xiaohongshu.com' })
        const hasSession = cookies.some((c) => c.name === 'web_session' || c.name === 'a1')
        if (hasSession) {
          clearTimeout(timeout)
          win.destroy()
          resolve(true)
          return
        }
      } catch { /* ignore */ }
      setTimeout(checkLogin, 2000)
    }

    win.webContents.on('did-finish-load', () => {
      setTimeout(checkLogin, 3000)
    })

    win.on('closed', () => {
      clearTimeout(timeout)
      resolve(false)
    })
  })
}

async function updateAccountData(repo: SocialRepository, account: SocialAccountRow): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const config = account.api_config ? JSON.parse(account.api_config) : {}
  let profileUpdated = false

  if (account.platform === 'bilibili') {
    const mid = account.account_name.replace(/\D/g, '')
    if (!mid) return
    const data = await fetchBilibiliProfile(parseInt(mid))
    repo.addMetricsSnapshot(account.id, [
      { metric_type: 'followers', metric_value: data.followers, snapshot_date: today },
      { metric_type: 'videos', metric_value: data.videos, snapshot_date: today },
    ])
  }

  if (account.platform === 'xiaohongshu') {
    const data = await fetchXhsViaWebview(account.account_name)
    if (data.nickname) { config.nickname = data.nickname; profileUpdated = true }
    if (data.avatar) { config.avatar = data.avatar; profileUpdated = true }
    if (data.desc) { config.desc = data.desc }

    repo.addMetricsSnapshot(account.id, [
      { metric_type: 'followers', metric_value: data.followers, snapshot_date: today },
      { metric_type: 'likes', metric_value: data.likes, snapshot_date: today },
      { metric_type: 'favorites', metric_value: data.favorites, snapshot_date: today },
      { metric_type: 'shares', metric_value: data.shares, snapshot_date: today },
      { metric_type: 'views', metric_value: data.views, snapshot_date: today },
      { metric_type: 'notes', metric_value: data.notes, snapshot_date: today },
    ])
  }

  if (profileUpdated) {
    repo.updateAccount(account.id, { api_config: config })
  }
}

export async function fetchAllSocialData(): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    const repo = new SocialRepository(getDatabase())
    const accounts = repo.getAccounts()
    let updated = 0

    for (const account of accounts) {
      try {
        await updateAccountData(repo, account)
        updated++
      } catch (err) {
        console.error(`Failed to fetch ${account.platform} data:`, err)
      }
    }

    return { success: true, updated }
  } catch (err) {
    return { success: false, updated: 0, error: (err as Error).message }
  }
}

export async function fetchPlatformLogo(profileUrl: string): Promise<string> {
  try {
    const url = new URL(profileUrl)
    const res = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
    })
    const html = await res.text()

    // Try <link rel="icon">
    let match = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
    if (match) return new URL(match[1], url.origin).href

    // Try <meta property="og:image">
    match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    if (match) return new URL(match[1], url.origin).href

    // Fallback: default favicon path
    return `${url.origin}/favicon.ico`
  } catch {
    return ''
  }
}

export function registerSocialFetcherHandlers(): void {
  ipcMain.handle('social:fetchAll', async () => {
    return fetchAllSocialData()
  })

  ipcMain.handle('social:fetchLogo', async (_event, profileUrl: string) => {
    return fetchPlatformLogo(profileUrl)
  })

  ipcMain.handle('social:loginXhs', async () => {
    return openXhsLoginWindow()
  })

  ipcMain.handle('social:xhsLoginStatus', async () => {
    try {
      const cookies = await session.fromPartition(XHS_PARTITION).cookies.get({ domain: '.xiaohongshu.com' })
      return cookies.some((c) => c.name === 'web_session' || c.name === 'a1')
    } catch {
      return false
    }
  })
}
