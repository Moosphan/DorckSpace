import { useEditor, useEditorState, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Markdown } from 'tiptap-markdown'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface EditorProps {
  content?: string
  onUpdate?: (content: string) => void
  onExportMd?: (md: string) => void
  placeholder?: string
  className?: string
  autofocus?: boolean
}

function EditorToolbar({ editor, onSave }: { editor: ReturnType<typeof useEditor>; onSave?: (html: string) => void }) {
  const [urlInput, setUrlInput] = useState<{ type: 'link' | 'image'; value: string } | null>(null)
  const [showImageMenu, setShowImageMenu] = useState(false)
  const [showTableBar, setShowTableBar] = useState(false)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const [imgEdit, setImgEdit] = useState<{ pos: number; width: string; align: string } | null>(null)

  // Track image selection
  useEffect(() => {
    if (!editor) return
    const handler = () => {
      const { selection } = editor.state
      const { $from } = selection
      const node = 'node' in selection ? (selection as unknown as { node: { type: { name: string }; attrs: Record<string, unknown> } }).node : null
      if (node?.type.name === 'image') {
        const title = String(node.attrs.title || '')
        const alignMatch = title.match(/align:(\w+)/)
        const widthMatch = title.match(/width:([^|]*)/)
        setImgEdit({
          pos: $from.pos,
          width: widthMatch?.[1] || String(node.attrs.width || ''),
          align: alignMatch?.[1] || 'left',
        })
      } else {
        setImgEdit(null)
      }
    }
    editor.on('selectionUpdate', handler)
    return () => { editor.off('selectionUpdate', handler) }
  }, [editor])

  // Subscribe to editor state changes for reactive isActive updates
  const editorState = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) return null
      return {
        bold: ed.isActive('bold'),
        italic: ed.isActive('italic'),
        highlight: ed.isActive('highlight'),
        strike: ed.isActive('strike'),
        h1: ed.isActive('heading', { level: 1 }),
        h2: ed.isActive('heading', { level: 2 }),
        h3: ed.isActive('heading', { level: 3 }),
        bulletList: ed.isActive('bulletList'),
        orderedList: ed.isActive('orderedList'),
        taskList: ed.isActive('taskList'),
        codeBlock: ed.isActive('codeBlock'),
        blockquote: ed.isActive('blockquote'),
        link: ed.isActive('link'),
        table: ed.isActive('table'),
      }
    },
  })

  if (!editor || !editorState) return null

  const ToolButton = ({
    icon,
    isActive,
    onClick,
    title,
  }: {
    icon: string
    isActive?: boolean
    onClick: () => void
    title: string
  }) => (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
        isActive
          ? 'bg-primary text-on-primary'
          : 'text-on-surface-variant hover:bg-surface-container-high',
      )}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  )

  const toolbar = (
    <div className="flex items-center gap-xs p-sm border-b border-outline-variant/30 flex-wrap">
      <ToolButton icon="format_bold" isActive={editorState.bold} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold" />
      <ToolButton icon="format_italic" isActive={editorState.italic} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic" />
      <ToolButton icon="highlight" isActive={editorState.highlight} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight" />
      <ToolButton icon="strikethrough_s" isActive={editorState.strike} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strike" />
      <ToolButton
        icon="link"
        isActive={editorState.link}
        onClick={() => {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run()
          } else {
            setUrlInput({ type: 'link', value: '' })
            setTimeout(() => urlInputRef.current?.focus(), 50)
          }
        }}
        title="Link"
      />
      <div className="w-px h-6 bg-outline-variant/30 mx-xs" />
      <ToolButton icon="format_h1" isActive={editorState.h1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1" />
      <ToolButton icon="format_h2" isActive={editorState.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2" />
      <ToolButton icon="format_h3" isActive={editorState.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3" />
      <div className="w-px h-6 bg-outline-variant/30 mx-xs" />
      <ToolButton icon="format_list_bulleted" isActive={editorState.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List" />
      <ToolButton icon="format_list_numbered" isActive={editorState.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List" />
      <ToolButton icon="checklist" isActive={editorState.taskList} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Task List" />
      <div className="w-px h-6 bg-outline-variant/30 mx-xs" />
      <ToolButton icon="code" isActive={editorState.codeBlock} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block" />
      <ToolButton icon="format_quote" isActive={editorState.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote" />
      <ToolButton icon="horizontal_rule" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider" />
      <div className="w-px h-6 bg-outline-variant/30 mx-xs" />
      <ToolButton
        icon="image"
        onClick={() => setShowImageMenu((v) => !v)}
        title="Image"
      />
      <ToolButton
        icon="table_chart"
        isActive={editorState.table}
        onClick={() => {
          if (editorState.table) {
            setShowTableBar((v) => !v)
          } else {
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            setShowTableBar(true)
          }
        }}
        title="Table"
      />
      <div className="flex-1" />
      <span className="text-body-sm text-on-surface-variant">
        {editor.storage.characterCount?.characters?.() ?? editor.getText().length} chars
      </span>
    </div>
  )

  const handleLocalImage = async () => {
    setShowImageMenu(false)
    try {
      const res = await window.electronAPI.invoke('editor:pickImage')
      if (res?.success && res.data) {
        editor.chain().focus().setImage({ src: res.data.url }).run()
      }
    } catch (err) {
      console.error('Failed to pick image:', err)
    }
  }

  const handleUrlSubmit = () => {
    if (!urlInput || !urlInput.value.trim()) {
      setUrlInput(null)
      return
    }
    const url = urlInput.value.trim()
    if (urlInput.type === 'link') {
      editor.chain().focus().setLink({ href: url }).run()
    } else {
      editor.chain().focus().setImage({ src: url }).run()
    }
    setUrlInput(null)
  }

  return (
    <>
      {toolbar}
      {urlInput && (
        <div className="flex items-center gap-xs px-sm py-1.5 border-b border-outline-variant/30 bg-surface-container-low/50">
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            {urlInput.type === 'link' ? 'link' : 'image'}
          </span>
          <input
            ref={urlInputRef}
            type="text"
            value={urlInput.value}
            onChange={(e) => setUrlInput({ ...urlInput, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUrlSubmit()
              if (e.key === 'Escape') setUrlInput(null)
            }}
            placeholder={urlInput.type === 'link' ? 'https://example.com' : 'https://example.com/image.png'}
            className="flex-1 bg-transparent outline-none text-body-sm text-on-surface placeholder-on-surface-variant/50"
          />
          <button onClick={handleUrlSubmit} className="px-2 py-0.5 rounded text-label-sm bg-primary text-on-primary hover:brightness-110">Add</button>
          <button onClick={() => setUrlInput(null)} className="px-2 py-0.5 rounded text-label-sm text-on-surface-variant hover:bg-surface-container">Cancel</button>
        </div>
      )}

      {/* Image source menu */}
      {showImageMenu && (
        <div className="flex items-center gap-xs px-sm py-1.5 border-b border-outline-variant/30 bg-surface-container-low/50">
          <button
            onClick={handleLocalImage}
            className="flex items-center gap-xs px-2.5 py-1 rounded-md text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            Upload from computer
          </button>
          <div className="w-px h-4 bg-outline-variant/30" />
          <button
            onClick={() => { setShowImageMenu(false); setUrlInput({ type: 'image', value: '' }); setTimeout(() => urlInputRef.current?.focus(), 50) }}
            className="flex items-center gap-xs px-2.5 py-1 rounded-md text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">link</span>
            From URL
          </button>
        </div>
      )}

      {/* Table editing bar */}
      {showTableBar && editor.isActive('table') && (
        <div className="flex items-center gap-xs px-sm py-1.5 border-b border-outline-variant/30 bg-surface-container-low/50">
          <button onClick={() => editor.chain().focus().addRowBefore().run()} className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors" title="Add row above">
            <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
          </button>
          <button onClick={() => editor.chain().focus().addRowAfter().run()} className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors" title="Add row below">
            <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
          </button>
          <button onClick={() => editor.chain().focus().deleteRow().run()} className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors" title="Delete row">
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
          <div className="w-px h-4 bg-outline-variant/30 mx-xs" />
          <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors" title="Add column left">
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors" title="Add column right">
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
          <button onClick={() => editor.chain().focus().deleteColumn().run()} className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors" title="Delete column">
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
          <div className="w-px h-4 bg-outline-variant/30 mx-xs" />
          <button onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableBar(false) }} className="flex items-center gap-xs px-2 py-1 rounded text-label-sm text-error hover:bg-error/10 transition-colors">
            <span className="material-symbols-outlined text-[14px]">delete_forever</span>
            Delete Table
          </button>
        </div>
      )}

      {/* Image editing bar */}
      {imgEdit && (() => {
        const selectedImg = editor.view.dom.querySelector('img.ProseMirror-selectednode') as HTMLElement | null

        const applyStyle = (el: HTMLElement, align: string, width: string) => {
          el.style.display = 'block'
          if (align === 'center') el.style.margin = '0 auto'
          else if (align === 'right') el.style.margin = '0 0 0 auto'
          else el.style.margin = '0'
          el.style.width = width || ''
        }

        const updateImage = (newAttrs: Record<string, string | null>) => {
          const align = String(newAttrs.align ?? imgEdit.align)
          const width = String(newAttrs.width ?? imgEdit.width)

          // 1. Apply visual immediately
          if (selectedImg) {
            applyStyle(selectedImg, align, width)
          }

          // 2. Persist via title attribute: "align:center|width:50%"
          const titleStr = `align:${align}|width:${width}`
          const node = editor.state.doc.nodeAt(imgEdit.pos)
          if (node) {
            const tr = editor.state.tr.setNodeMarkup(imgEdit.pos, undefined, {
              ...node.attrs,
              title: titleStr,
            })
            editor.view.dispatch(tr)
          }

          // 3. Save
          setTimeout(() => onSave?.(editor.getHTML()), 50)
          setImgEdit({ ...imgEdit, ...newAttrs } as typeof imgEdit)
        }

        return (
          <div className="flex items-center gap-xs px-sm py-1.5 border-b border-outline-variant/30 bg-surface-container-low/50">
            <span className="text-[11px] text-on-surface-variant font-bold mr-1">Size</span>
            {[{ label: 'S', w: '33%' }, { label: 'M', w: '50%' }, { label: 'L', w: '75%' }, { label: 'XL', w: '' }].map((s) => (
              <button
                key={s.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateImage({ width: s.w || null })}
                className={cn(
                  'w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold transition-colors',
                  imgEdit.width === s.w ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high',
                )}
              >
                {s.label}
              </button>
            ))}
            <div className="w-px h-4 bg-outline-variant/30 mx-xs" />
            <span className="text-[11px] text-on-surface-variant font-bold mr-1">Align</span>
            {[
              { a: 'left', icon: 'format_align_left' },
              { a: 'center', icon: 'format_align_center' },
              { a: 'right', icon: 'format_align_right' },
            ].map((item) => (
              <button
                key={item.a}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateImage({ align: item.a })}
                className={cn(
                  'w-7 h-7 rounded flex items-center justify-center transition-colors',
                  imgEdit.align === item.a ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high',
                )}
              >
                <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
              </button>
            ))}
          </div>
        )
      })()}
    </>
  )
}

export function Editor({ content = '', onUpdate, onExportMd, placeholder = 'Start writing...', className, autofocus }: EditorProps) {
  const [isSourceMode, setIsSourceMode] = useState(false)
  const [mdSource, setMdSource] = useState(content)
  const [copied, setCopied] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>()

  const applyImageAlign = useCallback((ed: NonNullable<ReturnType<typeof useEditor>>) => {
    const imgs = ed.view.dom.querySelectorAll('img[title*="align:"]') as NodeListOf<HTMLElement>
    imgs.forEach((img) => {
      const title = img.getAttribute('title') || ''
      const alignMatch = title.match(/align:(\w+)/)
      const widthMatch = title.match(/width:([^|]*)/)
      const align = alignMatch?.[1] || 'left'
      const width = widthMatch?.[1] || ''
      img.style.display = 'block'
      if (align === 'center') img.style.margin = '0 auto'
      else if (align === 'right') img.style.margin = '0 0 0 auto'
      else img.style.margin = '0'
      if (width) img.style.width = width
    })
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      Image.configure({ allowBase64: true, inline: false }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Markdown.configure({ html: true, breaks: true }),
    ],
    content: content || '',
    autofocus: false,
    onCreate: ({ editor: ed }) => {
      setTimeout(() => applyImageAlign(ed), 100)
      if (autofocus) {
        setTimeout(() => {
          if (ed && !ed.isDestroyed) ed.commands.focus('start')
        }, 100)
      }
    },
    onTransaction: ({ editor: ed }) => {
      applyImageAlign(ed)
    },
    onUpdate: ({ editor }) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(() => {
        onUpdate?.(editor.getHTML())
      }, 2000)
    },
  })

  // Sync external content changes (skip empty-to-empty transitions)
  useEffect(() => {
    if (!editor) return
    const currentHtml = editor.getHTML()
    const isEmpty = (s: string) => !s || s === '<p></p>'
    if (!isEmpty(content) && content !== currentHtml) {
      editor.commands.setContent(content)
    }
  }, [content])

  const toggleSourceMode = useCallback(() => {
    if (isSourceMode) {
      // Switch back to WYSIWYG: parse markdown via tiptap-markdown parser
      if (editor) {
        const parsed = editor.storage.markdown?.parser?.parse(mdSource)
        if (parsed) {
          editor.commands.setContent(parsed)
        } else {
          editor.commands.setContent(mdSource)
        }
        editor.commands.focus('start')
      }
    } else {
      // Switch to source: get markdown
      const md = editor?.storage.markdown?.getMarkdown() ?? ''
      setMdSource(md)
    }
    setIsSourceMode(!isSourceMode)
  }, [isSourceMode, editor, mdSource])

  const handleCopyMd = useCallback(async () => {
    const md = editor?.storage.markdown?.getMarkdown() ?? ''
    try {
      await navigator.clipboard.writeText(md)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }, [editor])

  const handleExportMd = useCallback(() => {
    const md = editor?.storage.markdown?.getMarkdown() ?? ''
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'article.md'
    a.click()
    URL.revokeObjectURL(url)
  }, [editor])

  return (
    <div className={cn('flex flex-col bg-surface-container-lowest rounded-lg border border-outline-variant/30 overflow-hidden', className)}>
      <EditorToolbar editor={editor} onSave={onUpdate} />
      <div className="flex items-center gap-sm px-sm py-xs border-b border-outline-variant/30 bg-surface-container-low/50">
        <button
          onClick={toggleSourceMode}
          className={cn(
            'px-sm py-1 rounded-md text-label-sm transition-colors',
            isSourceMode ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high',
          )}
        >
          {isSourceMode ? 'Visual' : 'Markdown'}
        </button>
        <div className="flex-1" />
        <button
          onClick={handleCopyMd}
          className="flex items-center gap-xs px-2 py-1 rounded-md text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
          title="Copy as Markdown"
        >
          <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
          {copied ? 'Copied' : 'Copy MD'}
        </button>
        <button
          onClick={handleExportMd}
          className="flex items-center gap-xs px-2 py-1 rounded-md text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
          title="Export as Markdown file"
        >
          <span className="material-symbols-outlined text-[14px]">download</span>
          Export
        </button>
      </div>
      {isSourceMode ? (
        <textarea
          value={mdSource}
          onChange={(e) => setMdSource(e.target.value)}
          className="flex-1 min-h-[400px] p-md font-mono text-body-sm text-on-surface bg-transparent outline-none resize-none"
          spellCheck={false}
          placeholder="Write Markdown here..."
        />
      ) : (
        <EditorContent
          editor={editor}
          className="flex-1 min-h-[400px] p-md prose-editor [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-on-surface-variant/40 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:italic"
        />
      )}
    </div>
  )
}
