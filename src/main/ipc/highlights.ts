import { ipcMain, clipboard } from 'electron'
import { getDatabase } from '../database/connection'
import { HighlightRepository } from '../database/repositories/highlight-repository'

const HIGHLIGHTS_CHANNELS = {
  GET_BY_ARTICLE: 'highlights:getByArticle',
  GET_ALL: 'highlights:getAll',
  CREATE: 'highlights:create',
  UPDATE_NOTE: 'highlights:updateNote',
  DELETE: 'highlights:delete',
  EXPORT_MARKDOWN: 'highlights:exportMarkdown',
} as const

function getRepo(): HighlightRepository {
  return new HighlightRepository(getDatabase())
}

export function registerHighlightIpcHandlers(): void {
  ipcMain.handle(HIGHLIGHTS_CHANNELS.GET_BY_ARTICLE, (_event, articleId: number) => {
    try {
      return { success: true, data: getRepo().findByArticleId(articleId) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(HIGHLIGHTS_CHANNELS.GET_ALL, (_event, limit?: number) => {
    try {
      return { success: true, data: getRepo().findAllWithArticle(limit) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(HIGHLIGHTS_CHANNELS.CREATE, (_event, data: { article_id: number; selected_text: string; note?: string; color?: string }) => {
    try {
      return { success: true, data: getRepo().create(data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(HIGHLIGHTS_CHANNELS.UPDATE_NOTE, (_event, id: number, note: string) => {
    try {
      return { success: true, data: getRepo().updateNote(id, note) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(HIGHLIGHTS_CHANNELS.DELETE, (_event, id: number) => {
    try {
      return { success: true, data: getRepo().deleteById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(HIGHLIGHTS_CHANNELS.EXPORT_MARKDOWN, (_event, articleId: number) => {
    try {
      const md = getRepo().exportMarkdown(articleId)
      if (md) clipboard.writeText(md)
      return { success: true, data: md }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Store latest context menu data for polling
  let latestContextMenu: { text: string; x: number; y: number } | null = null

  ipcMain.handle('highlights:contextMenu', (_event, data: { text: string; x: number; y: number } | null) => {
    latestContextMenu = data
    return { success: true }
  })

  ipcMain.handle('highlights:getContextMenu', () => {
    return { success: true, data: latestContextMenu }
  })
}
