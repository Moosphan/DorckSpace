import { ipcMain, dialog, BrowserWindow, protocol } from 'electron'
import { getDatabase } from '../database/connection'
import { ProfileRepository } from '../database/repositories/profile-repository'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { join, extname } from 'path'
import { app } from 'electron'

function getRepo(): ProfileRepository {
  return new ProfileRepository(getDatabase())
}

function getAvatarDataUrl(avatarPath: string | null): string | null {
  if (!avatarPath || !existsSync(avatarPath)) return null
  try {
    const ext = extname(avatarPath).toLowerCase().replace('.', '')
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
    const data = readFileSync(avatarPath)
    return `data:${mime};base64,${data.toString('base64')}`
  } catch {
    return null
  }
}

export function registerProfileIpcHandlers(): void {
  ipcMain.handle('profile:get', () => {
    try {
      const profile = getRepo().ensureProfile()
      const avatarDataUrl = getAvatarDataUrl(profile.avatar_path)
      return { success: true, data: { ...profile, avatar_data_url: avatarDataUrl } }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('profile:update', (_event, data) => {
    try {
      const repo = getRepo()
      const profile = repo.ensureProfile()
      repo.updateProfile(profile.id, data)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('profile:uploadAvatar', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return { success: false, error: 'No focused window' }

      const result = await dialog.showOpenDialog(win, {
        title: 'Select Avatar Image',
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
        ],
        properties: ['openFile'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Cancelled' }
      }

      const sourcePath = result.filePaths[0]
      const ext = extname(sourcePath)
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      const fileName = `avatar-${uniqueId}${ext}`

      const mediaDir = join(app.getPath('userData'), 'media')
      if (!existsSync(mediaDir)) mkdirSync(mediaDir, { recursive: true })

      const destPath = join(mediaDir, fileName)
      copyFileSync(sourcePath, destPath)

      // Update profile with new avatar path
      const repo = getRepo()
      const profile = repo.ensureProfile()
      repo.updateProfile(profile.id, { avatar_path: destPath })

      return { success: true, data: { path: destPath } }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('profile:getStats', () => {
    try {
      const stats = getRepo().getStats()
      return { success: true, data: stats }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
