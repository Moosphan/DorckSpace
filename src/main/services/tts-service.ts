import { ipcMain } from 'electron'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { join } from 'path'
import { app } from 'electron'
import { mkdirSync, existsSync, writeFileSync, readdirSync, unlinkSync, createWriteStream } from 'fs'

interface Voice {
  name: string
  shortName: string
  gender: string
  locale: string
  friendlyName: string
}

let cachedVoices: Voice[] | null = null

function getOutputDir(): string {
  const dir = join(app.getPath('userData'), 'media/voiceover')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

async function fetchVoices(): Promise<Voice[]> {
  if (cachedVoices) return cachedVoices

  try {
    const res = await fetch(
      'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4',
    )
    const data = await res.json() as Array<{
      Name: string
      ShortName: string
      Gender: string
      Locale: string
      FriendlyName: string
    }>

    cachedVoices = data.map(v => ({
      name: v.Name,
      shortName: v.ShortName,
      gender: v.Gender,
      locale: v.Locale,
      friendlyName: v.FriendlyName,
    }))

    return cachedVoices
  } catch (err) {
    console.error('[TTS] Failed to fetch voices:', err)
    return []
  }
}

async function synthesize(
  text: string,
  voice: string,
  options: {
    rate?: string
    pitch?: string
    volume?: string
    format?: string
  } = {},
): Promise<{ success: boolean; data?: { filePath: string; fileName: string }; error?: string }> {
  try {
    const tts = new MsEdgeTTS()

    const format = options.format || OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3
    await tts.setMetadata(voice || 'en-US-AriaNeural', format as OUTPUT_FORMAT)

    const now = new Date()
    const timestamp = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}_${String(now.getMinutes()).padStart(2, '0')}_${String(now.getSeconds()).padStart(2, '0')}`
    const fileName = `voiceover-${timestamp}.mp3`
    const filePath = join(getOutputDir(), fileName)

    const { audioStream } = tts.toStream(text, {
      rate: options.rate || '+0%',
      pitch: options.pitch || '+0Hz',
      volume: options.volume || '+0%',
    })

    // Write stream to file
    const writeStream = createWriteStream(filePath)

    await new Promise<void>((resolve, reject) => {
      audioStream.pipe(writeStream)
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
      audioStream.on('error', reject)
    })

    console.log('[TTS] Audio saved to:', filePath)
    return { success: true, data: { filePath, fileName } }
  } catch (err) {
    console.error('[TTS] Synthesis error:', err)
    return { success: false, error: (err as Error).message }
  }
}

export function registerTtsHandlers(): void {
  ipcMain.handle('tts:getVoices', async () => {
    try {
      const voices = await fetchVoices()
      return { success: true, data: voices }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('tts:getVoicesByLocale', async (_event, locale: string) => {
    try {
      const voices = await fetchVoices()
      const filtered = voices.filter(v => v.locale.startsWith(locale))
      return { success: true, data: filtered }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('tts:synthesize', async (_event, text: string, voice: string, options) => {
    return synthesize(text, voice, options)
  })

  ipcMain.handle('tts:getAudioData', async (_event, filePath: string) => {
    try {
      const { existsSync, readFileSync, statSync } = await import('fs')
      if (!existsSync(filePath)) {
        return { success: false, error: 'File not found' }
      }

      const stats = statSync(filePath)
      const buffer = readFileSync(filePath)
      const base64 = buffer.toString('base64')
      const dataUrl = `data:audio/mpeg;base64,${base64}`

      return {
        success: true,
        data: { dataUrl, size: stats.size },
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('tts:deleteFile', async (_event, filePath: string) => {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath)
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('tts:listFiles', async () => {
    try {
      const dir = getOutputDir()
      if (!existsSync(dir)) return { success: true, data: [] }

      const files = readdirSync(dir)
        .filter(f => f.endsWith('.mp3'))
        .map(f => ({
          name: f,
          path: join(dir, f),
        }))

      return { success: true, data: files }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
