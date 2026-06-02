import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { MoodboardRepository } from '../database/repositories/moodboard-repository'

function getRepo(): MoodboardRepository {
  return new MoodboardRepository(getDatabase())
}

export function registerMoodboardIpcHandlers(): void {
  ipcMain.handle('moodboard:getAll', () => {
    try {
      return { success: true, data: getRepo().findAll() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('moodboard:getByCategory', (_event, category: string) => {
    try {
      return { success: true, data: getRepo().findByCategory(category) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('moodboard:getCategories', () => {
    try {
      return { success: true, data: getRepo().getCategories() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('moodboard:create', (_event, data) => {
    try {
      const id = getRepo().create(data)
      return { success: true, data: id }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('moodboard:update', (_event, id: number, data) => {
    try {
      return { success: true, data: getRepo().update(id, data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('moodboard:delete', (_event, id: number) => {
    try {
      return { success: true, data: getRepo().deleteById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('moodboard:togglePin', (_event, id: number) => {
    try {
      return { success: true, data: getRepo().togglePin(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('moodboard:updateRating', (_event, id: number, rating: number) => {
    try {
      return { success: true, data: getRepo().updateRating(id, rating) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
