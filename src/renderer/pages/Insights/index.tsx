export default function Insights() {
  return (
    <div className="p-margin space-y-lg animate-fade-in">
      <div>
        <h2 className="font-headline-xl text-headline-xl">Insights</h2>
        <p className="text-body-lg text-on-surface-variant mt-2">
          RSS feeds, social analytics, and content performance.
        </p>
      </div>
      <div className="grid grid-cols-12 gap-gutter">
        <div className="col-span-8 bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30">
          <p className="font-label-sm text-primary uppercase mb-sm">RSS Feed</p>
          <p className="text-body-sm text-on-surface-variant">Article pipeline coming soon</p>
        </div>
        <div className="col-span-4 space-y-md">
          <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30">
            <p className="font-label-sm text-primary uppercase mb-sm">Bilibili</p>
            <p className="text-headline-lg text-primary">--</p>
          </div>
          <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30">
            <p className="font-label-sm text-primary uppercase mb-sm">YouTube</p>
            <p className="text-headline-lg text-primary">--</p>
          </div>
        </div>
      </div>
    </div>
  )
}
