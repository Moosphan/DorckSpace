import type Database from 'better-sqlite3'

interface Migration {
  version: number
  name: string
  up: (db: Database.Database) => void
}

const migrations: Migration[] = [
  {
    version: 1,
    name: '001_initial_schema',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_profile (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL DEFAULT 'Dorck',
          avatar_path TEXT,
          bio TEXT,
          github_url TEXT,
          blog_url TEXT,
          social_links TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          color TEXT,
          progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
          status TEXT CHECK(status IN ('active', 'paused', 'completed', 'archived')) DEFAULT 'active',
          is_focus INTEGER DEFAULT 0,
          start_date DATE,
          target_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          priority TEXT CHECK(priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
          status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
          due_date DATE,
          project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
          tags TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS calendar_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          start_time DATETIME NOT NULL,
          end_time DATETIME,
          all_day INTEGER DEFAULT 0,
          color TEXT,
          source TEXT DEFAULT 'local',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          activity_type TEXT NOT NULL,
          duration_minutes INTEGER DEFAULT 0,
          intensity INTEGER DEFAULT 1 CHECK(intensity >= 1 AND intensity <= 4),
          metadata TEXT DEFAULT '{}',
          UNIQUE(date, activity_type)
        );

        CREATE TABLE IF NOT EXISTS portfolio_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          thumbnail_path TEXT,
          url TEXT,
          category TEXT,
          tags TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
    },
  },
  {
    version: 2,
    name: '002_writing_tables',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL DEFAULT 'Untitled',
          content TEXT,
          file_path TEXT,
          status TEXT CHECK(status IN ('draft', 'editing', 'review', 'published', 'archived')) DEFAULT 'draft',
          category TEXT,
          tags TEXT DEFAULT '[]',
          word_count INTEGER DEFAULT 0,
          cover_image_path TEXT,
          summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          published_at DATETIME
        );

        CREATE TABLE IF NOT EXISTS article_publish_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
          platform TEXT NOT NULL,
          platform_article_id TEXT,
          platform_url TEXT,
          status TEXT CHECK(status IN ('pending', 'publishing', 'published', 'failed')) DEFAULT 'pending',
          error_message TEXT,
          published_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          content TEXT NOT NULL,
          file_path TEXT,
          category TEXT,
          tags TEXT DEFAULT '[]',
          is_pinned INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS drafts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          content TEXT,
          type TEXT CHECK(type IN ('text', 'link', 'image', 'snippet')) DEFAULT 'text',
          source_url TEXT,
          file_path TEXT,
          tags TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
    },
  },
  {
    version: 3,
    name: '003_media_tables',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS video_assets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          type TEXT CHECK(type IN ('cover', 'audio', 'presentation', 'other')) NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER,
          file_format TEXT,
          duration_seconds REAL,
          metadata TEXT DEFAULT '{}',
          tags TEXT DEFAULT '[]',
          status TEXT CHECK(status IN ('ready', 'processing', 'draft')) DEFAULT 'ready',
          thumbnail_path TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
    },
  },
  {
    version: 4,
    name: '004_insights_tables',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS rss_feeds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          url TEXT NOT NULL UNIQUE,
          site_url TEXT,
          category TEXT,
          icon_url TEXT,
          last_fetched_at DATETIME,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS rss_articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          feed_id INTEGER NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          author TEXT,
          summary TEXT,
          content TEXT,
          thumbnail_url TEXT,
          published_at DATETIME,
          is_read INTEGER DEFAULT 0,
          is_starred INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS social_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          platform TEXT NOT NULL,
          account_name TEXT NOT NULL,
          account_id TEXT,
          profile_url TEXT,
          api_config TEXT DEFAULT '{}',
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS social_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
          metric_type TEXT NOT NULL,
          metric_value INTEGER NOT NULL,
          snapshot_date DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(account_id, metric_type, snapshot_date)
        );

        CREATE TABLE IF NOT EXISTS social_content_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
          content_title TEXT,
          content_url TEXT,
          platform_content_id TEXT,
          views INTEGER DEFAULT 0,
          likes INTEGER DEFAULT 0,
          comments INTEGER DEFAULT 0,
          shares INTEGER DEFAULT 0,
          favorites INTEGER DEFAULT 0,
          snapshot_date DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
    },
  },
  {
    version: 5,
    name: '005_ai_tables',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS ai_subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider TEXT NOT NULL,
          plan_name TEXT NOT NULL,
          monthly_cost REAL,
          currency TEXT DEFAULT 'USD',
          billing_date INTEGER,
          token_limit INTEGER,
          tokens_used INTEGER DEFAULT 0,
          reset_date DATE,
          is_active INTEGER DEFAULT 1,
          api_key TEXT,
          metadata TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ai_tools (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT CHECK(category IN ('text', 'image', 'code', 'audio', 'video', 'other')),
          provider TEXT,
          url TEXT,
          icon_url TEXT,
          is_custom INTEGER DEFAULT 0,
          usage_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
    },
  },
  {
    version: 6,
    name: '006_rss_articles_unique_index',
    up: (db) => {
      // Remove duplicate articles (keep the oldest one)
      db.exec(`
        DELETE FROM rss_articles
        WHERE id NOT IN (
          SELECT MIN(id) FROM rss_articles GROUP BY feed_id, url
        )
      `)
      // Add unique index to prevent future duplicates
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_rss_articles_feed_url
        ON rss_articles(feed_id, url)
      `)
    },
  },
  {
    version: 7,
    name: '007_ideas_table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS ideas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          category TEXT DEFAULT 'writing',
          is_pinned INTEGER DEFAULT 0,
          is_private INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `)
    },
  },
  {
    version: 8,
    name: '008_article_highlights',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS article_highlights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          article_id INTEGER NOT NULL REFERENCES rss_articles(id) ON DELETE CASCADE,
          selected_text TEXT NOT NULL,
          note TEXT,
          color TEXT DEFAULT '#FEC300',
          created_at TEXT DEFAULT (datetime('now'))
        )
      `)
    },
  },
  {
    version: 9,
    name: '009_ai_subscriptions_base_url',
    up: (db) => {
      db.exec(`
        ALTER TABLE ai_subscriptions ADD COLUMN base_url TEXT
      `)
    },
  },
]

export function runMigrations(db: Database.Database): void {
  // Create migrations table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const applied = db.prepare('SELECT version FROM _migrations').all() as { version: number }[]
  const appliedVersions = new Set(applied.map((r) => r.version))

  const insertMigration = db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)')

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      db.transaction(() => {
        migration.up(db)
        insertMigration.run(migration.version, migration.name)
      })()
      console.log(`Applied migration: ${migration.name}`)
    }
  }
}
