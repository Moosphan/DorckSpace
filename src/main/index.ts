import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { registerAllIpcHandlers } from './ipc'
import { initFileStorage, registerFileIpcHandlers } from './services/file-service'
import { registerSettingsIpcHandlers } from './services/settings-service'
import { registerTaskIpcHandlers } from './ipc/tasks'
import { registerProjectIpcHandlers } from './ipc/projects'
import { registerArticleIpcHandlers } from './ipc/articles'
import { registerAiIpcHandlers } from './ipc/ai'
import { registerVideoAssetIpcHandlers } from './ipc/video-assets'
import { registerRssIpcHandlers } from './ipc/rss'
import { registerWeatherIpcHandlers } from './services/weather-service'
import { registerSearchIpcHandlers } from './ipc/search'
import { registerNotificationIpcHandlers } from './services/notification-service'
import { registerRssFetcherHandlers } from './services/rss-fetcher'
import { registerSocialIpcHandlers } from './ipc/social'
import { registerSocialFetcherHandlers } from './services/social-fetcher'
import { registerIdeaIpcHandlers } from './ipc/ideas'
import { registerHighlightIpcHandlers } from './ipc/highlights'
import { registerAiSummaryHandlers } from './services/ai-summary'
import { registerAiUsageHandlers } from './services/ai-usage-tracker'
import { registerProfileIpcHandlers } from './ipc/profile'
import { registerMoodboardIpcHandlers } from './ipc/moodboard'
import { loadPlugins, getLoadedPlugins, unloadPlugin } from './services/plugin-loader'
import { getDatabase, closeDatabase } from './database/connection'
import { runMigrations } from './database/migrations'
import { seedSocialData } from './database/seeds/social-seeds'

const isDev = !app.isPackaged

// Suppress EPIPE errors in dev mode (harmless stdout disconnect)
process.on('uncaughtException', (err) => {
  if ((err as NodeJS.ErrnoException).code === 'EPIPE') return
  console.error('Uncaught Exception:', err)
})

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      webviewTag: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Initialize file storage directories
  initFileStorage()

  // Initialize database and run migrations
  const db = getDatabase()
  runMigrations(db)

  // Register all IPC handlers
  registerAllIpcHandlers()
  registerFileIpcHandlers()
  registerSettingsIpcHandlers()
  registerTaskIpcHandlers()
  registerProjectIpcHandlers()
  registerArticleIpcHandlers()
  registerAiIpcHandlers()
  registerVideoAssetIpcHandlers()
  registerRssIpcHandlers()
  registerWeatherIpcHandlers()
  registerSearchIpcHandlers()
  registerNotificationIpcHandlers()
  registerRssFetcherHandlers()
  registerSocialIpcHandlers()
  registerSocialFetcherHandlers()
  registerIdeaIpcHandlers()
  registerHighlightIpcHandlers()
  registerAiSummaryHandlers()
  registerAiUsageHandlers()
  registerProfileIpcHandlers()
  registerMoodboardIpcHandlers()

  // Load plugins
  const loadedPluginInfos = loadPlugins()
  console.log(`[App] Loaded ${loadedPluginInfos.length} plugins`)

  // Plugin management IPC
  ipcMain.handle('plugins:list', () => {
    return { success: true, data: getLoadedPlugins() }
  })

  ipcMain.handle('plugins:unload', async (_event, pluginId: string) => {
    const result = await unloadPlugin(pluginId)
    return { success: result }
  })

  // Seed initial data
  seedSocialData(db)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
