export interface PluginManifest {
  id: string
  name: string
  version: string
  author?: string
  description?: string
  main?: string
  renderer?: string
  minAppVersion?: string
  permissions?: PluginPermission[]
  contributes?: PluginContributions
}

export type PluginPermission =
  | 'db:read'
  | 'db:write'
  | 'fs:read'
  | 'fs:write'
  | 'settings:read'
  | 'settings:write'
  | 'ipc:register'
  | 'ui:toast'

export interface PluginContributions {
  navItems?: Array<{
    label: string
    icon: string
    path: string
    position: 'top' | 'bottom'
    order?: number
  }>
  widgets?: Array<{
    zone: string
    id: string
    component: string
    title: string
    icon?: string
    order?: number
  }>
}

export interface PluginInfo {
  id: string
  name: string
  version: string
  enabled: boolean
  loadedAt: string
}
