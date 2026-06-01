import type Database from 'better-sqlite3'
import { BaseRepository } from './base'

export interface UserProfileRow {
  id: number
  name: string
  avatar_path: string | null
  bio: string | null
  email: string | null
  location: string | null
  website: string | null
  github_url: string | null
  blog_url: string | null
  social_links: string
  created_at: string
  updated_at: string
}

export interface ProfileStats {
  articles: number
  tasks: number
  ideas: number
  highlights: number
}

export class ProfileRepository extends BaseRepository<UserProfileRow> {
  constructor(db: Database.Database) {
    super(db, 'user_profile')
  }

  getProfile(): UserProfileRow | null {
    const rows = this.all<UserProfileRow>('SELECT * FROM user_profile LIMIT 1')
    return rows[0] ?? null
  }

  createProfile(data: {
    name?: string
    avatar_path?: string
    bio?: string
    email?: string
    location?: string
    website?: string
    github_url?: string
    blog_url?: string
    social_links?: string
  }): number {
    const result = this.run(
      `INSERT INTO user_profile (name, avatar_path, bio, email, location, website, github_url, blog_url, social_links)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      data.name ?? 'Dorck',
      data.avatar_path ?? null,
      data.bio ?? null,
      data.email ?? null,
      data.location ?? null,
      data.website ?? null,
      data.github_url ?? null,
      data.blog_url ?? null,
      data.social_links ?? '{}',
    )
    return Number(result.lastInsertRowid)
  }

  updateProfile(id: number, data: Partial<Omit<UserProfileRow, 'id' | 'created_at' | 'updated_at'>>): boolean {
    const fields: string[] = []
    const values: unknown[] = []
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    }
    if (fields.length === 0) return false
    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    const result = this.run(`UPDATE user_profile SET ${fields.join(', ')} WHERE id = ?`, ...values)
    return result.changes > 0
  }

  ensureProfile(): UserProfileRow {
    let profile = this.getProfile()
    if (!profile) {
      this.createProfile({ name: 'Dorck' })
      profile = this.getProfile()!
    }
    return profile
  }

  getStats(): ProfileStats {
    const articles = this.db.prepare('SELECT COUNT(*) as count FROM articles').get() as { count: number }
    const tasks = this.db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number }
    const ideas = this.db.prepare('SELECT COUNT(*) as count FROM ideas').get() as { count: number }
    const highlights = this.db.prepare('SELECT COUNT(*) as count FROM article_highlights').get() as { count: number }
    return {
      articles: articles.count,
      tasks: tasks.count,
      ideas: ideas.count,
      highlights: highlights.count,
    }
  }
}
