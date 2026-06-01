import { useState, useEffect, useCallback } from 'react'
import { useSettingsStore, type ThemeMode } from '@/stores/settingsStore'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { cn } from '@/lib/utils'
import { Toggle } from '@/components/ui/toggle'
import { Input } from '@/components/ui/input'
import { ProfileDialog } from '@/components/ProfileDialog'

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

const PLATFORM_OPTIONS = [
  { value: 'bilibili', label: 'Bilibili', placeholder: 'https://space.bilibili.com/...', color: 'bg-[#FB7299]' },
  { value: 'youtube', label: 'YouTube', placeholder: 'https://www.youtube.com/@...', color: 'bg-[#FF0000]' },
  { value: 'xiaohongshu', label: 'Xiaohongshu', placeholder: 'https://www.xiaohongshu.com/user/profile/...', color: 'bg-[#FE2C55]' },
]

interface SocialAccount {
  id: number
  platform: string
  account_name: string
  profile_url: string | null
  api_config: string
}

function AiSummarySection() {
  const { general, setGeneral } = useSettingsStore()
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    window.electronAPI.getSetting('integrations').then((val: unknown) => {
      const integrations = (val as Record<string, unknown>) || {}
      setPrompt((integrations.aiSummaryPrompt as string) || '')
    })
  }, [])

  const handleSave = async () => {
    const val = await window.electronAPI.getSetting('integrations')
    const integrations = (val as Record<string, unknown>) || {}
    integrations.aiSummaryPrompt = prompt
    await window.electronAPI.setSetting('integrations', integrations)
  }

  return (
    <Section title="AI Summary">
      <div className="space-y-xs">
        <label className="font-label-sm text-on-surface-variant px-sm">Custom Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={handleSave}
          placeholder="e.g. Summarize in bullet points, focus on actionable insights, reply in Chinese..."
          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-xl px-md py-sm font-body-md text-body-sm text-on-surface placeholder-on-surface-variant/50 outline-none resize-none transition-all h-24"
        />
        <p className="text-[11px] text-on-surface-variant px-sm">
          Leave empty to use the default prompt. The prompt will be combined with the article text when generating summaries.
        </p>
      </div>
    </Section>
  )
}

function extractFromUrl(input: string, platform: string): { accountId: string; profileUrl: string } {
  const trimmed = input.trim()
  if (platform === 'bilibili') {
    const m = trimmed.match(/space\.bilibili\.com\/(\d+)/)
    if (m) return { accountId: m[1], profileUrl: trimmed }
    const uid = trimmed.replace(/\D/g, '')
    return { accountId: uid, profileUrl: `https://space.bilibili.com/${uid}` }
  }
  if (platform === 'xiaohongshu') {
    const m = trimmed.match(/xiaohongshu\.com\/user\/profile\/([a-f0-9]+)/)
    if (m) return { accountId: m[1], profileUrl: trimmed }
    return { accountId: trimmed, profileUrl: `https://www.xiaohongshu.com/user/profile/${trimmed}` }
  }
  if (platform === 'youtube') {
    const m = trimmed.match(/youtube\.com\/@?([^/?]+)/)
    if (m) return { accountId: m[1], profileUrl: trimmed }
    return { accountId: trimmed, profileUrl: `https://www.youtube.com/@${trimmed}` }
  }
  return { accountId: trimmed, profileUrl: trimmed }
}

function SocialAccountsSection() {
  const { data: accounts, loading, refetch } = useIpcData<SocialAccount[]>('social:getAccounts')
  const { mutate: addAccount } = useIpcMutation<number>('social:addAccount')
  const { mutate: deleteAccount } = useIpcMutation<boolean>('social:deleteAccount')
  const { mutate: updateAccount } = useIpcMutation<boolean>('social:updateAccount')
  const { mutate: loginXhs, loading: xhsLogging } = useIpcMutation<boolean>('social:loginXhs')
  const { mutate: fetchLogo } = useIpcMutation<string>('social:fetchLogo')
  const [xhsLoggedIn, setXhsLoggedIn] = useState<boolean | null>(null)

  const [adding, setAdding] = useState(false)
  const [newPlatform, setNewPlatform] = useState('bilibili')
  const [newInput, setNewInput] = useState('')

  const platformOpt = PLATFORM_OPTIONS.find((p) => p.value === newPlatform) || PLATFORM_OPTIONS[0]

  useEffect(() => {
    window.electronAPI.invoke('social:xhsLoginStatus').then((v: boolean) => setXhsLoggedIn(v))
  }, [])

  const handleAdd = async () => {
    if (!newInput.trim()) return
    const { accountId, profileUrl } = extractFromUrl(newInput, newPlatform)
    if (!accountId) return
    const id = await addAccount({ platform: newPlatform, account_name: accountId, profile_url: profileUrl })
    if (id && profileUrl) {
      const logo = await fetchLogo(profileUrl)
      if (logo) await updateAccount(id, { api_config: { logo } })
    }
    setNewInput('')
    setAdding(false)
    refetch()
  }

  const handleDelete = async (id: number) => {
    await deleteAccount(id)
    refetch()
  }

  const handleLoginXhs = async () => {
    const success = await loginXhs()
    setXhsLoggedIn(!!success)
  }

  return (
    <Section title="Social Accounts">
      <p className="text-body-sm text-on-surface-variant -mt-2">
        Add your social media accounts to track performance metrics in Insights.
      </p>

      {loading ? (
        <div className="animate-pulse h-20 bg-surface-container rounded-lg" />
      ) : (
        <div className="space-y-sm">
          {accounts?.map((account) => {
            const opt = PLATFORM_OPTIONS.find((p) => p.value === account.platform)
            const config = account.api_config ? JSON.parse(account.api_config) : {}
            return (
              <div key={account.id} className="flex items-center gap-sm p-sm bg-surface-container rounded-lg">
                {config.logo ? (
                  <img src={config.logo} alt={opt?.label} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold', opt?.color || 'bg-surface-variant')}>
                    {opt?.label?.[0] || account.platform[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-label-md text-on-surface truncate">{opt?.label || account.platform}</p>
                  <p className="text-[11px] text-on-surface-variant truncate">{account.account_name}</p>
                </div>
                <button onClick={() => handleDelete(account.id)} className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error transition-colors">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            )
          })}

          {adding ? (
            <div className="p-sm bg-surface-container rounded-lg space-y-sm">
              <div className="flex gap-sm">
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant/30 rounded-lg px-sm py-1.5 text-body-sm outline-none focus:border-primary"
                >
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newInput}
                  onChange={(e) => setNewInput(e.target.value)}
                  placeholder={platformOpt.placeholder}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-lg px-sm py-1.5 text-body-sm outline-none focus:border-primary"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant">Paste the profile URL, account ID will be extracted automatically.</p>
              <div className="flex gap-sm">
                <button onClick={handleAdd} className="px-4 py-1.5 bg-primary text-on-primary rounded-full font-label-md text-body-sm hover:brightness-110 transition-all">Add</button>
                <button onClick={() => setAdding(false)} className="px-4 py-1.5 text-on-surface-variant font-label-md text-body-sm hover:bg-surface-container rounded-full transition-all">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full p-sm border-2 border-dashed border-outline-variant/30 rounded-lg text-on-surface-variant hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-xs font-label-md text-body-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Account
            </button>
          )}

          {accounts?.some((a) => a.platform === 'xiaohongshu') && (
            <div className="p-sm bg-surface-container-low rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <div>
                  <p className="font-label-md text-on-surface">Xiaohongshu Login</p>
                  <p className="text-[11px] text-on-surface-variant">Required for accurate follower/like data</p>
                </div>
                {xhsLoggedIn !== null && (
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                    xhsLoggedIn ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-surface-container text-on-surface-variant',
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', xhsLoggedIn ? 'bg-green-500' : 'bg-outline-variant')} />
                    {xhsLoggedIn ? 'Logged in' : 'Not logged in'}
                  </span>
                )}
              </div>
              <button
                onClick={handleLoginXhs}
                disabled={xhsLogging}
                className="px-4 py-1.5 bg-[#FE2C55] text-white rounded-full font-label-md text-body-sm hover:brightness-110 transition-all disabled:opacity-50"
              >
                {xhsLogging ? 'Opening...' : xhsLoggedIn ? 'Re-login' : 'Login'}
              </button>
            </div>
          )}
        </div>
      )}
    </Section>
  )
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<string>('appearance')
  const [profileOpen, setProfileOpen] = useState(false)
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
            <Section title="Personal Info">
              <SettingRow label="Profile" description="Manage your personal information, avatar, and social links">
                <button
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center gap-xs px-3 py-1.5 bg-primary text-on-primary rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all text-body-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Edit
                </button>
              </SettingRow>
            </Section>

            <Section title="General">
              <SettingRow label="Language" description="Interface language">
                <select
                  value={general.language}
                  onChange={(e) => setGeneral({ language: e.target.value })}
                  className="bg-surface-container-low border-none rounded-lg px-3 py-1.5 font-label-md text-on-surface appearance-none pr-8 text-body-sm"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%237B7486\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M4 6l4 4 4-4\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                >
                  <option value="en-US">English</option>
                  <option value="zh-CN">中文</option>
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
          <>
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
            <AiSummarySection />
            <SocialAccountsSection />
          </>
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

      {/* Profile Dialog */}
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
