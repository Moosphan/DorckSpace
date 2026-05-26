import { app, ipcMain } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'fs'
import { IPC_CHANNELS } from '@shared/constants'

let userDataPath: string

export function getUserDataPath(): string {
  if (!userDataPath) {
    userDataPath = app.getPath('userData')
  }
  return userDataPath
}

export function getAbsolutePath(relativePath: string): string {
  return join(getUserDataPath(), relativePath)
}

export function ensureDir(dirPath: string): void {
  const fullPath = getAbsolutePath(dirPath)
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true })
  }
}

export function initFileStorage(): void {
  const dirs = [
    'articles',
    'notes',
    'drafts',
    'media/covers',
    'media/audio',
    'media/presentations',
    'exports',
    'cache',
    'config',
  ]
  for (const dir of dirs) {
    ensureDir(dir)
  }
}

export function registerFileIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.FS_READ_FILE, (_event, filePath: string) => {
    try {
      const fullPath = getAbsolutePath(filePath)
      const content = readFileSync(fullPath, 'utf-8')
      return { success: true, data: content }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.FS_WRITE_FILE,
    (_event, filePath: string, content: string) => {
      try {
        const fullPath = getAbsolutePath(filePath)
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true })
        }
        writeFileSync(fullPath, content, 'utf-8')
        return { success: true }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  )

  ipcMain.handle(IPC_CHANNELS.FS_DELETE_FILE, (_event, filePath: string) => {
    try {
      const fullPath = getAbsolutePath(filePath)
      if (existsSync(fullPath)) {
        unlinkSync(fullPath)
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FS_EXISTS, (_event, filePath: string) => {
    try {
      const fullPath = getAbsolutePath(filePath)
      return { success: true, data: existsSync(fullPath) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FS_ENSURE_DIR, (_event, dirPath: string) => {
    try {
      ensureDir(dirPath)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FS_GET_USER_DATA_PATH, () => {
    return { success: true, data: getUserDataPath() }
  })
}
