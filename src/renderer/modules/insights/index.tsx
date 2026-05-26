import { useState, useEffect, useCallback } from 'react'
import { ArticleFeed } from './components/ArticleFeed'
import { SocialCards } from './components/SocialCards'
import { FeedManager } from './components/FeedManager'

export default function Insights() {
  const [showFeedManager, setShowFeedManager] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Fetch all RSS feeds on page load
  useEffect(() => {
    window.electronAPI.invoke('rss:fetchAll').then(() => {
      setRefreshTrigger((prev) => prev + 1)
    }).catch(() => {})
  }, [])

  const handleFeedAdded = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  return (
    <div className="p-lg space-y-lg animate-fade-in max-w-[1280px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-xl text-headline-xl">Insights</h2>
          <p className="text-body-lg text-on-surface-variant mt-2">
            RSS feeds, social analytics, and content performance across platforms.
          </p>
        </div>
        <button
          onClick={() => setShowFeedManager(true)}
          className="h-10 px-5 bg-primary text-on-primary rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-xs"
        >
          <span className="material-symbols-outlined text-[18px]">rss_feed</span>
          Manage Feeds
        </button>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        <ArticleFeed refreshTrigger={refreshTrigger} />
        <SocialCards />
      </div>

      {showFeedManager && (
        <FeedManager
          onClose={() => setShowFeedManager(false)}
          onFeedAdded={handleFeedAdded}
        />
      )}
    </div>
  )
}
