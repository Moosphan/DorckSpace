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

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [urlInput, setUrlInput] = useState<{ type: 'link' | 'image'; value: string } | null>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

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
        onClick={() => {
          setUrlInput({ type: 'image', value: '' })
          setTimeout(() => urlInputRef.current?.focus(), 50)
        }}
        title="Image"
      />
      <ToolButton
        icon="table_chart"
        isActive={editorState.table}
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Table"
      />
      <div className="flex-1" />
      <span className="text-body-sm text-on-surface-variant">
        {editor.storage.characterCount?.characters?.() ?? editor.getText().length} chars
      </span>
    </div>
  )

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
    </>
  )
}

export function Editor({ content = '', onUpdate, onExportMd, placeholder = 'Start writing...', className, autofocus }: EditorProps) {
  const [isSourceMode, setIsSourceMode] = useState(false)
  const [mdSource, setMdSource] = useState(content)
  const [copied, setCopied] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      Image.configure({ HTMLAttributes: { class: 'max-w-full rounded-lg' } }),
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
    onCreate: autofocus
      ? ({ editor: ed }) => {
          setTimeout(() => {
            if (ed && !ed.isDestroyed) ed.commands.focus('start')
          }, 100)
        }
      : undefined,
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
      <EditorToolbar editor={editor} />
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
