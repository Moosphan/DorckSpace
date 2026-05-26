const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const WEEKS = 4

function getIntensityClass(level: number): string {
  switch (level) {
    case 0: return 'bg-primary/10'
    case 1: return 'bg-primary/40'
    case 2: return 'bg-primary/80'
    case 3: return 'bg-primary/100'
    default: return 'bg-primary/10'
  }
}

// Mock data - will be replaced with real activity_log data
const mockData: number[][] = [
  [1, 2, 3, 0, 2, 0, 0],
  [2, 3, 1, 2, 3, 1, 0],
  [0, 1, 3, 2, 1, 0, 0],
  [2, 0, 2, 3, 0, 0, 0],
]

export function ActivityHeatmap() {
  return (
    <div className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30 shadow-ambient">
      <h4 className="font-label-md text-label-md text-on-surface-variant mb-md uppercase tracking-wider">
        Weekly Activity
      </h4>
      <div className="flex flex-col gap-sm">
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day, i) => (
            <div
              key={i}
              className="text-center font-label-sm text-label-sm text-on-surface-variant/60"
            >
              {day}
            </div>
          ))}
          {mockData.flat().map((level, i) => (
            <div
              key={i}
              className={`w-full aspect-square rounded-sm ${getIntensityClass(level)}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-sm">
          <span className="text-[10px] text-on-surface-variant font-bold">Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((level) => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${getIntensityClass(level)}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-on-surface-variant font-bold">More</span>
        </div>
      </div>
    </div>
  )
}
