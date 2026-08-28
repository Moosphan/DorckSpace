import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useIpcData } from '@/hooks/useIpc'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function getIntensityClass(level: number): string {
  switch (level) {
    case 0: return 'bg-primary/10'
    case 1: return 'bg-primary/40'
    case 2: return 'bg-primary/80'
    case 3: return 'bg-primary/100'
    default: return 'bg-primary/10'
  }
}

interface ActivityDay {
  date: string
  activityCount: number
  durationMinutes: number
  intensity: number
  activityTypes: string[]
}

export function ActivityHeatmap() {
  const { data, loading, error } = useIpcData<ActivityDay[]>('activity:getRecent', 28)
  const activityByDate = useMemo(
    () => new Map((data ?? []).map((day) => [day.date, day])),
    [data],
  )
  const dates = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 28 }, (_, index) => {
      const date = subDays(today, 27 - index)
      const dateString = format(date, 'yyyy-MM-dd')
      return activityByDate.get(dateString) ?? {
        date: dateString,
        activityCount: 0,
        durationMinutes: 0,
        intensity: 0,
        activityTypes: [],
      }
    })
  }, [activityByDate])
  const hasActivity = dates.some((day) => day.activityCount > 0)

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
          {loading && Array.from({ length: 28 }).map((_, index) => (
            <div key={index} className="w-full aspect-square rounded-sm bg-surface-container-high animate-pulse" />
          ))}
          {!loading && dates.map((day) => (
            <div
              key={day.date}
              title={day.date + ': ' + day.activityCount + ' activities'}
              className={['w-full aspect-square rounded-sm', getIntensityClass(day.intensity)].join(' ')}
            />
          ))}
        </div>
        {!loading && !error && !hasActivity && (
          <p className="text-[11px] text-on-surface-variant/70">暂无活动，完成任务或编辑文章后会显示记录</p>
        )}
        {error && <p className="text-[11px] text-error">{error}</p>}
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
