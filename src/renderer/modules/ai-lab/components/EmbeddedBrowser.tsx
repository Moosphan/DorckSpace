import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface EmbeddedBrowserProps {
  initialUrl?: string
  onClose: () => void
}

const presetTools = [
  { name: 'ChatGPT', url: 'https://chat.openai.com', color: 'bg-green-500' },
  { name: 'Claude', url: 'https://claude.ai', color: 'bg-amber-500' },
  { name: 'Gemini', url: 'https://gemini.google.com', color: 'bg-blue-500' },
  { name: 'Perplexity', url: 'https://perplexity.ai', color: 'bg-cyan-500' },
  { name: 'Midjourney', url: 'https://midjourney.com', color: 'bg-indigo-500' },
  { name: 'GitHub Copilot', url: 'https://github.com/features/copilot', color: 'bg-gray-800' },
]

export function EmbeddedBrowser({ initialUrl = 'https://chat.openai.com', onClose }: EmbeddedBrowserProps) {
  const [inputUrl, setInputUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(true)
  const [showOverlay, setShowOverlay] = useState(true)
  const webviewRef = useRef<HTMLWebViewElement>(null)
  const listenersAttached = useRef(false)

  // Attach event listeners once
  useEffect(() => {
    const wv = webviewRef.current
    if (!wv || listenersAttached.current) return
    listenersAttached.current = true

    let hideTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleHide = () => {
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = setTimeout(() => {
        setLoading(false)
        setShowOverlay(false)
      }, 3000)
    }

    const onDomReady = () => {
      setLoading(false)
      setShowOverlay(false)
      try { setInputUrl(wv.getURL()) } catch { /* ignore */ }
    }

    const onDidNavigate = () => {
      setLoading(false)
      setShowOverlay(false)
      try { setInputUrl(wv.getURL()) } catch { /* ignore */ }
    }

    const onDidStartLoading = () => {
      setLoading(true)
      // Only show overlay on first load, not on back/forward
      scheduleHide()
    }

    const onDidStopLoading = () => {
      setLoading(false)
      setShowOverlay(false)
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
    }

    wv.addEventListener('dom-ready', onDomReady)
    wv.addEventListener('did-navigate', onDidNavigate)
    wv.addEventListener('did-start-loading', onDidStartLoading)
    wv.addEventListener('did-stop-loading', onDidStopLoading)

    return () => {
      wv.removeEventListener('dom-ready', onDomReady)
      wv.removeEventListener('did-navigate', onDidNavigate)
      wv.removeEventListener('did-start-loading', onDidStartLoading)
      wv.removeEventListener('did-stop-loading', onDidStopLoading)
      if (hideTimer) clearTimeout(hideTimer)
      listenersAttached.current = false
    }
  }, [])

  const handleNavigate = useCallback((targetUrl: string) => {
    let finalUrl = targetUrl.trim()
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }
    setInputUrl(finalUrl)
    setLoading(true)
    try { webviewRef.current?.loadURL(finalUrl) } catch { /* ignore */ }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNavigate(inputUrl)
  }, [inputUrl, handleNavigate])

  const handleBack = useCallback(() => {
    setShowOverlay(false)
    try { webviewRef.current?.goBack() } catch { /* ignore */ }
  }, [])
  const handleForward = useCallback(() => {
    setShowOverlay(false)
    try { webviewRef.current?.goForward() } catch { /* ignore */ }
  }, [])
  const handleRefresh = useCallback(() => { try { webviewRef.current?.reload() } catch { /* ignore */ } }, [])

  const handleOpenExternal = useCallback(() => {
    try { window.electronAPI.openExternal(webviewRef.current?.getURL() || inputUrl) } catch { /* ignore */ }
  }, [inputUrl])

  const browserOverlay = (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col titlebar-no-drag">
      <div aria-hidden="true" className="h-12 shrink-0 bg-surface titlebar-drag" />

      {/* Browser Chrome */}
      <div className="flex items-center gap-sm px-md py-2 bg-surface border-b border-outline-variant/30 shrink-0 titlebar-no-drag">
        <button onClick={handleBack} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <button onClick={handleForward} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
        <button onClick={handleRefresh} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>

        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">language</span>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary rounded-full px-md py-1.5 pl-9 text-body-sm outline-none"
          />
        </div>

        <div className="flex items-center gap-1">
          {presetTools.slice(0, 3).map((tool) => (
            <button
              key={tool.name}
              onClick={() => handleNavigate(tool.url)}
              className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold', tool.color)}
              title={tool.name}
            >
              {tool.name[0]}
            </button>
          ))}
        </div>

        <button onClick={handleOpenExternal} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors" title="Open in system browser">
          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
        </button>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Quick Access Bar */}
      <div className="flex items-center gap-2 px-md py-1.5 bg-surface-container-low border-b border-outline-variant/30 overflow-x-auto shrink-0">
        {presetTools.map((tool) => (
          <button
            key={tool.name}
            onClick={() => handleNavigate(tool.url)}
            className={cn(
              'flex items-center gap-xs px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors',
              'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
            )}
          >
            <span className={cn('w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold', tool.color)}>
              {tool.name[0]}
            </span>
            {tool.name}
          </button>
        ))}
      </div>

      {/* Loading bar - always show when loading (lightweight) */}
      {loading && (
        <div className="h-0.5 bg-surface-container-highest overflow-hidden shrink-0">
          <div className="h-full bg-primary w-1/3" style={{
            animation: 'loading 1.5s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* Webview */}
      <div className="flex-1 relative">
        {/* @ts-expect-error webview is Electron-specific */}
        <webview
          ref={webviewRef}
          src={initialUrl}
          className="w-full h-full"
          allowpopups={'true' as unknown as boolean}
          partition="persist:ai-browser"
          style={{ display: 'flex', flex: '1' }}
        />

        {/* Loading overlay - only show on initial load */}
        {showOverlay && loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 gap-md pointer-events-none">
            <div className="w-10 h-10 border-4 border-surface-container-highest border-t-primary rounded-full animate-spin" />
            <p className="text-body-sm text-on-surface-variant">Loading...</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )

  return createPortal(browserOverlay, document.body)
}
