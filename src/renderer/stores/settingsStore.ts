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
}

// Apply default theme immediately on module load
applyThemeClass(defaultTheme.mode)

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: defaultTheme,
  general: defaultGeneral,
  loaded: false,

  setTheme: (partial) =>
    set((state) => {
      const newTheme = { ...state.theme, ...partial }
      if (partial.mode !== undefined) {
        applyThemeClass(partial.mode)
      }
      return { theme: newTheme }
    }),

  setGeneral: (partial) =>
    set((state) => ({ general: { ...state.general, ...partial } })),

  loadSettings: async () => {
    try {
      const settings = await window.electronAPI.getSettings()
      if (settings) {
        const theme = { ...defaultTheme, ...(settings as Record<string, unknown>).theme } as ThemeSettings
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
