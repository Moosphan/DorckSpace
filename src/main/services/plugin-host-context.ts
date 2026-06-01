import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { usageProviderRegistry } from './usage-provider-registry'
import type { PluginManifest } from '@shared/types/plugin'

export interface PluginHostContext {
  manifest: PluginManifest
  pluginPath: string
  getDatabase(): import('better-sqlite3').Database
  registerIpcHandler(
    channel: string,
    handler: (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown,
  ): void
  unregisterIpcHandler(channel: string): void
  getPluginDataPath(): string
  registerUsageProvider(
    providerKey: string,
    fn: (apiKey: string, baseUrl?: string) => Promise<unknown>,
  ): void
  log(message: string, ...args: unknown[]): void
}

export function createPluginHostContext(
  manifest: PluginManifest,
  pluginPath: string,
  registeredChannels: Set<string>,
): PluginHostContext {
  const pluginId = manifest.id

  const pluginDataPath = join(app.getPath('userData'), 'plugin-data', pluginId)
  mkdirSync(pluginDataPath, { recursive: true })

  return {
    manifest,
    pluginPath,

    getDatabase() {
      return getDatabase()
    },

    registerIpcHandler(channel, handler) {
      const fullChannel = `plugin:${pluginId}:${channel}`
      ipcMain.handle(fullChannel, handler)
      registeredChannels.add(fullChannel)
    },

    unregisterIpcHandler(channel) {
      const fullChannel = `plugin:${pluginId}:${channel}`
      ipcMain.removeHandler(fullChannel)
      registeredChannels.delete(fullChannel)
    },

    getPluginDataPath() {
      return pluginDataPath
    },

    registerUsageProvider(providerKey, fn) {
      usageProviderRegistry.register(providerKey, fn as (apiKey: string, baseUrl?: string) => Promise<{ total_tokens: number; input_tokens: number; output_tokens: number; is_available: boolean }>)
    },

    log(message, ...args) {
      console.log(`[Plugin:${pluginId}] ${message}`, ...args)
    },
  }
}
