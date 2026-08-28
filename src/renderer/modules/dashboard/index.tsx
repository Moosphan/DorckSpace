import { useState, useRef } from 'react'
import { TodayOverview } from './components/TodayOverview'
import { PriorityTaskList } from './components/PriorityTaskList'
import { WeatherClockWidget } from './components/WeatherClockWidget'
import { ActivityHeatmap } from './components/ActivityHeatmap'
// import { CalendarWidget } from './components/CalendarWidget'
import { IdeaCard, type IdeaCardHandle } from './components/IdeaCard'
import { CreateIdeaDialog } from './components/CreateIdeaDialog'
import { ManageIdeasDialog } from './components/ManageIdeasDialog'
import { ProjectManagerDialog } from './components/ProjectManagerDialog'
import { ArticleDetailDialog } from './components/ArticleDetailDialog'

export default function Dashboard() {
  const [showCreate, setShowCreate] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [showProjectManager, setShowProjectManager] = useState(false)
  const [projectDetailId, setProjectDetailId] = useState<number | null>(null)
  const [articleDetailId, setArticleDetailId] = useState<number | null>(null)
  const [projectRevision, setProjectRevision] = useState(0)
  const ideaCardRef = useRef<IdeaCardHandle>(null)

  return (
    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-lg p-lg">
      {/* Left Stream: Focus + Tasks */}
      <div className="flex-1 flex flex-col gap-lg overflow-y-auto pr-sm">
        <TodayOverview
          refreshKey={projectRevision}
          onOpenManager={() => {
            setProjectDetailId(null)
            setShowProjectManager(true)
          }}
          onOpenProject={(projectId) => {
            setProjectDetailId(projectId)
            setShowProjectManager(true)
          }}
          onOpenArticle={(articleId) => setArticleDetailId(articleId)}
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
        initialProjectId={projectDetailId}
        onClose={() => {
          setShowProjectManager(false)
          setProjectDetailId(null)
        }}
        onChanged={() => setProjectRevision(value => value + 1)}
      />
      {articleDetailId !== null && (
        <ArticleDetailDialog
          articleId={articleDetailId}
          onClose={() => setArticleDetailId(null)}
        />
      )}
    </div>
  )
}
