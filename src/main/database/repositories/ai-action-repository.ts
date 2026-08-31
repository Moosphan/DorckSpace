import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

export interface AIActionProposal {
  id: number
  title: string
  description: string | null
  priority: 'high' | 'medium' | 'low'
  dueDate: string | null
  tags: string[]
  status: 'proposed' | 'applied' | 'dismissed'
  taskId: number | null
}

export interface AIActionPlan {
  id: number
  projectId: number
  objective: string
  summary: string
  provider: string | null
  model: string
  createdAt: string
  proposals: AIActionProposal[]
}

export interface CreateAIActionProposalInput {
  title: string
  description: string | null
  priority: AIActionProposal['priority']
  dueDate: string | null
  tags: string[]
}

interface AIActionPlanRow {
  id: number
  project_id: number
  objective: string
  summary: string
  provider: string | null
  model: string
  created_at: string
}

interface AIActionProposalRow {
  id: number
  plan_id: number
  title: string
  description: string | null
  priority: AIActionProposal['priority']
  due_date: string | null
  tags: string
  status: AIActionProposal['status']
  task_id: number | null
}

export class AIActionRepository extends BaseRepository<Record<string, unknown>> {
  constructor(db: Database.Database) {
    super(db, 'ai_action_plans')
  }

  createPlan(input: {
    projectId: number
    objective: string
    summary: string
    provider: string | null
    model: string
    proposals: CreateAIActionProposalInput[]
  }): AIActionPlan {
    const planId = this.db.transaction(() => {
      const result = this.run(
        `INSERT INTO ai_action_plans (project_id, objective, summary, provider, model)
         VALUES (?, ?, ?, ?, ?)`,
        input.projectId,
        input.objective,
        input.summary,
        input.provider,
        input.model,
      )
      const id = Number(result.lastInsertRowid)
      const insertProposal = this.db.prepare(
        `INSERT INTO ai_action_proposals
          (plan_id, action_type, title, description, priority, due_date, tags)
         VALUES (?, 'create_task', ?, ?, ?, ?, ?)`,
      )
      for (const proposal of input.proposals) {
        insertProposal.run(
          id,
          proposal.title,
          proposal.description,
          proposal.priority,
          proposal.dueDate,
          JSON.stringify(proposal.tags),
        )
      }
      return id
    })()

    const plan = this.findById(planId)
    if (!plan) throw new Error('Unable to save AI action plan')
    return plan
  }

  findById(id: number): AIActionPlan | undefined {
    const row = this.get<AIActionPlanRow>('SELECT * FROM ai_action_plans WHERE id = ?', id)
    return row ? this.toPlan(row) : undefined
  }

  findRecent(projectId?: number, limit = 20): AIActionPlan[] {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)))
    const rows = projectId
      ? this.all<AIActionPlanRow>(
        'SELECT * FROM ai_action_plans WHERE project_id = ? ORDER BY created_at DESC, id DESC LIMIT ?',
        projectId,
        safeLimit,
      )
      : this.all<AIActionPlanRow>(
        'SELECT * FROM ai_action_plans ORDER BY created_at DESC, id DESC LIMIT ?',
        safeLimit,
      )
    return rows.map((row) => this.toPlan(row))
  }

  findProposalById(id: number): (AIActionProposalRow & { project_id: number }) | undefined {
    return this.get<AIActionProposalRow & { project_id: number }>(
      `SELECT p.*, plan.project_id
       FROM ai_action_proposals p
       JOIN ai_action_plans plan ON plan.id = p.plan_id
       WHERE p.id = ?`,
      id,
    )
  }

  findProposalsForPlan(planId: number, proposalIds: number[]): AIActionProposalRow[] {
    if (proposalIds.length === 0) return []
    const placeholders = proposalIds.map(() => '?').join(', ')
    return this.all<AIActionProposalRow>(
      `SELECT * FROM ai_action_proposals WHERE plan_id = ? AND id IN (${placeholders}) ORDER BY id`,
      planId,
      ...proposalIds,
    )
  }

  markProposalApplied(id: number, taskId: number): void {
    const result = this.run(
      `UPDATE ai_action_proposals
       SET status = 'applied', task_id = ?, resolved_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'proposed'`,
      taskId,
      id,
    )
    if (result.changes === 0) throw new Error('AI action proposal is no longer available')
  }

  markProposalDismissed(id: number): void {
    const result = this.run(
      `UPDATE ai_action_proposals
       SET status = 'dismissed', resolved_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'proposed'`,
      id,
    )
    if (result.changes === 0) throw new Error('AI action proposal is no longer available')
  }

  private toPlan(row: AIActionPlanRow): AIActionPlan {
    return {
      id: row.id,
      projectId: row.project_id,
      objective: row.objective,
      summary: row.summary,
      provider: row.provider,
      model: row.model,
      createdAt: row.created_at,
      proposals: this.all<AIActionProposalRow>(
        'SELECT * FROM ai_action_proposals WHERE plan_id = ? ORDER BY id',
        row.id,
      ).map(toProposal),
    }
  }
}

function toProposal(row: AIActionProposalRow): AIActionProposal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dueDate: row.due_date,
    tags: parseTags(row.tags),
    status: row.status,
    taskId: row.task_id,
  }
}

function parseTags(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}
