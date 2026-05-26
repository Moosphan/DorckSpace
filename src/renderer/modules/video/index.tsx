import { VideoCoverGrid } from './components/VideoCoverGrid'
import { AudioAssetList } from './components/AudioAssetList'
import { PresentationList } from './components/PresentationList'

export default function Video() {
  return (
    <div className="p-lg space-y-lg animate-fade-in max-w-[1280px] mx-auto w-full">
      {/* Header */}
      <div>
        <h2 className="font-headline-xl text-headline-xl">Video Studio</h2>
        <p className="text-body-lg text-on-surface-variant mt-2">
          Manage your video covers, audio assets, and HTML presentations.
        </p>
      </div>

      {/* Video Covers Grid */}
      <VideoCoverGrid />

      {/* Audio + Presentations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
        <AudioAssetList />
        <PresentationList />
      </div>
    </div>
  )
}
