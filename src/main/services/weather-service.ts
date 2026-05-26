import { ipcMain } from 'electron'
import { getDatabase } from '../database/connection'

interface WeatherData {
  location: string
  temperature: number
  condition: string
  icon: string
  humidity: number
  windSpeed: number
  updatedAt: string
  city: string
}

interface CityRecord {
  id: number
  name: string
  is_default: number
  created_at: string
}

let cachedWeather: WeatherData | null = null
let lastFetchTime = 0
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

function getWeatherIcon(condition: string): string {
  const lower = condition.toLowerCase()
  if (lower.includes('sun') || lower.includes('clear')) return 'light_mode'
  if (lower.includes('cloud') || lower.includes('overcast')) return 'cloud'
  if (lower.includes('rain') || lower.includes('drizzle')) return 'rainy'
  if (lower.includes('snow') || lower.includes('ice')) return 'ac_unit'
  if (lower.includes('thunder') || lower.includes('storm')) return 'thunderstorm'
  if (lower.includes('fog') || lower.includes('mist')) return 'foggy'
  return 'cloud'
}

function getDefaultCity(): string {
  try {
    const db = getDatabase()
    const row = db.prepare("SELECT name FROM weather_cities WHERE is_default = 1 LIMIT 1").get() as CityRecord | undefined
    return row?.name || ''
  } catch {
    return ''
  }
}

async function detectCurrentCity(): Promise<string> {
  try {
    const res = await fetch('https://wttr.in/?format=j1')
    if (!res.ok) return ''
    const data = await res.json() as Record<string, unknown>
    const nearest = (data.nearest_area as Array<Record<string, unknown>>)?.[0]
    const city = (nearest?.areaName as Array<{ value: string }>)?.[0]?.value || ''
    return city
  } catch {
    return ''
  }
}

function ensureCitiesTable(): void {
  try {
    const db = getDatabase()
    db.exec(`
      CREATE TABLE IF NOT EXISTS weather_cities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  } catch { /* ignore if exists */ }
}

async function fetchWeather(city?: string): Promise<WeatherData> {
  const now = Date.now()
  const targetCity = city || getDefaultCity()

  // Return cache if same city and not expired
  if (cachedWeather && cachedWeather.city === targetCity && now - lastFetchTime < CACHE_DURATION) {
    return cachedWeather
  }

  try {
    const url = targetCity
      ? `https://wttr.in/${encodeURIComponent(targetCity)}?format=j1`
      : 'https://wttr.in/?format=j1'

    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json() as Record<string, unknown>
    const current = (data.current_condition as Array<Record<string, unknown>>)?.[0]
    const nearest = (data.nearest_area as Array<Record<string, unknown>>)?.[0]

    if (!current || !nearest) throw new Error('Invalid response')

    const areaName = (nearest.areaName as Array<{ value: string }>)?.[0]?.value || targetCity || 'Unknown'
    const tempC = parseInt(current.temp_C as string, 10)
    const desc = (current.weatherDesc as Array<{ value: string }>)?.[0]?.value || 'Unknown'
    const humidity = parseInt(current.humidity as string, 10)
    const windSpeed = parseInt(current.windspeedKmph as string, 10)

    cachedWeather = {
      location: areaName,
      temperature: tempC,
      condition: desc,
      icon: getWeatherIcon(desc),
      humidity,
      windSpeed,
      updatedAt: new Date().toISOString(),
      city: targetCity || areaName,
    }
    lastFetchTime = now

    return cachedWeather
  } catch (err) {
    return cachedWeather || {
      location: targetCity || 'Local',
      temperature: 0,
      condition: 'Unknown',
      icon: 'cloud',
      humidity: 0,
      windSpeed: 0,
      updatedAt: new Date().toISOString(),
      city: targetCity || 'Local',
    }
  }
}

export function registerWeatherIpcHandlers(): void {
  ensureCitiesTable()

  // Get weather data
  ipcMain.handle('weather:get', async (_event, city?: string) => {
    try {
      const data = await fetchWeather(city)
      return { success: true, data }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Get all saved cities
  ipcMain.handle('weather:getCities', () => {
    try {
      const db = getDatabase()
      const cities = db.prepare('SELECT * FROM weather_cities ORDER BY is_default DESC, created_at DESC').all()
      return { success: true, data: cities }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Add a city
  ipcMain.handle('weather:addCity', async (_event, name: string, isDefault = false) => {
    try {
      const db = getDatabase()
      ensureCitiesTable()

      if (isDefault) {
        db.prepare('UPDATE weather_cities SET is_default = 0').run()
      }

      db.prepare('INSERT OR IGNORE INTO weather_cities (name, is_default) VALUES (?, ?)').run(name, isDefault ? 1 : 0)

      // Clear cache so next weather:get fetches fresh data
      cachedWeather = null
      lastFetchTime = 0

      // Fetch weather in background (don't await)
      fetchWeather(name).catch(() => {})

      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Set default city
  ipcMain.handle('weather:setDefault', async (_event, name: string) => {
    try {
      const db = getDatabase()
      db.prepare('UPDATE weather_cities SET is_default = 0').run()
      db.prepare('UPDATE weather_cities SET is_default = 1 WHERE name = ?').run(name)

      // Clear cache so next weather:get fetches fresh data
      cachedWeather = null
      lastFetchTime = 0

      // Fetch weather in background (don't await)
      fetchWeather(name).catch(() => {})

      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Delete a city
  ipcMain.handle('weather:deleteCity', (_event, name: string) => {
    try {
      const db = getDatabase()
      db.prepare('DELETE FROM weather_cities WHERE name = ?').run(name)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Auto-detect current city and save as default
  ipcMain.handle('weather:autoDetect', async () => {
    try {
      const db = getDatabase()
      const existing = db.prepare("SELECT COUNT(*) as cnt FROM weather_cities").get() as { cnt: number }

      if (existing.cnt === 0) {
        // No cities saved - detect and save
        const city = await detectCurrentCity()
        if (city) {
          db.prepare('INSERT OR IGNORE INTO weather_cities (name, is_default) VALUES (?, 1)').run(city)
          const weather = await fetchWeather(city)
          return { success: true, data: { city, weather } }
        }
      }
      return { success: true, data: null }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
