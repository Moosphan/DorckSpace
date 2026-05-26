import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { AISubscriptionRepository, AIToolRepository } from '../database/repositories/ai-repository'

const AI_CHANNELS = {
  GET_SUBSCRIPTIONS: 'ai:getSubscriptions',
  CREATE_SUBSCRIPTION: 'ai:createSubscription',
  UPDATE_TOKENS: 'ai:updateTokens',
  DELETE_SUBSCRIPTION: 'ai:deleteSubscription',
  GET_TOOLS: 'ai:getTools',
  CREATE_TOOL: 'ai:createTool',
} as const

function getSubRepo(): AISubscriptionRepository {
  return new AISubscriptionRepository(getDatabase())
}

function getToolRepo(): AIToolRepository {
  return new AIToolRepository(getDatabase())
}

export function registerAiIpcHandlers(): void {
  ipcMain.handle(AI_CHANNELS.GET_SUBSCRIPTIONS, () => {
    try {
      return { success: true, data: getSubRepo().findActive() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(AI_CHANNELS.CREATE_SUBSCRIPTION, (_event, data) => {
    try {
      return { success: true, data: getSubRepo().create(data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(AI_CHANNELS.UPDATE_TOKENS, (_event, id: number, tokens: number) => {
    try {
      return { success: true, data: getSubRepo().updateTokensUsed(id, tokens) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(AI_CHANNELS.DELETE_SUBSCRIPTION, (_event, id: number) => {
    try {
      return { success: true, data: getSubRepo().deleteById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(AI_CHANNELS.GET_TOOLS, (_event, category?: string) => {
    try {
      const repo = getToolRepo()
      const tools = category ? repo.findByCategory(category) : repo.findAll()
      return { success: true, data: tools }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(AI_CHANNELS.CREATE_TOOL, (_event, data) => {
    try {
      return { success: true, data: getToolRepo().create(data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
