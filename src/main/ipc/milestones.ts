import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { MilestoneRepository } from '../database/repositories/milestone-repository'

function getRepo(): MilestoneRepository {
  return new MilestoneRepository(getDatabase())
}

export function registerMilestoneIpcHandlers(): void {
  ipcMain.handle('milestones:getByProject', (_event, projectId: number) => {
    try {
      return { success: true, data: getRepo().findByProject(projectId) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('milestones:create', (_event, data) => {
    try {
      const id = getRepo().create(data)
      return { success: true, data: id }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('milestones:update', (_event, id: number, data) => {
    try {
      return { success: true, data: getRepo().update(id, data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('milestones:delete', (_event, id: number) => {
    try {
      return { success: true, data: getRepo().deleteById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('milestones:markReached', (_event, id: number) => {
    try {
      return { success: true, data: getRepo().markReached(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
