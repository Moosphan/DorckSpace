export default function Video() {
  return (
    <div className="p-margin space-y-lg animate-fade-in">
      <div>
        <h2 className="font-headline-xl text-headline-xl">Video Studio</h2>
        <p className="text-body-lg text-on-surface-variant mt-2">
          Manage your video covers, audio assets, and presentations.
        </p>
      </div>
      <div className="grid grid-cols-4 gap-md">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden"
          >
            <div className="aspect-video bg-surface-container-highest" />
            <div className="p-md">
              <p className="font-label-md text-on-surface truncate">Video_{i}.mp4</p>
              <p className="text-body-sm text-on-surface-variant">4K H.264</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
