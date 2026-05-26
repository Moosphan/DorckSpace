import { FocusProjectCard } from './components/FocusProjectCard'
import { PriorityTaskList } from './components/PriorityTaskList'
import { WeatherClockWidget } from './components/WeatherClockWidget'
import { ActivityHeatmap } from './components/ActivityHeatmap'

export default function Dashboard() {
  return (
    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-lg p-lg">
      {/* Left Stream: Focus + Tasks */}
      <div className="flex-1 flex flex-col gap-lg overflow-y-auto pr-sm">
        <FocusProjectCard />
        <PriorityTaskList />
      </div>

      {/* Right Sidebar: Weather + Activity */}
      <aside className="w-full lg:w-[320px] flex flex-col gap-lg shrink-0 overflow-y-auto">
        <WeatherClockWidget />
        <ActivityHeatmap />
      </aside>
    </div>
  )
}
