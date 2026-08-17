import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { PluginManifest, PluginInfo } from '@shared/types/plugin'
import { createPluginHostContext, type PluginHostContext } from './plugin-host-context'

interface LoadedPlugin {
  manifest: PluginManifest
  pluginPath: string
  context: PluginHostContext
  deactivate?: () => void | Promise<void>
}

const loadedPlugins = new Map<string, LoadedPlugin>()
const pluginChannels = new Map<string, Set<string>>()

function getPluginsRoot(): string {
  return join(app.getPath('home'), '.my-dashboard', 'plugins')
}

function validateManifest(data: unknown): PluginManifest | null {
  if (!data || typeof data !== 'object') return null
  const m = data as Record<string, unknown>
  if (typeof m.id !== 'string' || !m.id) return null
  if (typeof m.name !== 'string' || !m.name) return null
  if (typeof m.version !== 'string' || !m.version) return null
  return data as PluginManifest
}

function loadSinglePlugin(pluginDir: string): LoadedPlugin | null {
  const manifestPath = join(pluginDir, 'manifest.json')
  if (!existsSync(manifestPath)) return null

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  } catch (err) {
    console.error(`[PluginLoader] Failed to parse manifest: ${manifestPath}`, err)
    return null
  }

  const manifest = validateManifest(raw)
  if (!manifest) {
    console.error(`[PluginLoader] Invalid manifest: ${manifestPath}`)
    return null
  }

  if (loadedPlugins.has(manifest.id)) {
    console.warn(`[PluginLoader] Plugin already loaded: ${manifest.id}`)
    return null
  }

  const channels = new Set<string>()
  const context = createPluginHostContext(manifest, pluginDir, channels)

  let deactivate: (() => void | Promise<void>) | undefined

  if (manifest.main) {
    const mainPath = join(pluginDir, manifest.main)
    if (!existsSync(mainPath)) {
      console.error(`[PluginLoader] Main entry not found: ${mainPath}`)
      return null
    }

    try {
      const pluginModule = require(mainPath)
      if (typeof pluginModule.activate === 'function') {
        deactivate = pluginModule.activate(context) ?? undefined
        if (deactivate && typeof deactivate !== 'function') {
          console.error(`[PluginLoader] activate() must return void or a deactivate function`)
          deactivate = undefined
        }
      } else {
        console.error(`[PluginLoader] Plugin ${manifest.id} has no activate() export`)
        return null
      }
    } catch (err) {
      console.error(`[PluginLoader] Failed to load plugin ${manifest.id}:`, err)
      return null
    }
  }

  pluginChannels.set(manifest.id, channels)
  const loaded: LoadedPlugin = { manifest, pluginPath: pluginDir, context, deactivate }
  loadedPlugins.set(manifest.id, loaded)

  console.log(`[PluginLoader] Loaded plugin: ${manifest.id} v${manifest.version}`)
  return loaded
}

export function loadPlugins(): PluginInfo[] {
  const root = getPluginsRoot()
  if (!existsSync(root)) {
    console.log(`[PluginLoader] Plugins directory not found: ${root}`)
    return []
  }

  const entries = readdirSync(root, { withFileTypes: true })
  const results: PluginInfo[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const pluginDir = join(root, entry.name)
    const loaded = loadSinglePlugin(pluginDir)
    if (loaded) {
      results.push({
        id: loaded.manifest.id,
        name: loaded.manifest.name,
        version: loaded.manifest.version,
        enabled: true,
        loadedAt: new Date().toISOString(),
      })
    }
  }

  return results
}

export async function unloadPlugin(pluginId: string): Promise<boolean> {
  const loaded = loadedPlugins.get(pluginId)
  if (!loaded) return false

  if (loaded.deactivate) {
    try {
      await loaded.deactivate()
    } catch (err) {
      console.error(`[PluginLoader] Error deactivating ${pluginId}:`, err)
    }
  }

  const channels = pluginChannels.get(pluginId)
  if (channels) {
    for (const channel of channels) {
      try {
        const { ipcMain } = require('electron')
        ipcMain.removeHandler(channel)
      } catch { /* ignore */ }
    }
    pluginChannels.delete(pluginId)
  }

  loadedPlugins.delete(pluginId)
  console.log(`[PluginLoader] Unloaded plugin: ${pluginId}`)
  return true
}

export function getLoadedPlugins(): PluginInfo[] {
  return Array.from(loadedPlugins.values()).map((p) => ({
    id: p.manifest.id,
    name: p.manifest.name,
    version: p.manifest.version,
    enabled: true,
    loadedAt: new Date().toISOString(),
  }))
}
