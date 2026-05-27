import { useState, useEffect, useCallback } from 'react'
import { useSettingsStore, type ThemeMode } from '@/stores/settingsStore'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { cn } from '@/lib/utils'
import { Toggle } from '@/components/ui/toggle'
import { Input } from '@/components/ui/input'

const tabs = [
  { id: 'general', label: 'General', icon: 'tune' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'integrations', label: 'Integrations', icon: 'extension' },
  { id: 'advanced', label: 'Advanced', icon: 'settings' },
] as const

const themeOptions: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
  { value: 'system', label: 'System', icon: 'sync' },
]

const accentColors = ['#6B38D4', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899']

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-6 space-y-4">
      <h3 className="font-headline-sm text-headline-sm pb-3 border-b border-outline-variant/30">{title}</h3>
      {children}
    </section>
  )
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <p className="font-label-md text-label-md text-on-surface">{label}</p>
        {description && <p className="text-body-sm text-on-surface-variant mt-[2px]">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<string>('appearance')
  const { theme, general, setTheme, setGeneral } = useSettingsStore()
  const { data: cities, refetch: refetchCities } = useIpcData<Array<{ id: number; name: string; is_default: number }>>('weather:getCities')
  const { mutate: addCity } = useIpcMutation('weather:addCity')
  const { mutate: setDefaultCity } = useIpcMutation('weather:setDefault')
  const { mutate: deleteCity } = useIpcMutation('weather:deleteCity')
  const { mutate: autoDetect } = useIpcMutation('weather:autoDetect')

  const [newCity, setNewCity] = useState('')

  // Auto-detect city on first load if no cities saved
  useEffect(() => {
    if (cities && cities.length === 0) {
      autoDetect().then(() => refetchCities())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddCity = useCallback(async () => {
    if (!newCity.trim()) return
    const isFirst = !cities || cities.length === 0
    await addCity(newCity.trim(), isFirst)
    setNewCity('')
    refetchCities()
  }, [newCity, cities, addCity, refetchCities])

  const handleSetDefault = useCallback(async (name: string) => {
    await setDefaultCity(name)
    refetchCities()
  }, [setDefaultCity, refetchCities])

  const handleDeleteCity = useCallback(async (name: string) => {
    await deleteCity(name)
    refetchCities()
  }, [deleteCity, refetchCities])

  return (
    <div className="p-lg max-w-[1024px] mx-auto w-full space-y-lg animate-fade-in">
      <div>
        <h2 className="font-headline-lg text-headline-lg">Settings</h2>
        <p className="text-body-md text-on-surface-variant mt-2">
          Manage your workspace preferences and integrations.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-outline-variant/30 flex gap-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative pb-4 px-2 font-label-md whitespace-nowrap transition-colors flex items-center gap-xs',
              activeTab === tab.id ? 'text-primary' : 'text-on-surface-variant hover:text-primary',
            )}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6 pb-xl">
        {/* General */}
        {activeTab === 'general' && (
          <>
            <Section title="General">
              <SettingRow label="Language" description="Interface language">
                <select className="bg-surface-container-low border-none rounded-lg px-3 py-1.5 font-label-md text-on-surface appearance-none pr-8 text-body-sm"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%237B7486\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M4 6l4 4 4-4\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                >
                  <option>English</option>
                  <option>中文</option>
                </select>
              </SettingRow>
              <SettingRow label="Auto-save" description="Automatically save content while editing">
                <Toggle pressed={general.autoSave} onPressedChange={(v) => setGeneral({ autoSave: v })} />
              </SettingRow>
              <SettingRow label="Auto-save interval" description="Seconds between auto-saves">
                <span className="font-label-md text-on-surface text-body-sm">{general.autoSaveInterval}s</span>
              </SettingRow>
            </Section>

            <Section title="Weather City">
              <p className="text-body-sm text-on-surface-variant mb-sm">
                Select a city for the weather widget on your dashboard.
              </p>

              <div className="space-y-xs mb-md">
                {cities && cities.length > 0 ? (
                  cities.map((city) => (
                    <div
                      key={city.id}
                      className={cn(
                        'flex items-center gap-sm p-sm rounded-lg border transition-colors group',
                        city.is_default ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-outline-variant',
                      )}
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        {city.is_default ? 'location_on' : 'location_city'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-label-md text-on-surface text-body-sm">{city.name}</span>
                        {city.is_default ? (
                          <span className="text-[10px] text-primary font-bold ml-sm">Default</span>
                        ) : (
                          <button
                            onClick={() => handleSetDefault(city.name)}
                            className="text-[10px] text-on-surface-variant hover:text-primary transition-colors ml-sm"
                          >
                            Set default
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteCity(city.name)}
                        className="p-1 text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-body-sm text-on-surface-variant text-center py-sm">
                    Detecting location...
                  </p>
                )}
              </div>

              <div className="flex gap-sm">
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCity()}
                  placeholder="Add city (e.g., Beijing, Tokyo)"
                  className="flex-1 bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-1.5 text-body-sm outline-none"
                />
                <button
                  onClick={handleAddCity}
                  disabled={!newCity.trim()}
                  className="px-md py-1.5 bg-primary text-on-primary rounded-full font-label-md text-body-sm disabled:opacity-40 hover:brightness-110 active:scale-95 transition-all"
                >
                  Add
                </button>
              </div>
            </Section>
          </>
        )}

        {/* Appearance */}
        {activeTab === 'appearance' && (
          <>
            <Section title="Theme & Colors">
              <div>
                <label className="font-label-md text-on-surface-variant block mb-3">Color Scheme</label>
                <div className="flex gap-3">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTheme({ mode: option.value })}
                      className={cn(
                        'flex-1 flex flex-col items-center gap-2 p-2.5 rounded-xl border-2 transition-colors',
                        theme.mode === option.value
                          ? 'border-primary bg-surface-container-low'
                          : 'border-transparent bg-surface-container-low hover:bg-surface-container-high',
                      )}
                    >
                      <span className="material-symbols-outlined text-2xl text-on-surface-variant">{option.icon}</span>
                      <span className={cn('font-label-sm', theme.mode === option.value ? 'text-primary font-bold' : 'text-on-surface-variant')}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-label-md text-on-surface-variant block mb-3">Primary Accent</label>
                <div className="flex flex-wrap gap-2">
                  {accentColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setTheme({ primaryColor: color })}
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                        theme.primaryColor === color ? 'ring-2 ring-offset-2 ring-current scale-110' : 'hover:scale-110',
                      )}
                      style={{ backgroundColor: color }}
                    >
                      {theme.primaryColor === color && (
                        <span className="material-symbols-outlined text-white text-[14px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Section>
            <Section title="Typography">
              <SettingRow label="Interface Font" description="Used for all standard UI elements">
                <span className="font-label-md text-on-surface text-body-sm">Alibaba PuHuiTi 3.0</span>
              </SettingRow>
              <SettingRow label="Density" description="Adjust the overall size of text and UI elements">
                <div className="flex bg-surface-container-low p-1 rounded-lg">
                  {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setTheme({ density: d })}
                      className={cn(
                        'px-3 py-1 rounded-md text-body-sm capitalize transition-colors',
                        theme.density === d ? 'bg-surface-container-lowest shadow-sm text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-high',
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </SettingRow>
            </Section>
          </>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <Section title="Notifications">
            <SettingRow label="System notifications" description="Receive desktop notifications">
              <Toggle pressed={true} onPressedChange={() => {}} />
            </SettingRow>
            <SettingRow label="Task reminders" description="Notify when tasks are due">
              <Toggle pressed={true} onPressedChange={() => {}} />
            </SettingRow>
            <SettingRow label="RSS updates" description="Notify when new articles arrive">
              <Toggle pressed={false} onPressedChange={() => {}} />
            </SettingRow>
            <SettingRow label="Publish status" description="Notify when articles are published">
              <Toggle pressed={true} onPressedChange={() => {}} />
            </SettingRow>
          </Section>
        )}

        {/* Integrations */}
        {activeTab === 'integrations' && (
          <Section title="Platform Integrations">
            <Input label="Claude Code Path" placeholder="/usr/local/bin/claude" />
            <Input label="GitHub Token" placeholder="ghp_xxxx" type="password" />
            <Input label="Notion Token" placeholder="secret_xxxx" type="password" />
            <div className="pt-2">
              <button className="px-5 py-2 bg-primary text-on-primary rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all">
                Test Connections
              </button>
            </div>
          </Section>
        )}

        {/* Advanced */}
        {activeTab === 'advanced' && (
          <Section title="Advanced">
            <SettingRow label="Start on boot" description="Launch DorckDashboard when macOS starts">
              <Toggle pressed={general.startOnBoot} onPressedChange={(v) => setGeneral({ startOnBoot: v })} />
            </SettingRow>
            <SettingRow label="Minimize to tray" description="Keep running in the menu bar when closed">
              <Toggle pressed={general.minimizeToTray} onPressedChange={(v) => setGeneral({ minimizeToTray: v })} />
            </SettingRow>
            <SettingRow label="Clear cache" description="Remove temporary files">
              <button className="px-4 py-1.5 border border-outline-variant text-on-surface-variant rounded-full font-label-md text-body-sm hover:bg-surface-container transition-colors">
                Clear
              </button>
            </SettingRow>
            <SettingRow label="Export data" description="Download all your data as JSON">
              <button className="px-4 py-1.5 border border-outline-variant text-on-surface-variant rounded-full font-label-md text-body-sm hover:bg-surface-container transition-colors">
                Export
              </button>
            </SettingRow>
          </Section>
        )}

        {/* Save */}
        <div className="flex justify-end gap-3">
          <button className="px-5 py-2 rounded-full font-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors text-body-sm">
            Discard Changes
          </button>
          <button className="px-5 py-2 rounded-full bg-primary text-on-primary font-label-md hover:brightness-110 shadow-md transition-all active:scale-95 text-body-sm">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
