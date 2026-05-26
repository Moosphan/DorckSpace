export default function Dashboard() {
  return (
    <div className="p-margin space-y-lg animate-fade-in">
      <div>
        <h2 className="font-headline-xl text-headline-xl">Dashboard</h2>
        <p className="text-body-lg text-on-surface-variant mt-2">
          Your personal workspace overview.
        </p>
      </div>
      <div className="bento-grid">
        <div className="col-span-1 lg:col-span-2 bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 shadow-ambient">
          <p className="font-label-sm text-primary uppercase mb-sm">Main Focus</p>
          <h3 className="font-headline-md text-on-surface">Coming Soon</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Project focus card</p>
        </div>
        <div className="col-span-1 bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 shadow-ambient">
          <p className="font-label-sm text-primary uppercase mb-sm">Weather</p>
          <h3 className="font-headline-md text-on-surface">--</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Weather widget</p>
        </div>
        <div className="col-span-1 bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 shadow-ambient">
          <p className="font-label-sm text-primary uppercase mb-sm">Activity</p>
          <h3 className="font-headline-md text-on-surface">--</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">Heatmap</p>
        </div>
      </div>
    </div>
  )
}
