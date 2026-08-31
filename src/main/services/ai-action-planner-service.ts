import type Database from 'better-sqlite3'
import { AISubscriptionRepository } from '../database/repositories/ai-repository'
import {
  AIActionRepository,
  type AIActionPlan,
  type AIActionProposal,
  type CreateAIActionProposalInput,
} from '../database/repositories/ai-action-repository'
import { TaskRepository } from '../database/repositories/task-repository'

export type { AIActionPlan, AIActionProposal }

export interface AIActionModelRequest {
  prompt: string
}

export interface AIActionModelResponse {
  content: string
  model: string
  provider?: string
}

export type AIActionModelClient = (request: AIActionModelRequest) => Promise<AIActionModelResponse>

interface ProjectContext {
  id: number
  name: string
  description: string | null
}

interface TaskContext {
  id: number
  title: string
  description: string | null
  priority: string
  due_date: string | null
  status: string
}

interface RawAIActionResponse {
  summary?: unknown
  actions?: unknown
}

export class AIActionPlannerService {
  private readonly repository: AIActionRepository
  private readonly taskRepository: TaskRepository

  constructor(
    private readonly db: Database.Database,
    private readonly client: AIActionModelClient = createConfiguredAIActionModelClient(db),
  ) {
    this.repository = new AIActionRepository(db)
    this.taskRepository = new TaskRepository(db)
  }

  async generate(input: { projectId: number; objective: string }): Promise<AIActionPlan> {
    const projectId = validatePositiveInteger(input.projectId, 'Project ID')
    const objective = input.objective.trim()
    if (!objective) throw new Error('Planning objective is required')
    if (objective.length > 500) throw new Error('Planning objective must be 500 characters or fewer')

    const project = this.getActiveProject(projectId)
    const tasks = this.getOpenTasks(projectId)
    const response = await this.client({ prompt: buildAIActionPrompt({ objective, project, tasks }) })
    const parsed = parseModelResponse(response.content)

    return this.repository.createPlan({
      projectId,
      objective,
      summary: parsed.summary,
      provider: response.provider ?? null,
      model: response.model,
      proposals: parsed.actions,
    })
  }

  apply(input: { planId: number; proposalIds: number[] }): { createdTaskIds: number[]; plan: AIActionPlan } {
    const planId = validatePositiveInteger(input.planId, 'Plan ID')
    const proposalIds = validateProposalIds(input.proposalIds)
    const plan = this.repository.findById(planId)
    if (!plan) throw new Error('AI action plan not found')
    this.getActiveProject(plan.projectId)

    const proposals = this.repository.findProposalsForPlan(planId, proposalIds)
    if (proposals.length !== proposalIds.length) throw new Error('Selected AI action proposal was not found')
    if (proposals.some((proposal) => proposal.status !== 'proposed')) throw new Error('AI action proposal is no longer available')

    const createdTaskIds = this.db.transaction(() => {
      return proposals.map((proposal) => {
        const taskId = this.taskRepository.create({
          title: proposal.title,
          description: proposal.description ?? undefined,
          priority: proposal.priority,
          due_date: proposal.due_date ?? undefined,
          project_id: plan.projectId,
          tags: parseTags(proposal.tags),
        })
        this.repository.markProposalApplied(proposal.id, taskId)
        return taskId
      })
    })()

    const updatedPlan = this.repository.findById(planId)
    if (!updatedPlan) throw new Error('AI action plan not found')
    return { createdTaskIds, plan: updatedPlan }
  }

  dismiss(proposalId: number): AIActionPlan {
    const id = validatePositiveInteger(proposalId, 'Proposal ID')
    const proposal = this.repository.findProposalById(id)
    if (!proposal) throw new Error('AI action proposal not found')
    if (proposal.status !== 'proposed') throw new Error('AI action proposal is no longer available')
    this.repository.markProposalDismissed(id)
    const plan = this.repository.findById(proposal.plan_id)
    if (!plan) throw new Error('AI action plan not found')
    return plan
  }

  findRecent(projectId?: number, limit?: number): AIActionPlan[] {
    if (projectId !== undefined) validatePositiveInteger(projectId, 'Project ID')
    return this.repository.findRecent(projectId, limit === undefined ? undefined : validatePositiveInteger(limit, 'Recent plan limit'))
  }

  private getActiveProject(projectId: number): ProjectContext {
    const project = this.db.prepare(
      "SELECT id, name, description FROM projects WHERE id = ? AND status = 'active'",
    ).get(projectId) as ProjectContext | undefined
    if (!project) throw new Error('Only an active project can be planned')
    return project
  }

  private getOpenTasks(projectId: number): TaskContext[] {
    return this.db.prepare(
      `SELECT id, title, description, priority, due_date, status
       FROM tasks
       WHERE project_id = ? AND status NOT IN ('completed', 'cancelled')
       ORDER BY sort_order, created_at DESC, id DESC
       LIMIT 12`,
    ).all(projectId) as TaskContext[]
  }
}

export function buildAIActionPrompt(input: {
  objective: string
  project: ProjectContext
  tasks: TaskContext[]
}): string {
  const tasks = input.tasks.length > 0
    ? input.tasks.map((task) => {
      const details = [
        `- #${task.id} ${task.title}`,
        `  status: ${task.status}`,
        `  priority: ${task.priority}`,
        task.due_date ? `  dueDate: ${task.due_date}` : null,
        task.description ? `  description: ${task.description}` : null,
      ].filter(Boolean)
      return details.join('\n')
    }).join('\n')
    : '（当前没有未完成任务）'

  return `你是本地任务规划助手。只可使用以下项目与未完成任务；不得推断或要求任何其他私人数据。
只输出 JSON：{"summary":"不超过 280 字","actions":[{"title":"不超过 120 字","description":"可选，不超过 500 字","priority":"high|medium|low","dueDate":"YYYY-MM-DD 或 null","tags":["最多 4 个，每个不超过 24 字"]}]}。
actions 最多 5 条；只能建议创建新任务，不得修改、删除、发布或操作外部系统。

用户目标：${input.objective}

项目：
- id: ${input.project.id}
- name: ${input.project.name}
${input.project.description ? `- description: ${input.project.description}` : '- description: null'}

未完成任务（最多 12 条）：
${tasks}`
}

function parseModelResponse(content: string): { summary: string; actions: CreateAIActionProposalInput[] } {
  let parsed: RawAIActionResponse
  try {
    parsed = JSON.parse(stripCodeFence(content.trim())) as RawAIActionResponse
  } catch {
    throw new Error('AI action plan response must be valid JSON')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('AI action plan response must be a JSON object')
  const summary = validateText(parsed.summary, 'AI action plan summary', 280, false)
  if (!Array.isArray(parsed.actions)) throw new Error('AI action plan actions must be an array')
  if (parsed.actions.length > 5) throw new Error('AI action plan cannot include more than 5 actions')

  const actions = parsed.actions.map((action, index) => validateAction(action, index))
  return { summary, actions }
}

function validateAction(value: unknown, index: number): CreateAIActionProposalInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`AI action plan action ${index + 1} must be an object`)
  const action = value as Record<string, unknown>
  const title = validateText(action.title, 'AI action plan title', 120, false)
  const description = action.description === undefined || action.description === null
    ? null
    : validateText(action.description, 'AI action plan description', 500, true)
  const priority = validatePriority(action.priority)
  const dueDate = validateDueDate(action.dueDate)
  const tags = validateTags(action.tags)
  return { title, description, priority, dueDate, tags }
}

function validateText(value: unknown, label: string, maxLength: number, allowEmpty: boolean): string {
  if (typeof value !== 'string') throw new Error(`${label} is required`)
  const text = value.trim()
  if (!allowEmpty && !text) throw new Error(`${label} is required`)
  if (text.length > maxLength) throw new Error(`${label} is too long`)
  return text
}

function validatePriority(value: unknown): AIActionProposal['priority'] {
  if (value === 'high' || value === 'medium' || value === 'low') return value
  throw new Error('AI action plan priority must be high, medium, or low')
}

function validateDueDate(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('AI action plan dueDate must be YYYY-MM-DD or null')
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('AI action plan dueDate must be a valid date')
  return value
}

function validateTags(value: unknown): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new Error('AI action plan tags must be an array')
  if (value.length > 4) throw new Error('AI action plan tags cannot include more than 4 items')
  return value.map((tag) => validateText(tag, 'AI action plan tag', 24, false))
}

function validateProposalIds(proposalIds: number[]): number[] {
  if (!Array.isArray(proposalIds) || proposalIds.length === 0) throw new Error('Select at least one AI action proposal')
  const normalized = proposalIds.map((id) => validatePositiveInteger(id, 'Proposal ID'))
  if (new Set(normalized).size !== normalized.length) throw new Error('AI action proposal IDs must be unique')
  return normalized
}

function validatePositiveInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) throw new Error(`${label} must be a positive integer`)
  return Number(value)
}

function stripCodeFence(value: string): string {
  const match = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return match ? match[1].trim() : value
}

function parseTags(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function createConfiguredAIActionModelClient(db: Database.Database): AIActionModelClient {
  return async ({ prompt }) => {
    const subscription = new AISubscriptionRepository(db).findActive().find((item) => isUsableApiKey(item.api_key))
    if (!subscription?.api_key) throw new Error('Re-enter and save an active AI subscription API key in AI Lab')

    const metadata = parseMetadata(subscription.metadata)
    const model = typeof metadata.model === 'string' && metadata.model.trim()
      ? metadata.model.trim()
      : 'gpt-4o-mini'
    const endpoint = getChatCompletionsEndpoint(subscription.base_url)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${subscription.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) throw new Error(`AI service request failed for ${formatSubscriptionName(subscription)} at ${endpoint} (${response.status})`)
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; model?: string }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('AI service returned no message content')
    return { content, model: data.model ?? model, provider: subscription.provider }
  }
}

function isUsableApiKey(value: string | null): value is string {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  return !trimmed.startsWith('djEw')
}

function formatSubscriptionName(subscription: { provider: string; plan_name: string }): string {
  return `${subscription.provider} ${subscription.plan_name}`.trim()
}

function getChatCompletionsEndpoint(baseUrl: string | null): string {
  const base = (baseUrl || 'https://api.openai.com').replace(/\/$/, '')
  return base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`
}

function parseMetadata(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}
