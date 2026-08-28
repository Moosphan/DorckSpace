import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { ContentVariantRepository } from '../database/repositories/content-variant-repository'

function getRepository(): ContentVariantRepository {
  return new ContentVariantRepository(getDatabase())
}

export function registerContentVariantIpcHandlers(): void {
  ipcMain.handle('content-variants:getByArticle', (_event, articleId: number) => {
    try {
      return { success: true, data: getRepository().findByArticleId(articleId) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('content-variants:upsert', (_event, input: { articleId: number; platform: string; title: string; content: string }) => {
    try {
      return { success: true, data: getRepository().upsertVariant(input) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('publish-receipts:getByArticle', (_event, articleId: number) => {
    try {
      return { success: true, data: getRepository().findReceiptsByArticleId(articleId) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('publish-receipts:createPrepared', (_event, input: { articleId: number; platform: string; variantId?: number }) => {
    try {
      return { success: true, data: getRepository().createPreparedReceipt(input) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('publish-receipts:markPublished', (_event, receiptId: number, destinationUrl: string) => {
    try {
      return { success: true, data: getRepository().markReceiptPublished(receiptId, destinationUrl) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
