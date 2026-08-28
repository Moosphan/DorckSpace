interface AILabOverviewCardProps {
  onOpenBrowser: () => void
}

export function AILabOverviewCard({ onOpenBrowser }: AILabOverviewCardProps) {
  return (
    <article className="relative h-full min-h-[190px] overflow-hidden rounded-lg border border-primary/20 bg-primary text-on-primary p-md shadow-ambient">
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary-container/35 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 right-20 h-28 w-28 rounded-full border border-on-primary/10" />

      <div className="relative flex h-full flex-col justify-between">
        <div>
          <div className="mb-sm flex items-center justify-between gap-sm">
            <div className="flex items-center gap-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-on-primary/15 text-on-primary">
                <span className="material-symbols-outlined text-[20px]">science</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-primary/70">Workspace</p>
                <h2 className="font-headline-sm text-headline-sm">AI Lab</h2>
              </div>
            </div>
            <span className="rounded-full bg-on-primary/10 px-2.5 py-1 text-[10px] font-semibold text-on-primary/80">AI 工具台</span>
          </div>
          <p className="max-w-md text-body-sm leading-relaxed text-on-primary/75">
            管理 AI 订阅、查看用量，并快速进入常用 AI 工具。
          </p>
        </div>

        <div className="mt-md flex items-center justify-between gap-sm border-t border-on-primary/15 pt-sm">
          <div className="flex items-center gap-sm text-[11px] text-on-primary/70">
            <span className="material-symbols-outlined text-[17px]">tune</span>
            <span>订阅 · 用量 · 工具</span>
          </div>
          <button
            type="button"
            onClick={onOpenBrowser}
            className="flex items-center gap-xs rounded-full bg-on-primary px-3 py-1.5 text-[11px] font-bold text-primary transition-transform hover:brightness-105 active:scale-95"
          >
            <span className="material-symbols-outlined text-[15px]">language</span>
            打开浏览器
          </button>
        </div>
      </div>
    </article>
  )
}
