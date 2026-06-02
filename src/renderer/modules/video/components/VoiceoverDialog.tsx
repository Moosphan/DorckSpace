import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/toast'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Voice {
  name: string
  shortName: string
  gender: string
  locale: string
  friendlyName: string
}

function formatVoiceName(voice: Voice): string {
  // Extract name from FriendlyName: "Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)"
  let name = ''
  const match = voice.friendlyName.match(/Microsoft\s+(\w+)\s+Online/)
  if (match) {
    name = match[1]
  } else {
    // Fallback: extract from ShortName: "zh-CN-XiaoxiaoNeural"
    const shortMatch = voice.shortName.match(/^[a-z]{2}-[A-Z]{2}-(.+?)Neural$/)
    name = shortMatch ? shortMatch[1] : voice.shortName
  }

  // Extract region from ShortName: "zh-CN" -> "CN", "en-US" -> "US"
  const regionMatch = voice.shortName.match(/^[a-z]{2}-([A-Z]{2})/)
  const region = regionMatch ? regionMatch[1] : ''

  // Extract gender indicator
  const gender = voice.gender === 'Female' ? '♀' : '♂'

  return region ? `${name} ${gender} (${region})` : `${name} ${gender}`
}

interface VoiceoverDialogProps {
  open: boolean
  onClose: () => void
}

const LANGUAGE_GROUPS = [
  { locale: 'zh', label: 'Chinese' },
  { locale: 'en', label: 'English' },
  { locale: 'ja', label: 'Japanese' },
  { locale: 'ko', label: 'Korean' },
  { locale: 'fr', label: 'French' },
  { locale: 'de', label: 'German' },
  { locale: 'es', label: 'Spanish' },
  { locale: 'pt', label: 'Portuguese' },
]

export function VoiceoverDialog({ open, onClose }: VoiceoverDialogProps) {
  const { toast } = useToast()

  // State
  const [voices, setVoices] = useState<Voice[]>([])
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [text, setText] = useState('')
  const [rate, setRate] = useState(0)
  const [pitch, setPitch] = useState(0)
  const [volume, setVolume] = useState(0)
  const [selectedLang, setSelectedLang] = useState('zh')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playingFile, setPlayingFile] = useState<string | null>(null)
  const [generatedFile, setGeneratedFile] = useState<string | null>(null)
  const [generatedFiles, setGeneratedFiles] = useState<Array<{ name: string; path: string }>>([])

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Fetch voices on mount
  useEffect(() => {
    if (open) {
      fetchVoices()
      loadGeneratedFiles()
    }
  }, [open])

  // Filter voices by language
  useEffect(() => {
    const filtered = voices.filter(v => v.locale.startsWith(selectedLang))
    setFilteredVoices(filtered)
    if (filtered.length > 0 && !filtered.find(v => v.shortName === selectedVoice)) {
      setSelectedVoice(filtered[0].shortName)
    }
  }, [selectedLang, voices])

  const fetchVoices = async () => {
    try {
      const res = await window.electronAPI.invoke('tts:getVoices')
      if (res?.success) {
        setVoices(res.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch voices:', err)
    }
  }

  const loadGeneratedFiles = async () => {
    try {
      const res = await window.electronAPI.invoke('tts:listFiles')
      if (res?.success) {
        setGeneratedFiles(res.data || [])
      }
    } catch { /* ignore */ }
  }

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast({ title: 'Please enter text', variant: 'error' })
      return
    }

    setIsGenerating(true)
    try {
      const rateStr = rate >= 0 ? `+${rate}%` : `${rate}%`
      const pitchStr = pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`
      const volumeStr = volume >= 0 ? `+${volume}%` : `${volume}%`

      const res = await window.electronAPI.invoke('tts:synthesize', text, selectedVoice, {
        rate: rateStr,
        pitch: pitchStr,
        volume: volumeStr,
      })

      if (res?.success && res.data) {
        setGeneratedFile(res.data.filePath)
        toast({ title: 'Voiceover generated', variant: 'success' })
        loadGeneratedFiles()
      } else {
        toast({ title: res?.error || 'Generation failed', variant: 'error' })
      }
    } catch (err) {
      toast({ title: 'Generation failed', variant: 'error' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePlay = async (filePath?: string) => {
    const path = filePath || generatedFile
    if (!path) return

    // If clicking the same file that's playing, toggle pause/resume
    if (playingFile === path && isPlaying) {
      handleStop()
      return
    }

    try {
      const res = await window.electronAPI.invoke('tts:getAudioData', path)
      if (res?.success && res.data?.dataUrl) {
        if (audioRef.current) {
          audioRef.current.pause()
        }
        const audio = new Audio(res.data.dataUrl)
        audioRef.current = audio
        audio.onended = () => {
          setIsPlaying(false)
          setPlayingFile(null)
        }
        audio.play()
        setIsPlaying(true)
        setPlayingFile(path)
      }
    } catch (err) {
      toast({ title: 'Playback failed', variant: 'error' })
    }
  }

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setPlayingFile(null)
    }
  }

  const handleExport = async () => {
    if (!generatedFile) return
    try {
      await window.electronAPI.showItemInFolder(generatedFile)
    } catch (err) {
      toast({ title: 'Failed to open file location', variant: 'error' })
    }
  }

  const handleDeleteFile = async (filePath: string) => {
    try {
      await window.electronAPI.invoke('tts:deleteFile', filePath)
      loadGeneratedFiles()
      if (generatedFile === filePath) {
        setGeneratedFile(null)
      }
    } catch { /* ignore */ }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-2xl border border-outline-variant/30 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-md py-3 border-b border-outline-variant/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">mic</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">AI Voiceover</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-md space-y-md">
          {/* Language & Voice Selection */}
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="font-label-sm text-on-surface-variant">Language</label>
              <div className="flex flex-wrap gap-xs mt-xs">
                {LANGUAGE_GROUPS.map(lang => (
                  <button
                    key={lang.locale}
                    onClick={() => setSelectedLang(lang.locale)}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[11px] font-bold transition-all',
                      selectedLang === lang.locale
                        ? 'bg-primary text-on-primary'
                        : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant mb-xs block">Voice</label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger size="sm">
                  <SelectValue>
                    {selectedVoice && filteredVoices.find(v => v.shortName === selectedVoice)
                      ? formatVoiceName(filteredVoices.find(v => v.shortName === selectedVoice)!)
                      : 'Select voice...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectGroup>
                    <SelectLabel>Voices</SelectLabel>
                    {filteredVoices.map(voice => (
                      <SelectItem
                        key={voice.shortName}
                        value={voice.shortName}
                        icon={voice.gender === 'Female' ? 'female' : 'male'}
                      >
                        {formatVoiceName(voice)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Text Input */}
          <div>
            <label className="font-label-sm text-on-surface-variant">Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              rows={4}
              className="w-full mt-xs bg-surface-container-low border-2 border-transparent focus:border-primary rounded-lg px-md py-sm text-body-sm outline-none resize-none"
            />
          </div>

          {/* Controls */}
          <div className="grid grid-cols-3 gap-md">
            <div>
              <label className="font-label-sm text-on-surface-variant">Speed: {rate}%</label>
              <input
                type="range"
                min={-50}
                max={100}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full mt-xs accent-primary"
              />
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant">Pitch: {pitch}Hz</label>
              <input
                type="range"
                min={-50}
                max={50}
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                className="w-full mt-xs accent-primary"
              />
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant">Volume: {volume}%</label>
              <input
                type="range"
                min={-50}
                max={50}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full mt-xs accent-primary"
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex gap-sm">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !text.trim()}
              className="flex-1 flex items-center justify-center gap-xs px-md py-2 bg-primary text-on-primary rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  Generating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">mic</span>
                  Generate Voiceover
                </>
              )}
            </button>
          </div>

          {/* Playback Controls */}
          {generatedFile && (
            <div className="p-md rounded-lg bg-surface-container-low border border-outline-variant/30">
              <div className="flex items-center gap-md">
                <button
                  onClick={() => isPlaying ? handleStop() : handlePlay()}
                  className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center hover:brightness-110 transition-all"
                >
                  <span className="material-symbols-outlined fill text-[24px]">
                    {isPlaying ? 'stop' : 'play_arrow'}
                  </span>
                </button>
                <div className="flex-1">
                  <p className="text-body-sm text-on-surface font-bold">Generated Audio</p>
                  <p className="text-[11px] text-on-surface-variant">{generatedFile.split('/').pop()}</p>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-xs px-3 py-1.5 border border-outline-variant text-on-surface-variant rounded-lg font-label-md hover:bg-surface-container transition-colors text-body-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">folder_open</span>
                  Open
                </button>
              </div>
            </div>
          )}

          {/* Generated Files List */}
          {generatedFiles.length > 0 && (
            <div>
              <label className="font-label-sm text-on-surface-variant mb-xs block">Generated Files</label>
              <div className="space-y-xs max-h-40 overflow-y-auto">
                {generatedFiles.map(file => {
                  const isCurrentPlaying = playingFile === file.path
                  return (
                    <div
                      key={file.path}
                      className={cn(
                        'flex items-center gap-sm p-xs rounded border group transition-colors',
                        isCurrentPlaying ? 'bg-primary/10 border-primary/30' : 'bg-surface-container-low border-transparent',
                      )}
                    >
                      <button
                        onClick={() => handlePlay(file.path)}
                        className={cn(
                          'w-6 h-6 rounded flex items-center justify-center transition-colors',
                          isCurrentPlaying
                            ? 'text-primary bg-primary/20'
                            : 'text-primary hover:bg-primary/10',
                        )}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isCurrentPlaying && isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                      </button>
                      <span className={cn(
                        'text-[11px] truncate flex-1',
                        isCurrentPlaying ? 'text-primary font-bold' : 'text-on-surface',
                      )}>
                        {file.name}
                      </span>
                      <button
                        onClick={() => handleDeleteFile(file.path)}
                        className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
