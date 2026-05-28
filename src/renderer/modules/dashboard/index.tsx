import { useState, useRef } from 'react'
import { FocusProjectCard } from './components/FocusProjectCard'
import { PriorityTaskList } from './components/PriorityTaskList'
import { WeatherClockWidget } from './components/WeatherClockWidget'
import { ActivityHeatmap } from './components/ActivityHeatmap'
import { IdeaCard, type IdeaCardHandle } from './components/IdeaCard'
import { CreateIdeaDialog } from './components/CreateIdeaDialog'
import { ManageIdeasDialog } from './components/ManageIdeasDialog'

export default function Dashboard() {
  const [showCreate, setShowCreate] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const ideaCardRef = useRef<IdeaCardHandle>(null)

  return (
    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-lg p-lg">
      {/* Left Stream: Focus + Tasks */}
      <div className="flex-1 flex flex-col gap-lg overflow-y-auto pr-sm">
        <FocusProjectCard />
        <PriorityTaskList />
      </div>

      {/* Right Sidebar: Weather + Activity + Ideas */}
      <aside className="w-full lg:w-[320px] flex flex-col gap-lg shrink-0 overflow-y-auto">
        <WeatherClockWidget />
        <ActivityHeatmap />
        <IdeaCard
          ref={ideaCardRef}
          onCreateNew={() => setShowCreate(true)}
          onManage={() => setShowManage(true)}
        />
      </aside>

      <CreateIdeaDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => ideaCardRef.current?.refresh()}
      />
      <ManageIdeasDialog
        open={showManage}
        onClose={() => setShowManage(false)}
        onCreateNew={() => setShowCreate(true)}
        onChanged={() => ideaCardRef.current?.refresh()}
      />
    </div>
  )
}
