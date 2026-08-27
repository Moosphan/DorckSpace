import { useState, useRef } from 'react'
import { FocusProjectCard } from './components/FocusProjectCard'
import { PriorityTaskList } from './components/PriorityTaskList'
import { WeatherClockWidget } from './components/WeatherClockWidget'
import { ActivityHeatmap } from './components/ActivityHeatmap'
// import { CalendarWidget } from './components/CalendarWidget'
import { IdeaCard, type IdeaCardHandle } from './components/IdeaCard'
import { CreateIdeaDialog } from './components/CreateIdeaDialog'
import { ManageIdeasDialog } from './components/ManageIdeasDialog'
import { ProjectManagerDialog } from './components/ProjectManagerDialog'

export default function Dashboard() {
  const [showCreate, setShowCreate] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [showProjectManager, setShowProjectManager] = useState(false)
  const [projectRevision, setProjectRevision] = useState(0)
  const ideaCardRef = useRef<IdeaCardHandle>(null)

  return (
    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-lg p-lg">
      {/* Left Stream: Focus + Tasks */}
      <div className="flex-1 flex flex-col gap-lg overflow-y-auto pr-sm">
        <FocusProjectCard
          refreshKey={projectRevision}
          onOpenManager={() => setShowProjectManager(true)}
          onProjectChanged={() => setProjectRevision(value => value + 1)}
        />
        {/* <CalendarWidget /> */}
        <PriorityTaskList onOpenBoard={() => setShowProjectManager(true)} />
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
      <ProjectManagerDialog
        open={showProjectManager}
        onClose={() => setShowProjectManager(false)}
        onChanged={() => setProjectRevision(value => value + 1)}
      />
    </div>
  )
}
