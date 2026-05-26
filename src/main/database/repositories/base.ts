import type Database from 'better-sqlite3'

export class BaseRepository<T extends Record<string, unknown>> {
  protected db: Database.Database
  protected tableName: string

  constructor(db: Database.Database, tableName: string) {
    this.db = db
    this.tableName = tableName
  }

  findById(id: number): T | undefined {
    return this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id) as
      | T
      | undefined
  }

  findAll(limit = 100, offset = 0): T[] {
    return this.db
      .prepare(`SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(limit, offset) as T[]
  }

  count(): number {
    const result = this.db
      .prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`)
      .get() as { count: number }
    return result.count
  }

  deleteById(id: number): boolean {
    const result = this.db
      .prepare(`DELETE FROM ${this.tableName} WHERE id = ?`)
      .run(id)
    return result.changes > 0
  }

  protected run(sql: string, ...params: unknown[]): Database.RunResult {
    return this.db.prepare(sql).run(...params)
  }

  protected get<R>(sql: string, ...params: unknown[]): R | undefined {
    return this.db.prepare(sql).get(...params) as R | undefined
  }

  protected all<R>(sql: string, ...params: unknown[]): R[] {
    return this.db.prepare(sql).all(...params) as R[]
  }
}
