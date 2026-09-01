import { BrowserWindow } from 'electron'
import { getResetRadarSnapshot, refreshChatGPTAccountUsage } from './reset-radar-service'
import { CHATGPT_USAGE_REFRESH_INTERVAL_MS } from './chatgpt-usage-refresh'
import { CHATGPT_SESSION_PARTITION } from './account-session'

let scheduler: NodeJS.Timeout | null = null
let refreshing = false
let usageWindow: BrowserWindow | null = null
let lastFailureMessage: string | null = null

function notifyUsageUpdated(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('ai:codexUsageUpdated')
  }
}

function notifyRadarUpdated(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('reset-radar:updated')
  }
}

async function refreshUsage(): Promise<void> {
  if (refreshing) return
  refreshing = true
  try {
    await ensureUsagePage()
    const accessToken = await readAccessToken()
    await refreshChatGPTAccountUsage(accessToken)
    lastFailureMessage = null
    notifyUsageUpdated()
  } catch (error) {
    // A signed-out or expired session is expected; keep the last successful snapshot intact.
    const message = error instanceof Error ? error.message : String(error)
    if (message !== lastFailureMessage) {
      console.info('[Codex Usage] Background refresh skipped:', message)
      lastFailureMessage = message
    }
  } finally {
    refreshing = false
  }

  try {
    await getResetRadarSnapshot(true)
    notifyRadarUpdated()
  } catch (error) {
    console.info('[Reset Radar] Background refresh skipped:', error instanceof Error ? error.message : String(error))
  }
}

function getUsageWindow(): BrowserWindow {
  if (usageWindow && !usageWindow.isDestroyed()) return usageWindow

  usageWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      partition: CHATGPT_SESSION_PARTITION,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  usageWindow.on('closed', () => { usageWindow = null })
  usageWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  return usageWindow
}

async function ensureUsagePage(): Promise<void> {
  const window = getUsageWindow()
  const contents = window.webContents
  if (/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(contents.getURL())) return

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('ChatGPT session page timed out')), 20_000)
    const cleanup = () => {
      clearTimeout(timeout)
      contents.removeListener('did-finish-load', onLoaded)
      contents.removeListener('did-fail-load', onFailed)
    }
    const finish = (error?: Error) => {
      cleanup()
      if (error) reject(error)
      else resolve()
    }
    const onLoaded = () => finish()
    const onFailed = (_event: Electron.Event, errorCode: number, errorDescription: string, validatedURL: string, isMainFrame: boolean) => {
      if (isMainFrame) finish(new Error(`ChatGPT session page failed: ${errorCode} ${errorDescription} (${validatedURL})`))
    }

    contents.once('did-finish-load', onLoaded)
    contents.on('did-fail-load', onFailed)
    void contents.loadURL('https://chatgpt.com').catch((error: Error) => finish(error))
  })
}

async function readAccessToken(): Promise<string | undefined> {
  const result = await getUsageWindow().webContents.executeJavaScript(`(() => {
    try {
      const bootstrap = document.getElementById('client-bootstrap')
      const data = bootstrap?.textContent ? JSON.parse(bootstrap.textContent) : null
      const token = data?.session?.accessToken || data?.session?.access_token
      return typeof token === 'string' && token ? token : null
    } catch {
      return null
    }
  })()`) as unknown
  return typeof result === 'string' && result ? result : undefined
}

export function startChatGPTUsageRefreshScheduler(): void {
  if (scheduler) return
  void refreshUsage()
  scheduler = setInterval(() => { void refreshUsage() }, CHATGPT_USAGE_REFRESH_INTERVAL_MS)
}

export function stopChatGPTUsageRefreshScheduler(): void {
  if (!scheduler) return
  clearInterval(scheduler)
  scheduler = null
  if (usageWindow && !usageWindow.isDestroyed()) usageWindow.destroy()
  usageWindow = null
}
