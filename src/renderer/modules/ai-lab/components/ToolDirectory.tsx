import { useState } from 'react'
import { extensionRegistry } from '@/lib/extension-registry'
import { cn } from '@/lib/utils'

const categories = ['All Tools', 'Text', 'Image', 'Code', 'Audio', 'Video'] as const
type Category = (typeof categories)[number]

const categoryFilterMap: Record<Category, string | null> = {
  'All Tools': null,
  Text: 'text',
  Image: 'image',
  Code: 'code',
  Audio: 'audio',
  Video: 'video',
}

interface DefaultTool {
  id: string
  name: string
  description: string
  category: string
  provider: string
  url: string
  icon: string
}

const BLOCKED_HOSTS = ['claude.ai', 'chat.openai.com', 'gemini.google.com', 'midjourney.com', 'github.com']

function isBlocked(url: string): boolean {
  try { return BLOCKED_HOSTS.some((h) => new URL(url).hostname.includes(h)) } catch { return false }
}

const defaultTools: DefaultTool[] = [
  { id: 'claude', name: 'Claude', description: 'Advanced reasoning and coding assistant with Artifacts UI.', category: 'text', provider: 'Anthropic', url: 'https://claude.ai', icon: 'smart_toy' },
  { id: 'chatgpt', name: 'ChatGPT', description: 'Conversational AI with GPT-4o and DALL-E integration.', category: 'text', provider: 'OpenAI', url: 'https://chat.openai.com', icon: 'chat' },
  { id: 'gemini', name: 'Gemini', description: 'Google\'s multimodal AI for text, code, and images.', category: 'text', provider: 'Google', url: 'https://gemini.google.com', icon: 'auto_awesome' },
  { id: 'copilot', name: 'GitHub Copilot', description: 'AI pair programmer for your entire IDE.', category: 'code', provider: 'GitHub', url: 'https://github.com/features/copilot', icon: 'code' },
  { id: 'dalle', name: 'DALL-E 3', description: 'High-fidelity image generation with precise prompt following.', category: 'image', provider: 'OpenAI', url: 'https://openai.com/dall-e-3', icon: 'image' },
  { id: 'midjourney', name: 'Midjourney', description: 'AI art generation with stunning visual quality.', category: 'image', provider: 'Midjourney', url: 'https://midjourney.com', icon: 'palette' },
  { id: 'perplexity', name: 'Perplexity', description: 'AI-powered search engine with cited sources.', category: 'text', provider: 'Perplexity', url: 'https://perplexity.ai', icon: 'search' },
  { id: 'elevenlabs', name: 'ElevenLabs', description: 'AI voice generation and text-to-speech.', category: 'audio', provider: 'ElevenLabs', url: 'https://elevenlabs.io', icon: 'mic' },
]

interface ToolDirectoryProps {
  onOpenTool?: (url: string) => void
}

export function ToolDirectory({ onOpenTool }: ToolDirectoryProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('All Tools')

  // Get tools from extension registry + defaults
  const extensionTools = extensionRegistry.get('widget', 'ai-lab.tools')
  const filterValue = categoryFilterMap[activeCategory]

  const allTools = [
    ...defaultTools.filter((t) => !filterValue || t.category === filterValue),
    ...extensionTools.filter((t) => !filterValue || t.icon === filterValue),
  ]

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-lg text-headline-lg">AI Tool Directory</h2>
        <div className="flex bg-surface-container rounded-lg p-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-md py-1.5 rounded-lg text-label-md transition-all',
                activeCategory === cat
                  ? 'bg-white text-primary font-bold shadow-sm'
                  : 'hover:bg-surface-container-high font-medium',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
        {allTools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => {
              if (isBlocked(tool.url)) {
                window.electronAPI.openExternal(tool.url)
              } else {
                onOpenTool?.(tool.url)
              }
            }}
            className="bento-card group cursor-pointer border-outline-variant/60 rounded-lg hover:border-primary transition-colors"
          >
            <div className="flex justify-between items-start mb-md">
              <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">{tool.icon}</span>
              </div>
              <span className="px-sm py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">
                {tool.category}
              </span>
            </div>
            <h4 className="font-headline-sm text-headline-sm mb-xs">{tool.name}</h4>
            <p className="text-on-surface-variant text-[13px] mb-lg leading-relaxed">
              {tool.description}
            </p>
            <div className="flex items-center justify-between mt-auto pt-md border-t border-outline-variant/30">
              <span className="font-mono text-[11px] opacity-60">{tool.provider}</span>
              <span className="material-symbols-outlined text-[18px] text-primary opacity-0 group-hover:opacity-100 transition-all">
                {isBlocked(tool.url) ? 'open_in_new' : 'arrow_forward'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
