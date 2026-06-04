import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface PresentationViewerProps {
  filePath: string
  title: string
  onClose: () => void
}

export function PresentationViewer({ filePath, title, onClose }: PresentationViewerProps) {
  const webviewRef = useRef<HTMLWebViewElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [scale, setScale] = useState(1)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return

    const onDidStopLoading = async () => {
      setLoading(false)
      try {
        setCanGoBack(wv.canGoBack())
        setCanGoForward(wv.canGoForward())

        // Calculate scale to fit content width
        const container = containerRef.current
        if (container) {
          const contentWidth = await wv.executeJavaScript(
            'document.documentElement.scrollWidth || document.body.scrollWidth'
          )
          const containerWidth = container.clientWidth
          if (contentWidth && containerWidth && contentWidth > containerWidth) {
            setScale((containerWidth / contentWidth) * 0.98)
          } else {
            setScale(1)
          }
        }
        // Show webview after scale is applied
        setReady(true)
      } catch { setReady(true) }
    }

    wv.addEventListener('did-stop-loading', onDidStopLoading)
    return () => {
      wv.removeEventListener('did-stop-loading', onDidStopLoading)
    }
  }, [])

  const handleBack = () => {
    try { webviewRef.current?.goBack() } catch { /* ignore */ }
  }

  const handleForward = () => {
    try { webviewRef.current?.goForward() } catch { /* ignore */ }
  }

  const handleRefresh = () => {
    setScale(1)
    try { webviewRef.current?.reload() } catch { /* ignore */ }
  }

  const handleOpenExternal = () => {
    try { window.electronAPI.openExternal(`file://${filePath}`) } catch { /* ignore */ }
  }

  const content = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center titlebar-no-drag" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* A4 Panel */}
      <div
        className="relative w-full max-w-[1200px] h-[90vh] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <header className="flex items-center gap-sm px-md py-2 border-b border-outline-variant/30 bg-surface shrink-0">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-label-md text-on-surface truncate">{title}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleBack}
              disabled={!canGoBack}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30"
              title="Back"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <button
              onClick={handleForward}
              disabled={!canGoForward}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-30"
              title="Forward"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <button
              onClick={handleRefresh}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              title="Refresh"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
            <button
              onClick={handleOpenExternal}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              title="Open in system browser"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            </button>
          </div>
        </header>

        {/* Loading indicator */}
        {loading && (
          <div className="h-0.5 bg-surface-container-highest overflow-hidden shrink-0">
            <div className="h-full bg-primary animate-loading" />
          </div>
        )}

        {/* Webview with CSS transform scaling */}
        <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden">
          {/* @ts-expect-error webview is Electron-specific */}
          <webview
            ref={webviewRef}
            src={`file://${filePath}`}
            className="w-full h-full"
            style={{
              opacity: ready ? 1 : 0,
              transition: 'opacity 0.2s ease-in-out',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: `${100 / scale}%`,
              height: `${100 / scale}%`,
            }}
            partition="persist:presentation-viewer"
            allowpopups={'true' as unknown as boolean}
          />
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(200%); }
        }
        .animate-loading {
          animation: loading 1.5s ease-in-out infinite;
          width: 33%;
        }
      `}</style>
    </div>
  )

  return createPortal(content, document.body)
}
