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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: defaultTheme,
  general: defaultGeneral,
  loaded: false,

  setTheme: (partial) =>
    set((state) => {
      const newTheme = { ...state.theme, ...partial }
      // Apply dark mode class immediately
      if (partial.mode !== undefined) {
        const root = document.documentElement
        if (partial.mode === 'dark') {
          root.classList.add('dark')
          root.classList.remove('light')
        } else if (partial.mode === 'light') {
          root.classList.add('light')
          root.classList.remove('dark')
        } else {
          // System preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.toggle('dark', prefersDark)
          root.classList.toggle('light', !prefersDark)
        }
      }
      return { theme: newTheme }
    }),

  setGeneral: (partial) =>
    set((state) => ({ general: { ...state.general, ...partial } })),

  loadSettings: async () => {
    try {
      const settings = await window.electronAPI.getSettings()
      if (settings) {
        set({
          theme: { ...defaultTheme, ...(settings as Record<string, unknown>).theme },
          general: { ...defaultGeneral, ...(settings as Record<string, unknown>).general },
          loaded: true,
        })
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
