import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'

interface ArticleViewerProps {
  articleId: number
  articleUrl: string
  articleTitle: string
  onClose: () => void
}

interface Highlight {
  id: number
  article_id: number
  selected_text: string
  note: string | null
  created_at: string
}

export function ArticleViewer({ articleId, articleUrl, articleTitle, onClose }: ArticleViewerProps) {
  const [loading, setLoading] = useState(true)
  const [activePanel, setActivePanel] = useState<'highlights' | 'summary' | null>(null)
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [selectionBar, setSelectionBar] = useState<{ text: string; x: number; y: number } | null>(null)
  const webviewRef = useRef<HTMLWebViewElement>(null)
  const listenersAttached = useRef(false)

  const { data: highlights, refetch: refetchHighlights } = useIpcData<Highlight[]>('highlights:getByArticle', articleId)
  const { mutate: createHighlight } = useIpcMutation<number>('highlights:create')
  const { mutate: deleteHighlight } = useIpcMutation<boolean>('highlights:delete')

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv || listenersAttached.current) return
    listenersAttached.current = true

    const onDomReady = () => {
      setLoading(false)
      injectSelectionListener(wv)
    }
    const onDidStartLoading = () => setLoading(true)
    const onDidStopLoading = () => setLoading(false)

    wv.addEventListener('dom-ready', onDomReady)
    wv.addEventListener('did-start-loading', onDidStartLoading)
    wv.addEventListener('did-stop-loading', onDidStopLoading)

    return () => {
      wv.removeEventListener('dom-ready', onDomReady)
      wv.removeEventListener('did-start-loading', onDidStartLoading)
      wv.removeEventListener('did-stop-loading', onDidStopLoading)
      listenersAttached.current = false
    }
  }, [])

  useEffect(() => {
    if (highlights && highlights.length > 0 && webviewRef.current) {
      restoreHighlights(webviewRef.current, highlights)
    }
  }, [highlights])

  // Refetch highlights when panel opens
  useEffect(() => {
    if (activePanel === 'highlights') {
      refetchHighlights()
    }
  }, [activePanel, refetchHighlights])

  const injectSelectionListener = (wv: HTMLWebViewElement) => {
    const script = `
      (function() {
        window.__xhsSelection = null;
        function getSelectionData() {
          var sel = window.getSelection();
          var text = (sel && sel.toString().trim()) || '';
          if (text.length > 0 && sel.rangeCount > 0) {
            var range = sel.getRangeAt(0);
            var rect = range.getBoundingClientRect();
            return { text: text, x: rect.left + rect.width / 2, y: rect.top };
          }
          return null;
        }
        document.addEventListener('mouseup', function(e) {
          if (e.button === 2) {
            // Right-click: show menu if there's a selection
            var data = getSelectionData();
            if (data) {
              window.__xhsSelection = data;
              return;
            }
          }
          if (e.button === 0) {
            // Left-click: show menu if there's a selection
            setTimeout(function() {
              var data = getSelectionData();
              window.__xhsSelection = data;
            }, 10);
          }
        });
        document.addEventListener('mousedown', function(e) {
          if (e.button === 0) {
            setTimeout(function() {
              var sel = window.getSelection();
              if (!sel || sel.toString().trim().length === 0) {
                window.__xhsSelection = null;
              }
            }, 50);
          }
        });
      })();
    `
    try { wv.executeJavaScript(script) } catch { /* ignore */ }
  }

  const restoreHighlights = (wv: HTMLWebViewElement, items: Highlight[]) => {
    const texts = items.map((h) => h.selected_text)
    const script = `
      (function() {
        var texts = ${JSON.stringify(texts)};
        texts.forEach(function(text) {
          var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          var node;
          while (node = walk.nextNode()) {
            var idx = node.textContent.indexOf(text);
            if (idx >= 0) {
              var range = document.createRange();
              range.setStart(node, idx);
              range.setEnd(node, idx + text.length);
              var span = document.createElement('mark');
              span.style.backgroundColor = 'rgba(254, 195, 0, 0.3)';
              span.style.borderRadius = '2px';
              span.style.padding = '0 1px';
              span.className = 'xhs-highlight';
              range.surroundContents(span);
              break;
            }
          }
        });
      })();
    `
    try { wv.executeJavaScript(script) } catch { /* ignore */ }
  }

  const scrollToHighlight = (text: string) => {
    if (!webviewRef.current) return
    const script = `
      (function() {
        var marks = document.querySelectorAll('mark.xhs-highlight');
        for (var i = 0; i < marks.length; i++) {
          if (marks[i].textContent.includes(${JSON.stringify(text.substring(0, 30))})) {
            marks[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
            marks[i].style.outline = '2px solid rgba(107, 56, 212, 0.6)';
            setTimeout(function() { marks[i].style.outline = ''; }, 2000);
            break;
          }
        }
      })();
    `
    try { webviewRef.current.executeJavaScript(script) } catch { /* ignore */ }
  }

  // Poll webview for text selection via executeJavaScript
  useEffect(() => {
    let lastKey: string | null = null
    const interval = setInterval(async () => {
      const wv = webviewRef.current
      if (!wv) return
      try {
        const data = await wv.executeJavaScript('window.__xhsSelection')
        const key = data ? `${data.text}-${data.x}` : null
        if (key !== lastKey) {
          lastKey = key
          setSelectionBar(data || null)
        }
      } catch { /* ignore */ }
    }, 200)
    return () => clearInterval(interval)
  }, [])

  const handleHighlight = async () => {
    if (!selectionBar) return
    const result = await createHighlight({ article_id: articleId, selected_text: selectionBar.text })
    setSelectionBar(null)
    if (result) {
      await refetchHighlights()
    }
    if (webviewRef.current) {
      const allTexts = [...(highlights?.map((h) => h.selected_text) ?? []), selectionBar.text]
      restoreHighlights(webviewRef.current, allTexts.map((t) => ({ id: 0, article_id: articleId, selected_text: t, note: null, created_at: '' })))
    }
  }

  const handleSummarize = async (text?: string) => {
    setActivePanel('summary')
    setSummaryLoading(true)
    setSelectionBar(null)
    try {
      const content = text || (webviewRef.current ? await webviewRef.current.executeJavaScript('document.body.innerText.substring(0, 8000)') : '')
      const res = await window.electronAPI.invoke('ai:summarize', content)
      setSummary(res.success ? res.data : 'Failed to generate summary.')
    } catch {
      setSummary('Failed to generate summary.')
    }
    setSummaryLoading(false)
  }

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text) } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] pb-[5vh] titlebar-no-drag" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* A4 Panel */}
      <div
        className="relative w-full max-w-[900px] h-[90vh] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <header className="flex items-center gap-sm px-md py-2 border-b border-outline-variant/30 bg-surface shrink-0">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-label-md text-on-surface truncate">{articleTitle}</p>
          </div>
          <div className="flex items-center gap-xs">
            <button
              onClick={() => window.electronAPI.openExternal(articleUrl)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              title="Open in browser"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            </button>
            <button
              onClick={() => setActivePanel(activePanel === 'highlights' ? null : 'highlights')}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors relative',
                activePanel === 'highlights' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container',
              )}
              title="Highlights"
            >
              <span className="material-symbols-outlined text-[18px]">format_ink_highlighter</span>
              {highlights && highlights.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-secondary-container text-on-secondary-container text-[9px] font-bold rounded-full flex items-center justify-center">
                  {highlights.length}
                </span>
              )}
            </button>
            <button
              onClick={() => handleSummarize()}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                activePanel === 'summary' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container',
              )}
              title="AI Summary"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          <div className="w-full h-full relative">
            {loading && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 z-10">
                <div className="h-full bg-primary animate-pulse w-2/3" />
              </div>
            )}
            <webview
              ref={webviewRef}
              src={articleUrl}
              partition="persist:article-reader"
              className="w-full h-full"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />
          </div>

          {/* Context menu */}
          {selectionBar && (
            <div
              className="absolute z-[60] bg-inverse-surface text-inverse-on-surface rounded-lg py-xs shadow-xl min-w-[160px]"
              style={{ left: Math.min(selectionBar.x, 700), top: selectionBar.y + 8 }}
            >
              <button
                onClick={handleHighlight}
                className="w-full flex items-center gap-sm px-md py-1.5 hover:bg-white/10 transition-colors text-label-sm"
              >
                <span className="material-symbols-outlined text-[16px]">format_ink_highlighter</span>
                Highlight
              </button>
              <div className="h-px bg-white/10 mx-sm" />
              <button
                onClick={() => handleSummarize(selectionBar.text)}
                className="w-full flex items-center gap-sm px-md py-1.5 hover:bg-white/10 transition-colors text-label-sm"
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                AI Summarize
              </button>
            </div>
          )}

          {/* Highlights overlay */}
          {activePanel === 'highlights' && (
            <div className="absolute inset-0 z-20 flex justify-end">
              <div className="absolute inset-0 bg-black/30" onClick={() => setActivePanel(null)} />
              <div className="relative w-80 bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col shadow-xl">
                <div className="flex items-center justify-between px-sm py-2 border-b border-outline-variant/30 shrink-0">
                  <h3 className="font-label-md text-on-surface flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[16px] text-primary">format_ink_highlighter</span>
                    Highlights
                  </h3>
                  <div className="flex items-center gap-xs">
                    <span className="text-[11px] text-on-surface-variant">{highlights?.length ?? 0}</span>
                    <button onClick={() => setActivePanel(null)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-sm space-y-sm">
                  {highlights && highlights.length > 0 ? (
                    highlights.map((h) => (
                      <div
                        key={h.id}
                        onClick={() => { scrollToHighlight(h.selected_text); setActivePanel(null) }}
                        className="bg-surface-container rounded-lg p-sm cursor-pointer hover:bg-surface-container-high transition-colors group"
                      >
                        <p className="text-body-sm text-on-surface italic line-clamp-3">"{h.selected_text}"</p>
                        {h.note && <p className="text-[11px] text-on-surface-variant mt-xs">{h.note}</p>}
                        <div className="flex justify-between items-center mt-xs">
                          <span className="text-[10px] text-on-surface-variant">
                            {new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <div className="flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleCopy(h.selected_text) }} className="text-on-surface-variant hover:text-primary transition-colors">
                              <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteHighlight(h.id); refetchHighlights() }} className="text-on-surface-variant hover:text-error transition-colors">
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-lg">
                      <span className="material-symbols-outlined text-[32px] text-on-surface-variant/30 block mb-xs">format_ink_highlighter</span>
                      <p className="text-body-sm text-on-surface-variant">Select text to highlight</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Summary overlay */}
          {activePanel === 'summary' && (
            <div className="absolute inset-0 z-20 flex justify-end">
              <div className="absolute inset-0 bg-black/30" onClick={() => setActivePanel(null)} />
              <div className="relative w-96 bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col shadow-xl">
                <div className="flex items-center justify-between px-sm py-2 border-b border-outline-variant/30 shrink-0">
                  <h3 className="font-label-md text-on-surface flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
                    AI Summary
                  </h3>
                  <button onClick={() => setActivePanel(null)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-sm">
                  {summaryLoading ? (
                    <div className="flex flex-col items-center justify-center py-xl gap-sm">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-body-sm text-on-surface-variant">Generating summary...</p>
                    </div>
                  ) : (
                    <div className="space-y-sm">
                      <p className="text-body-sm text-on-surface leading-relaxed whitespace-pre-wrap">{summary}</p>
                      {summary && (
                        <div className="flex gap-xs pt-sm border-t border-outline-variant/30">
                          <button
                            onClick={() => handleCopy(summary)}
                            className="flex items-center gap-xs px-2.5 py-1 rounded-md text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            Copy
                          </button>
                          <button
                            onClick={async () => {
                              await createHighlight({ article_id: articleId, selected_text: summary, note: 'AI Summary' })
                              refetchHighlights()
                            }}
                            className="flex items-center gap-xs px-2.5 py-1 rounded-md text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">format_ink_highlighter</span>
                            Save as Highlight
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
