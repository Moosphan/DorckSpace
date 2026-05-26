import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { ArticleRepository } from '../database/repositories/article-repository'

const ARTICLES_CHANNELS = {
  GET_ALL: 'articles:getAll',
  GET_RECENT: 'articles:getRecent',
  GET_BY_ID: 'articles:getById',
  GET_CATEGORIES: 'articles:getCategories',
  ADD_CATEGORY: 'articles:addCategory',
  CREATE: 'articles:create',
  UPDATE: 'articles:update',
  UPDATE_CONTENT: 'articles:updateContent',
  UPDATE_STATUS: 'articles:updateStatus',
  DELETE: 'articles:delete',
} as const

function getRepo(): ArticleRepository {
  return new ArticleRepository(getDatabase())
}

export function registerArticleIpcHandlers(): void {
  ipcMain.handle(ARTICLES_CHANNELS.GET_ALL, (_event, limit?: number, offset?: number) => {
    try {
      return { success: true, data: getRepo().findAll(limit, offset) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(ARTICLES_CHANNELS.GET_RECENT, (_event, limit?: number) => {
    try {
      return { success: true, data: getRepo().findRecent(limit) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(ARTICLES_CHANNELS.GET_BY_ID, (_event, id: number) => {
    try {
      return { success: true, data: getRepo().findById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(ARTICLES_CHANNELS.GET_CATEGORIES, () => {
    try {
      return { success: true, data: getRepo().getCategories() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(ARTICLES_CHANNELS.ADD_CATEGORY, (_event, category: string) => {
    try {
      getRepo().addUserCategory(category)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(ARTICLES_CHANNELS.CREATE, (_event, data) => {
    try {
      return { success: true, data: getRepo().create(data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(ARTICLES_CHANNELS.UPDATE, (_event, id: number, data) => {
    try {
      return { success: true, data: getRepo().update(id, data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(ARTICLES_CHANNELS.UPDATE_CONTENT, (_event, id: number, content: string) => {
    try {
      return { success: true, data: getRepo().updateContent(id, content) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(ARTICLES_CHANNELS.UPDATE_STATUS, (_event, id: number, status: string) => {
    try {
      return { success: true, data: getRepo().updateStatus(id, status as 'draft' | 'editing' | 'review' | 'published' | 'archived') }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(ARTICLES_CHANNELS.DELETE, (_event, id: number) => {
    try {
      return { success: true, data: getRepo().deleteById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
