import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'
import { CalendarRepository } from '../database/repositories/calendar-repository'

function getRepo(): CalendarRepository {
  return new CalendarRepository(getDatabase())
}

export function registerCalendarIpcHandlers(): void {
  ipcMain.handle('calendar:getByMonth', (_event, year: number, month: number) => {
    try {
      return { success: true, data: getRepo().findByMonth(year, month) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('calendar:getByDate', (_event, date: string) => {
    try {
      return { success: true, data: getRepo().findByDate(date) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('calendar:getUpcoming', (_event, limit?: number) => {
    try {
      return { success: true, data: getRepo().findUpcoming(limit ?? 5) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('calendar:create', (_event, data) => {
    try {
      const id = getRepo().create(data)
      return { success: true, data: id }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('calendar:update', (_event, id: number, data) => {
    try {
      return { success: true, data: getRepo().update(id, data) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('calendar:delete', (_event, id: number) => {
    try {
      return { success: true, data: getRepo().deleteById(id) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
