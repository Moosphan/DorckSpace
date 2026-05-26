import { useState } from 'react'
import { SubscriptionsPanel } from './components/SubscriptionsPanel'
import { TokenUsage } from './components/TokenUsage'
import { ToolDirectory } from './components/ToolDirectory'
import { EmbeddedBrowser } from './components/EmbeddedBrowser'

export default function AILab() {
  const [showBrowser, setShowBrowser] = useState(false)
  const [browserUrl, setBrowserUrl] = useState('https://chat.openai.com')

  const handleOpenTool = (url: string) => {
    setBrowserUrl(url)
    setShowBrowser(true)
  }

  return (
    <div className="p-lg space-y-lg animate-fade-in max-w-[1280px] mx-auto w-full">
      {/* Hero */}
      <div className="bg-primary text-on-primary rounded-lg p-xl min-h-[160px] flex flex-col justify-center relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary-container rounded-full opacity-30 blur-2xl" />
        <h1 className="font-headline-xl text-headline-xl mb-xs relative z-10">AI Lab</h1>
        <p className="text-body-lg opacity-90 max-w-2xl relative z-10">
          Manage your subscriptions, monitor token usage, and explore advanced tools in your unified workspace.
        </p>
        <button
          onClick={() => setShowBrowser(true)}
          className="mt-md self-start px-md py-sm bg-white/20 backdrop-blur-sm text-white rounded-full font-label-md hover:bg-white/30 transition-colors flex items-center gap-xs relative z-10"
        >
          <span className="material-symbols-outlined text-[18px]">language</span>
          Open Browser
        </button>
      </div>

      {/* Subscriptions + Token Usage */}
      <div className="grid grid-cols-12 gap-gutter">
        <SubscriptionsPanel />
        <TokenUsage />
      </div>

      {/* Tool Directory */}
      <ToolDirectory onOpenTool={handleOpenTool} />

      {/* Embedded Browser */}
      {showBrowser && (
        <EmbeddedBrowser
          initialUrl={browserUrl}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
  )
}
