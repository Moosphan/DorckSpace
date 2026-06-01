import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface UserProfile {
  id: number
  name: string
  avatar_path: string | null
  avatar_data_url: string | null
  bio: string | null
  email: string | null
  location: string | null
  website: string | null
  github_url: string | null
  blog_url: string | null
  social_links: string
  created_at: string
}

interface ProfileStats {
  articles: number
  tasks: number
  ideas: number
  highlights: number
}

interface SocialLink {
  platform: string
  url: string
}

interface ProfileDialogProps {
  open: boolean
  onClose: () => void
}

export function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  // Editable fields
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [email, setEmail] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])

  useEffect(() => {
    if (open) {
      setEditing(false)
      fetchProfile()
      fetchStats()
    }
  }, [open])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.invoke('profile:get')
      if (res.success && res.data) {
        setProfile(res.data)
        setName(res.data.name || '')
        setBio(res.data.bio || '')
        setEmail(res.data.email || '')
        setLocation(res.data.location || '')
        setWebsite(res.data.website || '')

        // Parse social links
        try {
          const links = JSON.parse(res.data.social_links || '{}')
          const linksArray: SocialLink[] = []
          if (links.github) linksArray.push({ platform: 'GitHub', url: links.github })
          if (links.blog) linksArray.push({ platform: 'Blog', url: links.blog })
          if (links.twitter) linksArray.push({ platform: 'Twitter', url: links.twitter })
          Object.entries(links).forEach(([key, value]) => {
            if (!['github', 'blog', 'twitter'].includes(key) && value) {
              linksArray.push({ platform: key, url: value as string })
            }
          })
          setSocialLinks(linksArray)
        } catch {
          setSocialLinks([])
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await window.electronAPI.invoke('profile:getStats')
      if (res.success) {
        setStats(res.data)
      }
    } catch { /* ignore */ }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const linksObj: Record<string, string> = {}
      socialLinks.forEach(link => {
        const key = link.platform.toLowerCase()
        linksObj[key] = link.url
      })

      const res = await window.electronAPI.invoke('profile:update', {
        name,
        bio,
        email,
        location,
        website,
        social_links: JSON.stringify(linksObj),
      })

      if (res.success) {
        toast({ title: 'Profile updated', variant: 'success' })
        setEditing(false)
        fetchProfile()
      } else {
        toast({ title: 'Failed to update profile', variant: 'error' })
      }
    } catch {
      toast({ title: 'Failed to update profile', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleUploadAvatar = async () => {
    try {
      const res = await window.electronAPI.invoke('profile:uploadAvatar')
      if (res.success) {
        // Refresh profile to get the new avatar_data_url
        fetchProfile()
        toast({ title: 'Avatar updated', variant: 'success' })
      }
    } catch {
      toast({ title: 'Failed to upload avatar', variant: 'error' })
    }
  }

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: '', url: '' }])
  }

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index))
  }

  const updateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = [...socialLinks]
    updated[index] = { ...updated[index], [field]: value }
    setSocialLinks(updated)
  }

  const handleClose = () => {
    setEditing(false)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl border border-outline-variant/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-md py-3 border-b border-outline-variant/30 flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Personal Information</h3>
          <div className="flex items-center gap-xs">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                title="Edit"
              >
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-md space-y-md">
          {loading ? (
            <div className="space-y-md">
              <div className="h-20 bg-surface-container animate-pulse rounded-lg" />
              <div className="h-10 bg-surface-container animate-pulse rounded-lg" />
            </div>
          ) : (
            <>
              {/* Avatar + Basic Info */}
              <div className="flex items-start gap-md">
                <div
                  className={cn(
                    'flex flex-col items-center gap-xs',
                    editing && 'cursor-pointer'
                  )}
                  onClick={editing ? handleUploadAvatar : undefined}
                >
                  {profile?.avatar_data_url ? (
                    <img
                      src={profile.avatar_data_url}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover border-2 border-outline-variant/30"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-headline-md font-bold">
                      {name.charAt(0).toUpperCase() || 'D'}
                    </div>
                  )}
                  {editing && (
                    <span className="text-[10px] text-primary">Change</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {editing ? (
                    <div className="space-y-xs">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none"
                        placeholder="Name"
                      />
                      <input
                        type="text"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-1.5 text-body-sm outline-none"
                        placeholder="Bio"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-on-surface">{name || 'Dorck'}</p>
                      {bio && <p className="text-body-sm text-on-surface-variant mt-0.5">{bio}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats - moved up */}
              {stats && (
                <div className="grid grid-cols-4 gap-xs">
                  <div className="text-center py-xs px-sm rounded-lg bg-surface-container-low">
                    <p className="font-bold text-primary text-body-sm">{stats.articles}</p>
                    <p className="text-[10px] text-on-surface-variant">Articles</p>
                  </div>
                  <div className="text-center py-xs px-sm rounded-lg bg-surface-container-low">
                    <p className="font-bold text-primary text-body-sm">{stats.tasks}</p>
                    <p className="text-[10px] text-on-surface-variant">Tasks</p>
                  </div>
                  <div className="text-center py-xs px-sm rounded-lg bg-surface-container-low">
                    <p className="font-bold text-primary text-body-sm">{stats.ideas}</p>
                    <p className="text-[10px] text-on-surface-variant">Ideas</p>
                  </div>
                  <div className="text-center py-xs px-sm rounded-lg bg-surface-container-low">
                    <p className="font-bold text-primary text-body-sm">{stats.highlights}</p>
                    <p className="text-[10px] text-on-surface-variant">Highlights</p>
                  </div>
                </div>
              )}

              {/* Contact & Social - Preview or Edit */}
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-sm">
                    <div>
                      <label className="font-label-sm text-on-surface-variant">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none mt-xs"
                      />
                    </div>
                    <div>
                      <label className="font-label-sm text-on-surface-variant">Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City, Country"
                        className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none mt-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-label-sm text-on-surface-variant">Website</label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none mt-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-xs">
                      <label className="font-label-sm text-on-surface-variant">Social Links</label>
                      <button
                        onClick={addSocialLink}
                        className="text-primary text-body-sm hover:underline flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        Add
                      </button>
                    </div>
                    <div className="space-y-xs">
                      {socialLinks.map((link, index) => (
                        <div key={index} className="flex items-center gap-xs">
                          <input
                            type="text"
                            value={link.platform}
                            onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                            placeholder="Platform"
                            className="w-20 bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-sm py-1 text-[12px] outline-none"
                          />
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                            placeholder="https://..."
                            className="flex-1 bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-sm py-1 text-[12px] outline-none font-mono"
                          />
                          <button
                            onClick={() => removeSocialLink(index)}
                            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-sm">
                  {(email || location || website) && (
                    <div className="space-y-xs">
                      {email && (
                        <div className="flex items-center gap-sm text-body-sm">
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">mail</span>
                          <span className="text-on-surface">{email}</span>
                        </div>
                      )}
                      {location && (
                        <div className="flex items-center gap-sm text-body-sm">
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">location_on</span>
                          <span className="text-on-surface">{location}</span>
                        </div>
                      )}
                      {website && (
                        <div className="flex items-center gap-sm text-body-sm">
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">language</span>
                          <a href={website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{website}</a>
                        </div>
                      )}
                    </div>
                  )}

                  {socialLinks.length > 0 && (
                    <div className="flex flex-wrap gap-xs">
                      {socialLinks.map((link, index) => (
                        <a
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-sm py-xs rounded-full bg-surface-container-low text-[11px] font-bold text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                        >
                          {link.platform}
                        </a>
                      ))}
                    </div>
                  )}

                  {profile?.created_at && (
                    <p className="text-[11px] text-on-surface-variant">
                      Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - only show in edit mode */}
        {editing && (
          <div className="px-md py-3 bg-surface-container border-t border-outline-variant/30 flex justify-end gap-sm rounded-b-2xl">
            <button
              onClick={() => setEditing(false)}
              className="px-md py-1.5 rounded-full font-label-md text-on-surface-variant hover:bg-surface-variant transition-colors text-body-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-md py-1.5 rounded-full bg-primary text-on-primary font-label-md hover:brightness-110 active:scale-95 transition-all text-body-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
