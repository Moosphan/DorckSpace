import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { TaskRepository } from '../database/repositories/task-repository'

const TASKS_CHANNELS = {
  GET_ALL: 'tasks:getAll',
  GET_PENDING: 'tasks:getPending',
  GET_BY_ID: 'tasks:getById',
  GET_BY_PROJECT: 'tasks:getByProject',
  GET_BY_STATUS: 'tasks:getByStatus',
  CREATE: 'tasks:create',
  UPDATE: 'tasks:update',
  UPDATE_STATUS: 'tasks:updateStatus',
  UPDATE_SORT_ORDER: 'tasks:updateSortOrder',
  DELETE: 'tasks:delete',
} as const

function getRepo(): TaskRepository {
  return new TaskRepository(getDatabase())
}

export function registerTaskIpcHandlers(): void {
  ipcMain.handle(TASKS_CHANNELS.GET_ALL, (_event, limit?: number, offset?: number) => {
    try {
      const tasks = getRepo().findAll(limit, offset)
      return { success: true, data: tasks }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(TASKS_CHANNELS.GET_PENDING, (_event, limit?: number) => {
    try {
      const tasks = getRepo().findPending(limit)
      return { success: true, data: tasks }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(TASKS_CHANNELS.GET_BY_ID, (_event, id: number) => {
    try {
      const task = getRepo().findById(id)
      return { success: true, data: task }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(TASKS_CHANNELS.CREATE, (_event, data) => {
    try {
      const id = getRepo().create(data)
      return { success: true, data: id }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(TASKS_CHANNELS.UPDATE, (_event, id: number, data) => {
    try {
      const result = getRepo().update(id, data)
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(TASKS_CHANNELS.UPDATE_STATUS, (_event, id: number, status: string) => {
    try {
      const result = getRepo().updateStatus(id, status as 'pending' | 'in_progress' | 'completed' | 'cancelled')
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(TASKS_CHANNELS.DELETE, (_event, id: number) => {
    try {
      const result = getRepo().deleteById(id)
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(TASKS_CHANNELS.GET_BY_PROJECT, (_event, projectId: number) => {
    try {
      const tasks = getRepo().findByProject(projectId)
      return { success: true, data: tasks }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(TASKS_CHANNELS.GET_BY_STATUS, (_event, status: string) => {
    try {
      const tasks = getRepo().findByStatus(status as 'pending' | 'in_progress' | 'completed' | 'cancelled')
      return { success: true, data: tasks }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(TASKS_CHANNELS.UPDATE_SORT_ORDER, (_event, id: number, sortOrder: number) => {
    try {
      const result = getRepo().updateSortOrder(id, sortOrder)
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
