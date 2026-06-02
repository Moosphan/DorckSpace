import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { PortfolioRepository } from '../database/repositories/portfolio-repository'

function getRepo(): PortfolioRepository {
  return new PortfolioRepository(getDatabase())
}

export function registerPortfolioIpcHandlers(): void {
  ipcMain.handle('portfolio:getAll', () => {
    try {
      return { success: true, data: getRepo().findAll() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('portfolio:getByCategory', (_event, category: string) => {
    try {
      return { success: true, data: getRepo().findByCategory(category) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('portfolio:getCategories', () => {
    try {
      return { success: true, data: getRepo().getCategories() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('portfolio:create', (_event, data) => {
    try {
      const id = getRepo().create(data)
      return { success: true, data: id }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('portfolio:update', (_event, id: number, data) => {
    try {
      return { success: true, data: getRepo().update(id, data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('portfolio:delete', (_event, id: number) => {
    try {
      return { success: true, data: getRepo().deleteById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
