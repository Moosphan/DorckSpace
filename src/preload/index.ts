import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI = {
  // System
  getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_PLATFORM),
  openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL, url),
  showItemInFolder: (path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SHOW_ITEM_IN_FOLDER, path),

  // Generic IPC invoke
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  onNotificationNavigate: (callback: (payload: { route: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { route: string }) => callback(payload)
    ipcRenderer.on('notification:navigate', listener)
    return () => ipcRenderer.removeListener('notification:navigate', listener)
  },
  onNotificationCenterEvent: (channel: 'notification:center:new' | 'notification:center:read' | 'notification:center:allRead', callback: (payload: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
  getSetting: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
  setSetting: (key: string, value: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),

  // File system
  readFile: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_FILE, path),
  writeFile: (path: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE_FILE, path, content),
  deleteFile: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_DELETE_FILE, path),
  fileExists: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_EXISTS, path),
  getUserDataPath: () => ipcRenderer.invoke(IPC_CHANNELS.FS_GET_USER_DATA_PATH),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
