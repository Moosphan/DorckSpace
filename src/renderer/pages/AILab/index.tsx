export default function AILab() {
  return (
    <div className="p-margin space-y-lg animate-fade-in">
      <div className="bg-primary text-on-primary rounded-lg p-xl min-h-[160px] flex flex-col justify-center">
        <h2 className="font-headline-xl text-headline-xl mb-xs">AI Lab</h2>
        <p className="text-body-lg opacity-90 max-w-2xl">
          Manage your subscriptions, monitor token usage, and explore AI tools.
        </p>
      </div>
      <div className="grid grid-cols-12 gap-gutter">
        <div className="col-span-7 bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30">
          <p className="font-label-sm text-primary uppercase mb-sm">Subscriptions</p>
          <p className="text-body-sm text-on-surface-variant">No active subscriptions</p>
        </div>
        <div className="col-span-5 bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30">
          <p className="font-label-sm text-primary uppercase mb-sm">Token Usage</p>
          <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden mt-sm">
            <div className="h-full bg-primary rounded-full" style={{ width: '0%' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
