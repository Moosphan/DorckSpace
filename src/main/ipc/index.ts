import { ipcMain, shell } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'

export function registerAllIpcHandlers(): void {
  // System IPC
  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_PLATFORM, () => {
    return process.platform
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL, (_event, url: string) => {
    return shell.openExternal(url)
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM_SHOW_ITEM_IN_FOLDER, (_event, path: string) => {
    return shell.showItemInFolder(path)
  })

  // Placeholder handlers for database and file system
  // These will be implemented in their respective modules
}
