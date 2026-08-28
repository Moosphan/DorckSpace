import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import {
  ResearchMaterialRepository,
  type CreateManualResearchMaterialInput,
} from '../database/repositories/research-material-repository'

function getRepo(): ResearchMaterialRepository {
  return new ResearchMaterialRepository(getDatabase())
}

export function registerResearchMaterialIpcHandlers(): void {
  ipcMain.handle('research-materials:getAll', () => {
    try {
      return { success: true, data: getRepo().findAll() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('research-materials:createFromRss', (_event, rssArticleId: number, links?: { projectId?: number; articleId?: number }) => {
    try {
      return { success: true, data: getRepo().createFromRssArticle(rssArticleId, links) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('research-materials:createFromHighlight', (_event, highlightId: number, links?: { projectId?: number; articleId?: number }) => {
    try {
      return { success: true, data: getRepo().createFromHighlight(highlightId, links) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('research-materials:createManual', (_event, input: CreateManualResearchMaterialInput) => {
    try {
      if (!input?.title?.trim()) throw new Error('Material title is required')
      return { success: true, data: getRepo().createManual(input) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('research-materials:updateLinks', (_event, id: number, links: { projectId?: number | null; articleId?: number | null }) => {
    try {
      return { success: true, data: getRepo().updateLinks(id, links) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('research-materials:delete', (_event, id: number) => {
    try {
      return { success: true, data: getRepo().deleteById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
