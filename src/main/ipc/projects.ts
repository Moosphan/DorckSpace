import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { ProjectRepository } from '../database/repositories/project-repository'

const PROJECTS_CHANNELS = {
  GET_ALL: 'projects:getAll',
  GET_ACTIVE: 'projects:getActive',
  GET_FOCUS: 'projects:getFocus',
  GET_BY_ID: 'projects:getById',
  CREATE: 'projects:create',
  UPDATE: 'projects:update',
  SET_FOCUS: 'projects:setFocus',
  UPDATE_PROGRESS: 'projects:updateProgress',
  DELETE: 'projects:delete',
} as const

function getRepo(): ProjectRepository {
  return new ProjectRepository(getDatabase())
}

export function registerProjectIpcHandlers(): void {
  ipcMain.handle(PROJECTS_CHANNELS.GET_ALL, () => {
    try {
      return { success: true, data: getRepo().findAll() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(PROJECTS_CHANNELS.GET_ACTIVE, () => {
    try {
      return { success: true, data: getRepo().findActive() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(PROJECTS_CHANNELS.GET_FOCUS, () => {
    try {
      return { success: true, data: getRepo().findFocus() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(PROJECTS_CHANNELS.GET_BY_ID, (_event, id: number) => {
    try {
      return { success: true, data: getRepo().findById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(PROJECTS_CHANNELS.CREATE, (_event, data) => {
    try {
      const id = getRepo().create(data)
      return { success: true, data: id }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(PROJECTS_CHANNELS.UPDATE, (_event, id: number, data) => {
    try {
      return { success: true, data: getRepo().update(id, data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(PROJECTS_CHANNELS.SET_FOCUS, (_event, id: number) => {
    try {
      getRepo().setFocus(id)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(PROJECTS_CHANNELS.UPDATE_PROGRESS, (_event, id: number, progress: number) => {
    try {
      return { success: true, data: getRepo().updateProgress(id, progress) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(PROJECTS_CHANNELS.DELETE, (_event, id: number) => {
    try {
      return { success: true, data: getRepo().deleteById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
