const platforms = [
  {
    name: 'Bilibili',
    handle: '@creative_dorck',
    color: 'bg-[#FB7299]',
    icon: 'B',
    metric: 'Followers',
    value: '142.8k',
    change: '+2.4%',
    stats: [
      { label: 'Views', value: '840k' },
      { label: 'Likes', value: '12k' },
    ],
  },
  {
    name: 'YouTube',
    handle: 'Dorck Studio',
    color: 'bg-[#FF0000]',
    icon: 'play_arrow',
    metric: 'Subscribers',
    value: '28.5k',
    change: '+1.8%',
    stats: [
      { label: 'Avg Watch', value: '6:42' },
      { label: 'Revenue', value: '$1,240' },
    ],
  },
  {
    name: 'Xiaohongshu',
    handle: '@dorck_life',
    color: 'bg-[#FE2C55]',
    icon: 'X',
    metric: 'Followers',
    value: '56.2k',
    change: '+3.1%',
    stats: [
      { label: 'Views', value: '1.2M' },
      { label: 'Likes', value: '89k' },
    ],
  },
]

export function SocialCards() {
  return (
    <div className="col-span-12 lg:col-span-4 space-y-md">
      <h2 className="font-headline-lg text-headline-lg mb-sm">Social Performance</h2>

      {platforms.map((platform) => (
        <div
          key={platform.name}
          className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/30"
        >
          <div className="flex justify-between items-start mb-md">
            <div className="flex items-center gap-sm">
              <div className={`w-10 h-10 ${platform.color} rounded-full flex items-center justify-center text-white shadow-sm`}>
                {platform.icon.length === 1 ? (
                  <span className="font-bold text-[14px]">{platform.icon}</span>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">{platform.icon}</span>
                )}
              </div>
              <div>
                <p className="font-bold text-body-sm">{platform.name}</p>
                <p className="text-[11px] text-on-surface-variant">{platform.handle}</p>
              </div>
            </div>
            <span className="text-secondary font-bold text-body-sm bg-secondary/10 px-sm py-xs rounded-full">
              {platform.change}
            </span>
          </div>

          <div className="mb-md">
            <p className="text-on-surface-variant text-[12px] font-medium">{platform.metric}</p>
            <p className="text-headline-lg font-headline-lg text-primary">{platform.value}</p>
          </div>

          {/* Mini sparkline placeholder */}
          <div className="h-10 w-full mb-md">
            <svg className="w-full h-full" viewBox="0 0 100 30">
              <path
                className="stroke-primary stroke-[2.5] fill-none stroke-linecap-round stroke-linejoin-round"
                d="M0,25 L10,20 L20,22 L30,15 L40,18 L50,10 L60,12 L70,5 L80,8 L90,2 L100,4"
              />
            </svg>
          </div>

          <div className="grid grid-cols-2 pt-md border-t border-outline-variant/30">
            {platform.stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-tight font-bold">{stat.label}</p>
                <p className="font-bold text-on-surface text-body-sm">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
