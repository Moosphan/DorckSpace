import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { IdeaRepository } from '../database/repositories/idea-repository'

const IDEAS_CHANNELS = {
  GET_ALL: 'ideas:getAll',
  GET_RECENT: 'ideas:getRecent',
  GET_PINNED: 'ideas:getPinned',
  GET_BY_ID: 'ideas:getById',
  CREATE: 'ideas:create',
  UPDATE: 'ideas:update',
  DELETE: 'ideas:delete',
  TOGGLE_PIN: 'ideas:togglePin',
} as const

function getRepo(): IdeaRepository {
  return new IdeaRepository(getDatabase())
}

export function registerIdeaIpcHandlers(): void {
  ipcMain.handle(IDEAS_CHANNELS.GET_ALL, (_event, limit?: number, offset?: number) => {
    try {
      return { success: true, data: getRepo().findAll(limit, offset) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IDEAS_CHANNELS.GET_RECENT, (_event, limit?: number) => {
    try {
      return { success: true, data: getRepo().findRecent(limit) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IDEAS_CHANNELS.GET_PINNED, () => {
    try {
      return { success: true, data: getRepo().findPinned() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IDEAS_CHANNELS.GET_BY_ID, (_event, id: number) => {
    try {
      return { success: true, data: getRepo().findById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IDEAS_CHANNELS.CREATE, (_event, data: { content: string; category?: string; is_private?: number }) => {
    try {
      return { success: true, data: getRepo().create(data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IDEAS_CHANNELS.UPDATE, (_event, id: number, data: { content?: string; category?: string; is_pinned?: number; is_private?: number }) => {
    try {
      return { success: true, data: getRepo().update(id, data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IDEAS_CHANNELS.DELETE, (_event, id: number) => {
    try {
      return { success: true, data: getRepo().deleteById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IDEAS_CHANNELS.TOGGLE_PIN, (_event, id: number) => {
    try {
      return { success: true, data: getRepo().togglePin(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
