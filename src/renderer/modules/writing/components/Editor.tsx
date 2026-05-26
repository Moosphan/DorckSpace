import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface EditorProps {
  content?: string
  onUpdate?: (content: string) => void
  placeholder?: string
  className?: string
  autofocus?: boolean
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null

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

  return (
    <div className="flex items-center gap-xs p-sm border-b border-outline-variant/30 flex-wrap">
      <ToolButton
        icon="format_bold"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      />
      <ToolButton
        icon="format_italic"
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      />
      <ToolButton
        icon="highlight"
        isActive={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Highlight"
      />
      <ToolButton
        icon="strikethrough_s"
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strike"
      />
      <div className="w-px h-6 bg-outline-variant/30 mx-xs" />
      <ToolButton
        icon="format_h1"
        isActive={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="H1"
      />
      <ToolButton
        icon="format_h2"
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="H2"
      />
      <ToolButton
        icon="format_h3"
        isActive={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="H3"
      />
      <div className="w-px h-6 bg-outline-variant/30 mx-xs" />
      <ToolButton
        icon="format_list_bulleted"
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      />
      <ToolButton
        icon="format_list_numbered"
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Ordered List"
      />
      <ToolButton
        icon="checklist"
        isActive={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Task List"
      />
      <div className="w-px h-6 bg-outline-variant/30 mx-xs" />
      <ToolButton
        icon="code"
        isActive={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code Block"
      />
      <ToolButton
        icon="format_quote"
        isActive={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      />
      <ToolButton
        icon="horizontal_rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divider"
      />
      <div className="flex-1" />
      <span className="text-body-sm text-on-surface-variant">
        {editor.storage.characterCount?.characters?.() ?? editor.getText().length} chars
      </span>
    </div>
  )
}

export function Editor({ content = '', onUpdate, placeholder = 'Start writing...', className, autofocus }: EditorProps) {
  const [isSourceMode, setIsSourceMode] = useState(false)
  const [sourceContent, setSourceContent] = useState(content)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: content || '<p></p>',
    autofocus: false,
    onCreate: autofocus
      ? ({ editor: ed }) => {
          setTimeout(() => {
            if (ed && !ed.isDestroyed) ed.commands.focus('start')
          }, 100)
        }
      : undefined,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setSourceContent(html)

      // Auto-save with debounce
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(() => {
        onUpdate?.(html)
      }, 2000)
    },
  })

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content])

  const toggleSourceMode = useCallback(() => {
    if (isSourceMode) {
      // Switch back to WYSIWYG: apply source content
      editor?.commands.setContent(sourceContent)
    } else {
      // Switch to source: get current HTML
      setSourceContent(editor?.getHTML() ?? '')
    }
    setIsSourceMode(!isSourceMode)
  }, [isSourceMode, editor, sourceContent])

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
          {isSourceMode ? 'Visual' : 'Source'}
        </button>
      </div>
      {isSourceMode ? (
        <textarea
          value={sourceContent}
          onChange={(e) => setSourceContent(e.target.value)}
          className="flex-1 min-h-[400px] p-md font-mono text-body-sm text-on-surface bg-transparent outline-none resize-none"
          spellCheck={false}
        />
      ) : (
        <EditorContent
          editor={editor}
          className="flex-1 min-h-[400px] p-md prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-on-surface-variant/50 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
        />
      )}
    </div>
  )
}
