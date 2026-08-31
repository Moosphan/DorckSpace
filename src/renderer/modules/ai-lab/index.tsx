import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SubscriptionsPanel } from './components/SubscriptionsPanel'
import { TokenUsage } from './components/TokenUsage'
import { ToolDirectory } from './components/ToolDirectory'
import { EmbeddedBrowser } from './components/EmbeddedBrowser'
import { ResetRadarCard } from './components/ResetRadarCard'
import { ResetRadarHistoryModal } from './components/ResetRadarHistoryModal'

export default function AILab() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [showBrowser, setShowBrowser] = useState(false)
  const [browserUrl, setBrowserUrl] = useState('https://chat.openai.com')
  const [browserPartition, setBrowserPartition] = useState('persist:ai-browser')
  const [accountRefreshKey, setAccountRefreshKey] = useState(0)
  const [showResetHistory, setShowResetHistory] = useState(searchParams.get('panel') === 'reset-radar')

  useEffect(() => {
    if (searchParams.get('panel') === 'reset-radar') {
      setShowResetHistory(true)
    }
  }, [searchParams])

  const handleAccountSessionActivity = useCallback(() => {
    setAccountRefreshKey((value) => value + 1)
  }, [])

  const handleAccountUsage = useCallback(async (payload: { usage: unknown; credits: unknown | null; subscription: unknown | null; session: unknown | null }) => {
    const response = await window.electronAPI.invoke('reset-radar:updateAccountUsage', payload)
    if (response.success) {
      handleAccountSessionActivity()
    }
  }, [handleAccountSessionActivity])

  const handleOpenTool = (url: string) => {
    setBrowserUrl(url)
    setBrowserPartition('persist:ai-browser')
    setShowBrowser(true)
  }

  const handleOpenAccount = () => {
    setBrowserUrl('https://chatgpt.com')
    setBrowserPartition('persist:chatgpt-session')
    setShowBrowser(true)
  }

  return (
    <div className="p-lg space-y-md animate-fade-in max-w-[1280px] mx-auto w-full">
      {/* Radar + Token Usage */}
      <div className="grid grid-cols-12 gap-gutter items-stretch">
        <div className="col-span-12 flex lg:col-span-5">
          <ResetRadarCard
            onOpenStatus={handleOpenTool}
            onOpenAccount={handleOpenAccount}
            onOpenHistory={() => setShowResetHistory(true)}
            refreshKey={accountRefreshKey}
          />
        </div>
        <div className="col-span-12 flex min-h-0 lg:col-span-7">
          <TokenUsage refreshKey={accountRefreshKey} />
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
          partition={browserPartition}
          onSessionActivity={browserPartition === 'persist:chatgpt-session' ? handleAccountSessionActivity : undefined}
          onAccountUsage={browserPartition === 'persist:chatgpt-session' ? handleAccountUsage : undefined}
          onClose={() => {
            setShowBrowser(false)
            handleAccountSessionActivity()
          }}
        />
      )}
      {showResetHistory && (
        <ResetRadarHistoryModal
          onClose={() => {
            setShowResetHistory(false)
            if (searchParams.get('panel') === 'reset-radar') navigate('/ai-lab', { replace: true })
          }}
          onOpenUrl={handleOpenTool}
        />
      )}
    </div>
  )
}
