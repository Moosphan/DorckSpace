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
    <div className="p-lg space-y-md animate-fade-in max-w-[1280px] mx-auto w-full">
      {/* Hero + Token Usage */}
      <div className="grid grid-cols-12 gap-gutter items-stretch">
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-primary text-on-primary rounded-lg p-md relative overflow-hidden flex items-center justify-between h-full">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary-container rounded-full opacity-30 blur-2xl" />
            <div className="relative z-10">
              <h1 className="font-headline-md text-headline-md mb-xs">AI Lab</h1>
              <p className="text-body-sm opacity-90 max-w-md">
                Manage subscriptions, monitor usage, and explore AI tools.
              </p>
              <button
                onClick={() => setShowBrowser(true)}
                className="mt-sm px-md py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full font-label-md hover:bg-white/30 transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[16px]">language</span>
                Open Browser
              </button>
            </div>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <TokenUsage />
        </div>
      </div>

      {/* Subscriptions - full width */}
      <SubscriptionsPanel />

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
