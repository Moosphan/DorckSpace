import type Database from 'better-sqlite3'
import { ArticleRepository } from '../database/repositories/article-repository'
import { MilestoneRepository } from '../database/repositories/milestone-repository'
import { ProjectRepository } from '../database/repositories/project-repository'

export interface DashboardTask {
  id: number
  title: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress'
  dueDate: string | null
  projectId: number | null
  projectName: string | null
}

export interface DashboardTodayOverview {
  date: string
  focusProject: {
    id: number
    name: string
    description: string | null
    icon: string | null
    color: string | null
    progress: number
    nextMilestone: {
      id: number
      title: string
      dueDate: string | null
      progress: number
    } | null
    openBlockerCount: number
  } | null
  tasks: DashboardTask[]
  overdueCount: number
  recentArticle: {
    id: number
    title: string
    status: string
    updatedAt: string
  } | null
}

interface DashboardTaskRow {
  id: number
  title: string
  priority: DashboardTask['priority']
  status: DashboardTask['status']
  due_date: string | null
  project_id: number | null
  project_name: string | null
}

export function getDashboardTodayOverview(
  db: Database.Database,
  now = new Date(),
): DashboardTodayOverview {
  const date = formatLocalDate(now)
  const project = new ProjectRepository(db).findFocus()
  const taskRows = db.prepare(
    'SELECT t.id, t.title, t.priority, t.status, t.due_date, t.project_id, p.name AS project_name ' +
    'FROM tasks t LEFT JOIN projects p ON p.id = t.project_id ' +
    "WHERE t.status NOT IN ('completed', 'cancelled') " +
    'ORDER BY CASE WHEN t.due_date IS NOT NULL AND t.due_date < ? THEN 0 ELSE 1 END, ' +
    "CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, " +
    'CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END, t.due_date ASC, t.created_at DESC ' +
    'LIMIT 3',
  ).all(date) as DashboardTaskRow[]
  const overdueCount = (db.prepare(
    "SELECT COUNT(*) AS count FROM tasks WHERE status NOT IN ('completed', 'cancelled') AND due_date < ?",
  ).get(date) as { count: number }).count
  const recentArticle = new ArticleRepository(db).findRecent(1)[0]

  return {
    date,
    focusProject: project ? {
      id: project.id,
      name: project.name,
      description: project.description,
      icon: project.icon,
      color: project.color,
      progress: project.progress,
      nextMilestone: getNextMilestone(db, project.id),
      openBlockerCount: (db.prepare(
        "SELECT COUNT(*) AS count FROM tasks WHERE project_id = ? AND status NOT IN ('completed', 'cancelled') AND priority = 'high'",
      ).get(project.id) as { count: number }).count,
    } : null,
    tasks: taskRows.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      dueDate: task.due_date,
      projectId: task.project_id,
      projectName: task.project_name,
    })),
    overdueCount,
    recentArticle: recentArticle ? {
      id: recentArticle.id,
      title: recentArticle.title,
      status: recentArticle.status,
      updatedAt: recentArticle.updated_at,
    } : null,
  }
}

function getNextMilestone(
  db: Database.Database,
  projectId: number,
): DashboardTodayOverview['focusProject'] extends infer FocusProject
  ? FocusProject extends null ? never : NonNullable<FocusProject>['nextMilestone']
  : never {
  const milestone = new MilestoneRepository(db)
    .findByProject(projectId)
    .find((item) => item.status !== 'reached')

  return milestone ? {
    id: milestone.id,
    title: milestone.title,
    dueDate: milestone.due_date,
    progress: milestone.progress,
  } : null
}

function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return date.getFullYear() + '-' + month + '-' + day
}
