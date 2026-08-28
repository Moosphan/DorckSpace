import type Database from 'better-sqlite3'
import { MilestoneRepository } from '../database/repositories/milestone-repository'

export interface ProjectProgressSummary {
  projectId: number
  progress: number
  totalTaskCount: number
  completedTaskCount: number
  openTaskCount: number
  openBlockerCount: number
  nextMilestone: {
    id: number
    title: string
    dueDate: string | null
    progress: number
  } | null
}

interface TaskCountRow {
  total: number | null
  completed: number | null
}

export function getProjectProgressSummary(
  db: Database.Database,
  projectId: number,
): ProjectProgressSummary {
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId)
  if (!project) throw new Error('Project not found')

  const taskCounts = db.prepare(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed " +
    "FROM tasks WHERE project_id = ? AND status != 'cancelled'",
  ).get(projectId) as TaskCountRow
  const totalTaskCount = taskCounts.total ?? 0
  const completedTaskCount = taskCounts.completed ?? 0
  const openTaskCount = Math.max(0, totalTaskCount - completedTaskCount)
  const openBlockerCount = (db.prepare(
    "SELECT COUNT(*) AS count FROM tasks WHERE project_id = ? AND status IN ('pending', 'in_progress') AND priority = 'high'",
  ).get(projectId) as { count: number }).count
  const nextMilestone = new MilestoneRepository(db)
    .findByProject(projectId)
    .find((milestone) => milestone.status !== 'reached')

  return {
    projectId,
    progress: totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0,
    totalTaskCount,
    completedTaskCount,
    openTaskCount,
    openBlockerCount,
    nextMilestone: nextMilestone ? {
      id: nextMilestone.id,
      title: nextMilestone.title,
      dueDate: nextMilestone.due_date,
      progress: getMilestoneProgress(db, nextMilestone.id),
    } : null,
  }
}

function getMilestoneProgress(db: Database.Database, milestoneId: number): number {
  const counts = db.prepare(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed " +
    "FROM tasks WHERE milestone_id = ? AND status != 'cancelled'",
  ).get(milestoneId) as TaskCountRow
  const total = counts.total ?? 0
  return total > 0 ? Math.round(((counts.completed ?? 0) / total) * 100) : 0
}
