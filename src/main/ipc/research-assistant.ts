import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { ResearchAssistantService } from '../services/research-assistant-service'

function getService(): ResearchAssistantService {
  return new ResearchAssistantService(getDatabase())
}

export function registerResearchAssistantIpcHandlers(): void {
  ipcMain.handle('research-assistant:generate', async (_event, input: { materialIds: number[]; objective: string }) => {
    try {
      return { success: true, data: await getService().generate(input) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('research-assistant:getRecent', (_event, limit?: number) => {
    try {
      return { success: true, data: getService().findRecent(limit) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('research-assistant:saveAsArticle', (_event, id: number) => {
    try {
      return { success: true, data: getService().saveAsArticle(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('research-assistant:saveAsIdea', (_event, id: number) => {
    try {
      return { success: true, data: getService().saveAsIdea(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
