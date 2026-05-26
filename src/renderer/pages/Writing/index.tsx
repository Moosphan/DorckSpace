export default function Writing() {
  return (
    <div className="p-margin space-y-lg animate-fade-in">
      <div>
        <h2 className="font-headline-xl text-headline-xl">Writing Studio</h2>
        <p className="text-body-lg text-on-surface-variant mt-2">
          Manage your drafts, research, and creative assets.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-ambient h-48">
          <p className="font-label-sm text-primary uppercase mb-sm">Active Research</p>
          <p className="text-body-sm text-on-surface-variant">Material Box</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-ambient h-48">
          <p className="font-label-sm text-primary uppercase mb-sm">Saved Links</p>
          <p className="text-body-sm text-on-surface-variant">Bookmarks</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-ambient h-48">
          <p className="font-label-sm text-primary uppercase mb-sm">Moodboards</p>
          <p className="text-body-sm text-on-surface-variant">Visual spaces</p>
        </div>
      </div>
    </div>
  )
}
