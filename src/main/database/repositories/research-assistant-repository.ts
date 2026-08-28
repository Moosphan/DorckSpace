import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

interface ResearchBriefRow {
  id: number
  objective: string
  content: string
  material_ids: string
  provider: string | null
  model: string | null
  created_at: string
}

export interface ResearchBrief {
  id: number
  objective: string
  content: string
  materialIds: number[]
  provider: string | null
  model: string | null
  createdAt: string
}

export class ResearchAssistantRepository extends BaseRepository<Record<string, unknown>> {
  constructor(db: Database.Database) {
    super(db, 'research_briefs')
  }

  create(input: { objective: string; content: string; materialIds: number[]; provider?: string | null; model?: string | null }): number {
    const result = this.run(
      `INSERT INTO research_briefs (objective, content, material_ids, provider, model)
       VALUES (?, ?, ?, ?, ?)`,
      input.objective,
      input.content,
      JSON.stringify(input.materialIds),
      input.provider ?? null,
      input.model ?? null,
    )
    return Number(result.lastInsertRowid)
  }

  findById(id: number): ResearchBrief | undefined {
    const row = this.get<ResearchBriefRow>('SELECT * FROM research_briefs WHERE id = ?', id)
    return row ? toResearchBrief(row) : undefined
  }

  findRecent(limit = 30): ResearchBrief[] {
    return this.all<ResearchBriefRow>('SELECT * FROM research_briefs ORDER BY created_at DESC, id DESC LIMIT ?', limit)
      .map(toResearchBrief)
  }
}

function toResearchBrief(row: ResearchBriefRow): ResearchBrief {
  return {
    id: row.id,
    objective: row.objective,
    content: row.content,
    materialIds: parseMaterialIds(row.material_ids),
    provider: row.provider,
    model: row.model,
    createdAt: row.created_at,
  }
}

function parseMaterialIds(value: string): number[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((id): id is number => Number.isInteger(id) && id > 0) : []
  } catch {
    return []
  }
}
