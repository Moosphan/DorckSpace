import { useState, useMemo } from 'react'
import { useIpcData } from '@/hooks/useIpc'
import { cn } from '@/lib/utils'

interface CalendarEvent {
  id: number
  title: string
  start_time: string
  end_time: string | null
  all_day: number
  color: string | null
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const { data: events } = useIpcData<CalendarEvent[]>('calendar:getByMonth', year, month + 1)

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek < 0) startDayOfWeek = 6

    const days: Array<{ date: number; isCurrentMonth: boolean; dateString: string }> = []

    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i
      const prevMonth = month === 0 ? 11 : month - 1
      const prevYear = month === 0 ? year - 1 : year
      days.push({
        date: day,
        isCurrentMonth: false,
        dateString: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        isCurrentMonth: true,
        dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      })
    }

    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonth = month === 11 ? 0 : month + 1
      const nextYear = month === 11 ? year + 1 : year
      days.push({
        date: i,
        isCurrentMonth: false,
        dateString: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      })
    }

    return days
  }, [year, month])

  const getEventsForDate = (dateString: string): CalendarEvent[] => {
    if (!events) return []
    return events.filter(e => e.start_time.startsWith(dateString))
  }

  const today = new Date().toISOString().split('T')[0]
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDate(null)
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-sm">
        <span className="font-label-md text-on-surface">
          {monthNames[month]} {year}
        </span>
        <div className="flex gap-xs">
          <button
            onClick={handlePrevMonth}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button
            onClick={handleNextMonth}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_LABELS.map((label, i) => (
          <span key={i} className="text-[10px] text-on-surface-variant font-bold">
            {label}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarDays.map((day, index) => {
          const dayEvents = getEventsForDate(day.dateString)
          const isToday = day.dateString === today
          const isSelected = day.dateString === selectedDate
          const hasEvents = dayEvents.length > 0

          return (
            <button
              key={index}
              onClick={() => setSelectedDate(day.dateString)}
              className={cn(
                'relative text-[12px] p-1 rounded-md cursor-pointer transition-colors',
                !day.isCurrentMonth && 'text-on-surface-variant opacity-40',
                day.isCurrentMonth && !isToday && !isSelected && 'hover:bg-primary-fixed',
                isToday && 'bg-primary text-white rounded-md',
                isSelected && !isToday && 'bg-primary-container',
                !day.isCurrentMonth && 'hover:bg-transparent',
              )}
            >
              {day.date}
              {hasEvents && day.isCurrentMonth && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date events */}
      {selectedDate && selectedEvents.length > 0 && (
        <div className="mt-xs pt-xs border-t border-outline-variant/30">
          <div className="space-y-0.5">
            {selectedEvents.slice(0, 2).map(event => (
              <div key={event.id} className="flex items-center gap-1 text-[10px]">
                <div
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{ backgroundColor: event.color || 'var(--color-primary)' }}
                />
                <span className="text-on-surface truncate">{event.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
