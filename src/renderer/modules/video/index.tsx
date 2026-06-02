import { useState } from 'react'
import { VideoCoverGrid } from './components/VideoCoverGrid'
import { AudioAssetList } from './components/AudioAssetList'
import { PresentationList } from './components/PresentationList'
import { VoiceoverDialog } from './components/VoiceoverDialog'

export default function Video() {
  const [showVoiceover, setShowVoiceover] = useState(false)

  return (
    <div className="p-lg space-y-lg animate-fade-in max-w-[1280px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-xl text-headline-xl">Video Studio</h2>
          <p className="text-body-lg text-on-surface-variant mt-2">
            Manage your video covers, audio assets, and HTML presentations.
          </p>
        </div>
        <button
          onClick={() => setShowVoiceover(true)}
          className="flex items-center gap-xs px-md py-2 bg-primary text-on-primary rounded-full font-label-md hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">mic</span>
          AI Voiceover
        </button>
      </div>

      {/* Video Covers Grid */}
      <VideoCoverGrid />

      {/* Audio + Presentations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
        <AudioAssetList />
        <PresentationList />
      </div>

      {/* Voiceover Dialog */}
      <VoiceoverDialog
        open={showVoiceover}
        onClose={() => setShowVoiceover(false)}
      />
    </div>
  )
}
