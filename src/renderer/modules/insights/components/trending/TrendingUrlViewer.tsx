import { useEffect, useRef, useState } from 'react'

interface TrendingUrlViewerProps {
  url: string
  title: string
  onClose: () => void
}

export function TrendingUrlViewer({ url, title, onClose }: TrendingUrlViewerProps) {
  const webviewRef = useRef<HTMLWebViewElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return
    const onStart = () => setLoading(true)
    const onStop = () => setLoading(false)
    const onReady = () => {
      setLoading(false)
      try {
        wv.insertCSS('::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-thumb { background: rgba(123,116,134,0.55); border-radius: 999px; }')
      } catch { /* ignore */ }
    }
    wv.addEventListener('did-start-loading', onStart)
    wv.addEventListener('did-stop-loading', onStop)
    wv.addEventListener('dom-ready', onReady)
    return () => {
      wv.removeEventListener('did-start-loading', onStart)
      wv.removeEventListener('did-stop-loading', onStop)
      wv.removeEventListener('dom-ready', onReady)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[max(64px,7vh)] pb-[4vh] titlebar-no-drag" onClick={onClose}>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
      <div
        className="relative w-[min(1120px,94vw)] h-[min(820px,86vh)] overflow-hidden rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex h-12 items-center gap-sm border-b border-outline-variant/30 bg-surface px-md">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-label-md text-on-surface">{title}</p>
            <p className="truncate text-[11px] text-on-surface-variant">{url}</p>
          </div>
          <button
            onClick={() => window.electronAPI.openExternal(url)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
            title="Open externally"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </button>
        </header>
        <div className="relative h-[calc(100%-3rem)]">
          {loading && (
            <div className="absolute left-0 right-0 top-0 z-10 h-0.5 bg-primary/20">
              <div className="h-full w-2/3 animate-pulse bg-primary" />
            </div>
          )}
          <webview
            ref={webviewRef}
            src={url}
            partition="persist:trending-reader"
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    </div>
  )
}
