import type Database from 'better-sqlite3'
import { AISubscriptionRepository } from '../database/repositories/ai-repository'
import { ArticleRepository } from '../database/repositories/article-repository'
import { IdeaRepository } from '../database/repositories/idea-repository'
import { ResearchAssistantRepository, type ResearchBrief } from '../database/repositories/research-assistant-repository'
import { ResearchMaterialRepository, type ResearchMaterial } from '../database/repositories/research-material-repository'

export interface ResearchModelRequest {
  prompt: string
}

export interface ResearchModelResponse {
  content: string
  model: string
  provider?: string
}

export type ResearchModelClient = (request: ResearchModelRequest) => Promise<ResearchModelResponse>

export interface ResearchBriefResult extends ResearchBrief {
  sources: ResearchSource[]
}

export interface ResearchSource {
  number: number
  materialId: number
  title: string
  url: string | null
}

export class ResearchAssistantService {
  private readonly materialRepository: ResearchMaterialRepository
  private readonly briefRepository: ResearchAssistantRepository

  constructor(
    private readonly db: Database.Database,
    private readonly client: ResearchModelClient = createConfiguredResearchModelClient(db),
  ) {
    this.materialRepository = new ResearchMaterialRepository(db)
    this.briefRepository = new ResearchAssistantRepository(db)
  }

  async generate(input: { materialIds: number[]; objective: string }): Promise<ResearchBriefResult> {
    const materialIds = validateMaterialIds(input.materialIds)
    const objective = input.objective.trim()
    if (!objective) throw new Error('Research objective is required')

    const materials = this.materialRepository.findByIds(materialIds)
    if (materials.length !== materialIds.length) throw new Error('Selected research material was not found')

    const response = await this.client({ prompt: buildResearchPrompt(objective, materials) })
    const content = response.content.trim()
    if (!content) throw new Error('AI service returned an empty research brief')

    const id = this.briefRepository.create({
      objective,
      content,
      materialIds,
      provider: response.provider ?? null,
      model: response.model,
    })
    const brief = this.findById(id)
    if (!brief) throw new Error('Unable to save research brief')
    return { ...brief, sources: toSources(materials) }
  }

  findById(id: number): ResearchBrief | undefined {
    return this.briefRepository.findById(id)
  }

  findRecent(limit?: number): ResearchBrief[] {
    return this.briefRepository.findRecent(limit)
  }

  saveAsArticle(id: number): number {
    const brief = this.requireBrief(id)
    return new ArticleRepository(this.db).create({
      title: `Research: ${brief.objective}`,
      content: this.formatBriefWithSources(brief),
      tags: ['research'],
    })
  }

  saveAsIdea(id: number): number {
    const brief = this.requireBrief(id)
    return new IdeaRepository(this.db).create({
      content: this.formatBriefWithSources(brief),
      category: 'research',
    })
  }

  private requireBrief(id: number): ResearchBrief {
    const brief = this.findById(id)
    if (!brief) throw new Error('Research brief not found')
    return brief
  }

  private formatBriefWithSources(brief: ResearchBrief): string {
    const sources = toSources(this.materialRepository.findByIds(brief.materialIds))
    const references = sources.map((source) => (
      source.url ? `[S${source.number}] ${source.title} (${source.url})` : `[S${source.number}] ${source.title}`
    )).join('\n')
    return `${brief.content}\n\n---\n\n## Sources\n${references}`
  }
}

export function buildResearchPrompt(objective: string, materials: ResearchMaterial[]): string {
  const sources = materials.map((material, index) => {
    const details = [
      `[S${index + 1}] ${material.title}`,
      material.excerpt ? `摘录：${material.excerpt}` : null,
      material.author ? `作者：${material.author}` : null,
      material.tags.length > 0 ? `标签：${material.tags.join('、')}` : null,
      material.url ? `来源：${material.url}` : null,
    ].filter(Boolean)
    return details.join('\n')
  }).join('\n\n')

  return `你是本地研究助手。只可使用以下明确列出的来源，不得补充或猜测任何未提供的私人数据。\n\n研究目标：${objective}\n\n请用中文输出：\n1. 3-5 条有来源编号的核心结论；\n2. 2-3 个可执行的内容或产品角度；\n3. 仍需验证的问题。\n\n每个事实性结论后都必须引用一个或多个 [S#] 编号。\n\n已选来源：\n${sources}`
}

function validateMaterialIds(ids: number[]): number[] {
  if (ids.length === 0) throw new Error('Select at least one research material')
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) throw new Error('Research material IDs must be positive integers')
  if (new Set(ids).size !== ids.length) throw new Error('Research material IDs must be unique')
  return ids
}

function toSources(materials: ResearchMaterial[]): ResearchSource[] {
  return materials.map((material, index) => ({
    number: index + 1,
    materialId: material.id,
    title: material.title,
    url: material.url,
  }))
}

function createConfiguredResearchModelClient(db: Database.Database): ResearchModelClient {
  return async ({ prompt }) => {
    const subscription = new AISubscriptionRepository(db).findActive().find((item) => Boolean(item.api_key))
    if (!subscription?.api_key) throw new Error('Configure an active AI subscription with an API key in AI Lab first')

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
    if (!response.ok) throw new Error(`AI service request failed (${response.status})`)
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; model?: string }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('AI service returned no message content')
    return { content, model: data.model ?? model, provider: subscription.provider }
  }
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
