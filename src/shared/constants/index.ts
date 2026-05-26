// IPC Channel names
export const IPC_CHANNELS = {
  // Database
  DB_QUERY: 'db:query',
  DB_RUN: 'db:run',
  DB_GET: 'db:get',
  DB_ALL: 'db:all',

  // File system
  FS_READ_FILE: 'fs:readFile',
  FS_WRITE_FILE: 'fs:writeFile',
  FS_DELETE_FILE: 'fs:deleteFile',
  FS_EXISTS: 'fs:exists',
  FS_READ_DIR: 'fs:readDir',
  FS_ENSURE_DIR: 'fs:ensureDir',
  FS_GET_USER_DATA_PATH: 'fs:getUserDataPath',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:getAll',

  // System
  SYSTEM_GET_PLATFORM: 'system:getPlatform',
  SYSTEM_OPEN_EXTERNAL: 'system:openExternal',
  SYSTEM_SHOW_ITEM_IN_FOLDER: 'system:showItemInFolder',
} as const

// App paths
export const APP_PATHS = {
  DATABASE: 'database/dashboard.db',
  ARTICLES: 'articles',
  NOTES: 'notes',
  DRAFTS: 'drafts',
  MEDIA: 'media',
  MEDIA_COVERS: 'media/covers',
  MEDIA_AUDIO: 'media/audio',
  MEDIA_PRESENTATIONS: 'media/presentations',
  EXPORTS: 'exports',
  CACHE: 'cache',
  CONFIG: 'config',
  SETTINGS: 'config/settings.json',
} as const

// Default settings
export const DEFAULT_SETTINGS = {
  theme: {
    mode: 'light' as const,
    primaryColor: '#6B38D4',
    fontFamily: 'Plus Jakarta Sans',
    density: 'comfortable' as const,
  },
  general: {
    language: 'zh-CN',
    startOnBoot: false,
    minimizeToTray: true,
    autoSave: true,
    autoSaveInterval: 30,
  },
  rss: {
    refreshInterval: 30,
    maxArticlesPerFeed: 100,
  },
} as const
