import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'

interface SearchResult {
  id: number
  type: 'article' | 'task' | 'note' | 'draft'
  title: string
  subtitle: string
  icon: string
}

function searchAll(query: string): SearchResult[] {
  const db = getDatabase()
  const pattern = `%${query}%`
  const results: SearchResult[] = []

  // Search articles
  const articles = db.prepare(
    `SELECT id, title, category, status FROM articles
     WHERE title LIKE ? OR content LIKE ? OR category LIKE ?
     ORDER BY updated_at DESC LIMIT 5`
  ).all(pattern, pattern, pattern) as Array<{ id: number; title: string; category: string | null; status: string }>

  for (const a of articles) {
    results.push({
      id: a.id,
      type: 'article',
      title: a.title,
      subtitle: `${a.status}${a.category ? ` · ${a.category}` : ''}`,
      icon: 'article',
    })
  }

  // Search tasks
  const tasks = db.prepare(
    `SELECT id, title, status, priority FROM tasks
     WHERE title LIKE ? OR description LIKE ?
     ORDER BY created_at DESC LIMIT 5`
  ).all(pattern, pattern) as Array<{ id: number; title: string; status: string; priority: string }>

  for (const t of tasks) {
    results.push({
      id: t.id,
      type: 'task',
      title: t.title,
      subtitle: `${t.priority} · ${t.status}`,
      icon: 'task_alt',
    })
  }

  // Search notes
  const notes = db.prepare(
    `SELECT id, title, category FROM notes
     WHERE title LIKE ? OR content LIKE ?
     ORDER BY updated_at DESC LIMIT 5`
  ).all(pattern, pattern) as Array<{ id: number; title: string | null; category: string | null }>

  for (const n of notes) {
    results.push({
      id: n.id,
      type: 'note',
      title: n.title || 'Untitled Note',
      subtitle: n.category || 'note',
      icon: 'sticky_note_2',
    })
  }

  // Search drafts
  const drafts = db.prepare(
    `SELECT id, title, type FROM drafts
     WHERE title LIKE ? OR content LIKE ?
     ORDER BY created_at DESC LIMIT 5`
  ).all(pattern, pattern) as Array<{ id: number; title: string | null; type: string }>

  for (const d of drafts) {
    results.push({
      id: d.id,
      type: 'draft',
      title: d.title || 'Untitled Draft',
      subtitle: d.type,
      icon: 'snippet_folder',
    })
  }

  return results
}

export function registerSearchIpcHandlers(): void {
  ipcMain.handle('search:all', (_event, query: string) => {
    try {
      if (!query || query.trim().length < 2) {
        return { success: true, data: [] }
      }
      const results = searchAll(query.trim())
      return { success: true, data: results }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
