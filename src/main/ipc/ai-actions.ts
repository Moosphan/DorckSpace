import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { AIActionPlannerService } from '../services/ai-action-planner-service'

function getService(): AIActionPlannerService {
  return new AIActionPlannerService(getDatabase())
}

export function registerAIActionIpcHandlers(): void {
  ipcMain.handle('ai-actions:generate', async (_event, input: { projectId: number; objective: string }) => {
    try {
      return { success: true, data: await getService().generate(input) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai-actions:getRecent', (_event, projectId?: number, limit?: number) => {
    try {
      return { success: true, data: getService().findRecent(projectId, limit) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai-actions:apply', (_event, input: { planId: number; proposalIds: number[] }) => {
    try {
      return { success: true, data: getService().apply(input) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai-actions:dismiss', (_event, proposalId: number) => {
    try {
      return { success: true, data: getService().dismiss(proposalId) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
