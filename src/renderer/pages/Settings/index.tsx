import { useSettingsStore, type ThemeMode } from '@/stores/settingsStore'

const themeOptions: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
  { value: 'system', label: 'System', icon: 'sync' },
]

const accentColors = [
  '#6B38D4',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#3B82F6',
  '#EC4899',
]

export default function Settings() {
  const { theme, setTheme } = useSettingsStore()

  return (
    <div className="p-margin max-w-[1024px] mx-auto w-full space-y-lg animate-fade-in">
      <div>
        <h2 className="font-headline-lg text-headline-lg">Settings</h2>
        <p className="text-body-md text-on-surface-variant mt-2">
          Manage your workspace preferences and integrations.
        </p>
      </div>

      {/* Theme Section */}
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-8 space-y-6">
        <h3 className="font-headline-sm text-headline-sm pb-4 border-b border-outline-variant/30">
          Theme & Colors
        </h3>

        {/* Color Scheme */}
        <div>
          <label className="font-label-md text-on-surface-variant block mb-4">Color Scheme</label>
          <div className="flex gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme({ mode: option.value })}
                className={`flex-1 flex flex-col items-center gap-2 p-2.5 rounded-xl border-2 transition-colors ${
                  theme.mode === option.value
                    ? 'border-primary bg-surface-container-low'
                    : 'border-transparent bg-surface-container-low hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-2xl text-on-surface-variant">
                  {option.icon}
                </span>
                <span
                  className={`font-label-sm ${
                    theme.mode === option.value ? 'text-primary font-bold' : 'text-on-surface-variant'
                  }`}
                >
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Primary Accent */}
        <div>
          <label className="font-label-md text-on-surface-variant block mb-4">Primary Accent</label>
          <div className="flex flex-wrap gap-2">
            {accentColors.map((color) => (
              <button
                key={color}
                onClick={() => setTheme({ primaryColor: color })}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  theme.primaryColor === color
                    ? 'ring-2 ring-offset-2 ring-current scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              >
                {theme.primaryColor === color && (
                  <span className="material-symbols-outlined text-white text-[14px]">check</span>
                )}
              </button>
            ))}
            <button className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant text-[14px]">
                add
              </span>
            </button>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-4">
            This color will be used for buttons, active states, and focus rings.
          </p>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end gap-4">
        <button className="px-6 py-3 rounded-full font-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
          Discard Changes
        </button>
        <button className="px-6 py-3 rounded-full bg-primary text-on-primary font-label-md hover:brightness-110 shadow-md transition-all active:scale-95">
          Save Preferences
        </button>
      </div>
    </div>
  )
}
