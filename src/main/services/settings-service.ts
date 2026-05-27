import { ipcMain, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { IPC_CHANNELS, DEFAULT_SETTINGS } from '@shared/constants'
import { getAbsolutePath } from './file-service'

const SENSITIVE_FIELDS = [
  'integrations.githubToken',
  'integrations.notionToken',
  'integrations.claudeApiKey',
]

function encryptValue(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) return value
  return safeStorage.encryptString(value).toString('base64')
}

function decryptValue(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) return value
  try {
    return safeStorage.decryptString(Buffer.from(value, 'base64'))
  } catch {
    return value
  }
}

function processFields(
  settings: Record<string, unknown>,
  fn: (val: string) => string,
): Record<string, unknown> {
  const result = { ...settings }
  for (const field of SENSITIVE_FIELDS) {
    const keys = field.split('.')
    let obj: Record<string, unknown> = result
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]] || typeof obj[keys[i]] !== 'object') obj[keys[i]] = {}
      obj = obj[keys[i]] as Record<string, unknown>
    }
    const lastKey = keys[keys.length - 1]
    if (typeof obj[lastKey] === 'string' && obj[lastKey]) {
      obj[lastKey] = fn(obj[lastKey] as string)
    }
  }
  return result
}

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
    const settings = JSON.parse(content)
    return processFields(settings, decryptValue)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function writeSettingsFile(settings: Record<string, unknown>): void {
  const path = getSettingsPath()
  const encrypted = processFields(settings, encryptValue)
  writeFileSync(path, JSON.stringify(encrypted, null, 2), 'utf-8')
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
