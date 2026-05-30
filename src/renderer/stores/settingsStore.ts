import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
export type Density = 'compact' | 'comfortable' | 'spacious'

interface ThemeSettings {
  mode: ThemeMode
  primaryColor: string
  fontFamily: string
  density: Density
}

interface GeneralSettings {
  language: string
  startOnBoot: boolean
  minimizeToTray: boolean
  autoSave: boolean
  autoSaveInterval: number
}

interface SettingsState {
  theme: ThemeSettings
  general: GeneralSettings
  loaded: boolean
  setTheme: (theme: Partial<ThemeSettings>) => void
  setGeneral: (general: Partial<GeneralSettings>) => void
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
}

const defaultTheme: ThemeSettings = {
  mode: 'light',
  primaryColor: '#6B38D4',
  fontFamily: 'Plus Jakarta Sans',
  density: 'comfortable',
}

const defaultGeneral: GeneralSettings = {
  language: 'zh-CN',
  startOnBoot: false,
  minimizeToTray: true,
  autoSave: true,
  autoSaveInterval: 30,
}

function applyThemeClass(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else if (mode === 'light') {
    root.classList.add('light')
    root.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
    root.classList.toggle('light', !prefersDark)
  }
  // Reapply primary color for the new theme mode
  applyPrimaryColor(currentPrimaryColor, root.classList.contains('dark'))
}

let currentPrimaryColor = '#6B38D4'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]
}

function rgbStr(r: number, g: number, b: number): string {
  return `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`
}

function lighten([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  return [r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount]
}

function darken([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  return [r * (1 - amount), g * (1 - amount), b * (1 - amount)]
}

function luminance([r, g, b]: [number, number, number]): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function applyPrimaryColor(hex: string, isDark?: boolean) {
  const root = document.documentElement
  const rgb = hexToRgb(hex)
  const dark = isDark ?? root.classList.contains('dark')

  if (!dark) {
    root.style.setProperty('--color-primary', rgbStr(...rgb))
    root.style.setProperty('--color-on-primary', '255 255 255')
    root.style.setProperty('--color-primary-container', rgbStr(...lighten(rgb, 0.75)))
    root.style.setProperty('--color-on-primary-container', rgbStr(...darken(rgb, 0.7)))
    root.style.setProperty('--color-primary-fixed', rgbStr(...lighten(rgb, 0.85)))
    root.style.setProperty('--color-primary-fixed-dim', rgbStr(...lighten(rgb, 0.6)))
    root.style.setProperty('--color-on-primary-fixed', rgbStr(...darken(rgb, 0.85)))
    root.style.setProperty('--color-on-primary-fixed-variant', rgbStr(...darken(rgb, 0.5)))
    root.style.setProperty('--color-inverse-primary', rgbStr(...lighten(rgb, 0.6)))
  } else {
    root.style.setProperty('--color-primary', rgbStr(...lighten(rgb, 0.6)))
    root.style.setProperty('--color-on-primary', rgbStr(...darken(rgb, 0.8)))
    root.style.setProperty('--color-primary-container', rgbStr(...darken(rgb, 0.4)))
    root.style.setProperty('--color-on-primary-container', rgbStr(...lighten(rgb, 0.85)))
    root.style.setProperty('--color-primary-fixed', rgbStr(...lighten(rgb, 0.85)))
    root.style.setProperty('--color-primary-fixed-dim', rgbStr(...lighten(rgb, 0.6)))
    root.style.setProperty('--color-on-primary-fixed', rgbStr(...darken(rgb, 0.85)))
    root.style.setProperty('--color-on-primary-fixed-variant', rgbStr(...darken(rgb, 0.5)))
    root.style.setProperty('--color-inverse-primary', rgbStr(...rgb))
  }
}

// Apply default theme immediately on module load
applyPrimaryColor(defaultTheme.primaryColor)
applyThemeClass(defaultTheme.mode)

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: defaultTheme,
  general: defaultGeneral,
  loaded: false,

  setTheme: (partial) =>
    set((state) => {
      const newTheme = { ...state.theme, ...partial }
      if (partial.mode !== undefined) applyThemeClass(partial.mode)
      if (partial.primaryColor) {
        currentPrimaryColor = partial.primaryColor
        applyPrimaryColor(partial.primaryColor)
      }
      return { theme: newTheme }
    }),

  setGeneral: (partial) => {
    set((state) => ({ general: { ...state.general, ...partial } }))
    // Persist to disk after state update
    const { general } = get()
    window.electronAPI.setSetting('general', general)
  },

  loadSettings: async () => {
    try {
      const settings = await window.electronAPI.getSettings()
      if (settings) {
        const theme = { ...defaultTheme, ...(settings as Record<string, unknown>).theme } as ThemeSettings
        currentPrimaryColor = theme.primaryColor
        applyThemeClass(theme.mode)
        set({ theme, general: { ...defaultGeneral, ...(settings as Record<string, unknown>).general }, loaded: true })
      } else {
        set({ loaded: true })
      }
    } catch {
      set({ loaded: true })
    }
  },

  saveSettings: async () => {
    const { theme, general } = get()
    await window.electronAPI.setSetting('theme', theme)
    await window.electronAPI.setSetting('general', general)
  },
}))
