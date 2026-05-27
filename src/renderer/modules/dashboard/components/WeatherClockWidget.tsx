import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'

interface WeatherData {
  location: string
  temperature: number
  condition: string
  icon: string
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [lastCity, setLastCity] = useState<string>('')

  const fetchWeather = useCallback(async () => {
    try {
      const res = await window.electronAPI.invoke('weather:get')
      if (res.success && res.data) {
        setWeather(res.data)
        setLastCity(res.data.city)
      }
    } catch { /* ignore */ }
  }, [])

  // Fetch on mount only
  useEffect(() => {
    fetchWeather()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for city changes via a poll (check every 30s if city changed)
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await window.electronAPI.invoke('weather:get')
        if (res.success && res.data && res.data.city !== lastCity) {
          setWeather(res.data)
          setLastCity(res.data.city)
        }
      } catch { /* ignore */ }
    }, 30 * 60 * 1000) // Re-check every 30 min
    return () => clearInterval(timer)
  }, [lastCity])

  return weather
}

export function WeatherClockWidget() {
  const now = useClock()
  const weather = useWeather()

  return (
    <div className="bg-primary text-on-primary rounded-lg p-md relative overflow-hidden shadow-ambient">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-on-primary/20 rounded-full blur-2xl" />

      <div className="relative z-10 flex flex-col">
        <div className="flex justify-between items-start mb-lg">
          <div>
            <div className="font-headline-lg text-headline-lg tracking-tight">
              {format(now, 'HH:mm')}
            </div>
            <div className="font-body-sm text-body-sm text-primary-fixed">
              {format(now, 'EEEE, MMM d')}
            </div>
          </div>
          <span className="material-symbols-outlined text-[32px] text-secondary-container fill">
            {weather?.icon || 'light_mode'}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="font-headline-sm text-headline-sm">
              {weather?.location || 'Local'}
            </div>
            <div className="font-body-sm text-body-sm text-primary-fixed">
              {weather ? `${weather.condition}, ${weather.temperature}°C` : 'Have a productive day'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
