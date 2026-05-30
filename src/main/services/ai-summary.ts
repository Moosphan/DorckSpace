import { ipcMain } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, readFileSync } from 'fs'
import { getAbsolutePath } from './file-service'
import { getDatabase } from '../database/connection'

const execAsync = promisify(exec)

function getLanguage(): string {
  try {
    const settingsPath = getAbsolutePath('config/settings.json')
    if (existsSync(settingsPath)) {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
      const lang = settings?.general?.language
      if (lang === 'zh-CN') return 'Chinese'
      if (lang === 'en-US') return 'English'
    }
  } catch { /* ignore */ }
  return 'English'
}

function buildPrompt(text: string, language: string): string {
  const truncated = text.substring(0, 6000)
  return `Summarize the following article in 3-5 concise bullet points. Focus on key insights and actionable takeaways. Reply in ${language}:\n\n${truncated}`
}

async function summarizeViaClaudeCli(text: string, language: string): Promise<string> {
  const prompt = buildPrompt(text, language)
  try {
    const { stdout } = await execAsync(`claude -p "${prompt.replace(/"/g, '\\"')}"`, {
      timeout: 30000,
      env: { ...process.env },
    })
    return stdout.trim()
  } catch {
    throw new Error('Claude CLI not available')
  }
}

async function summarizeViaApi(text: string, apiKey: string, language: string): Promise<string> {
  const prompt = buildPrompt(text, language)
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) throw new Error(`API error: ${response.status}`)
  const data = await response.json() as { content: { text: string }[] }
  return data.content?.[0]?.text || 'No summary generated.'
}

export function registerAiSummaryHandlers(): void {
  ipcMain.handle('ai:summarize', async (_event, text: string) => {
    try {
      const language = getLanguage()

      // Try Claude CLI first
      try {
        const result = await summarizeViaClaudeCli(text, language)
        return { success: true, data: result }
      } catch {
        // Fall back to API if key is configured
        const db = getDatabase()
        const row = db.prepare("SELECT value FROM settings WHERE key = 'integrations'").get() as { value: string } | undefined
        if (row) {
          const integrations = JSON.parse(row.value)
          if (integrations.anthropicApiKey) {
            const result = await summarizeViaApi(text, integrations.anthropicApiKey, language)
            return { success: true, data: result }
          }
        }
        return { success: false, error: 'No AI service configured. Set up Claude CLI or add Anthropic API key in Settings > Integrations.' }
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
