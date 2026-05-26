import { ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { IPC_CHANNELS, DEFAULT_SETTINGS } from '@shared/constants'
import { getAbsolutePath } from './file-service'

function getSettingsPath(): string {
  return getAbsolutePath('config/settings.json')
}

function readSettingsFile(): Record<string, unknown> {
  const path = getSettingsPath()
  if (!existsSync(path)) {
    return { ...DEFAULT_SETTINGS }
  }
  try {
    const content = readFileSync(path, 'utf-8')
    return JSON.parse(content)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function writeSettingsFile(settings: Record<string, unknown>): void {
  const path = getSettingsPath()
  writeFileSync(path, JSON.stringify(settings, null, 2), 'utf-8')
}

export function registerSettingsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, () => {
    try {
      const settings = readSettingsFile()
      return { success: true, data: settings }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, (_event, key: string) => {
    try {
      const settings = readSettingsFile()
      return { success: true, data: settings[key] }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET,
    (_event, key: string, value: unknown) => {
      try {
        const settings = readSettingsFile()
        settings[key] = value
        writeSettingsFile(settings)
        return { success: true }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    },
  )
}
