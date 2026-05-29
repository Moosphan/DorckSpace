import { ipcMain, shell, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import { copyFileSync, existsSync, mkdirSync, readFile } from 'fs'
import { join, basename, extname } from 'path'
import { getAbsolutePath } from '../services/file-service'

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

  // Image picker for editor
  ipcMain.handle('editor:pickImage', async () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (!win) return { success: false, error: 'No window' }

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] },
      ],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Canceled' }
    }

    const filePath = result.filePaths[0]
    const mediaDir = getAbsolutePath('media/images')
    if (!existsSync(mediaDir)) mkdirSync(mediaDir, { recursive: true })

    const fileName = `${Date.now()}_${basename(filePath)}`
    const destPath = join(mediaDir, fileName)
    copyFileSync(filePath, destPath)

    const ext = extname(filePath).toLowerCase().replace('.', '')
    const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp' }[ext] || 'image/png'

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      readFile(destPath, (err, data) => err ? reject(err) : resolve(data))
    })
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`

    return { success: true, data: { url: dataUrl, name: fileName } }
  })
}
