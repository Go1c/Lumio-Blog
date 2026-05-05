import type { Database } from 'better-sqlite3';
import { settingsAuditMigration } from './migrations/004_settings_audit.js';
import { migration005 } from './migrations/005_search_fts.js';
import { migration006Analytics } from './migrations/006_analytics.js';
import { migration007MediaBackup } from './migrations/007_media_backup.js';
import { migration008CommentsSubscribers } from './migrations/008_comments_subscribers.js';
import { migration009SearchableShortlinkExtras } from './migrations/009_searchable_shortlink_extras.js';
import { migration010CommentsThreading } from './migrations/010_comments_threading.js';
import { migration011NoteKind } from './migrations/011_note_kind.js';

interface Migration {
  version: number;
  name: string;
  up: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'init',
    up: `
      CREATE TABLE notes (
        slug             TEXT PRIMARY KEY,
        title            TEXT NOT NULL,
        summary          TEXT,
        body_html        TEXT NOT NULL,
        body_text        TEXT NOT NULL,
        visibility       TEXT NOT NULL CHECK(visibility IN ('public','unlisted','link-only','private')),
        searchable       INTEGER NOT NULL DEFAULT 1,
        short_id         TEXT UNIQUE,
        source_path      TEXT NOT NULL UNIQUE,
        created_at       TEXT NOT NULL,
        updated_at       TEXT NOT NULL,
        published_at     TEXT,
        scheduled_at     TEXT,
        word_count       INTEGER NOT NULL DEFAULT 0,
        reading_minutes  INTEGER NOT NULL DEFAULT 1,
        cover            TEXT,
        hash             TEXT NOT NULL
      );

      CREATE INDEX idx_notes_visibility ON notes(visibility);
      CREATE INDEX idx_notes_published_at ON notes(published_at);
      CREATE INDEX idx_notes_searchable ON notes(searchable) WHERE searchable = 1;

      CREATE TABLE tags (
        slug TEXT NOT NULL,
        tag  TEXT NOT NULL,
        PRIMARY KEY (slug, tag),
        FOREIGN KEY (slug) REFERENCES notes(slug) ON DELETE CASCADE
      );
      CREATE INDEX idx_tags_tag ON tags(tag);

      CREATE TABLE links (
        src_slug    TEXT NOT NULL,
        dst_slug    TEXT,
        raw_target  TEXT NOT NULL,
        FOREIGN KEY (src_slug) REFERENCES notes(slug) ON DELETE CASCADE
      );
      CREATE INDEX idx_links_src ON links(src_slug);
      CREATE INDEX idx_links_dst ON links(dst_slug);

      CREATE TABLE short_links (
        short_id       TEXT PRIMARY KEY,
        slug           TEXT NOT NULL,
        created_at     TEXT NOT NULL,
        tombstoned_at  TEXT
      );

      CREATE TABLE api_tokens (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        token_hash  TEXT NOT NULL UNIQUE,
        scope       TEXT NOT NULL CHECK(scope IN ('read','write','admin')),
        created_at  TEXT NOT NULL,
        expires_at  TEXT,
        last_used_at TEXT,
        revoked_at  TEXT
      );

      CREATE TABLE sessions (
        jti        TEXT PRIMARY KEY,
        subject    TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT
      );

      CREATE TABLE audit_log (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        ts         TEXT NOT NULL,
        actor      TEXT NOT NULL,
        action     TEXT NOT NULL,
        target     TEXT,
        diff       TEXT,
        ip         TEXT,
        ua         TEXT
      );
      CREATE INDEX idx_audit_ts ON audit_log(ts);

      -- 全文搜索（v0.1 简单 FTS5，body_text + title）
      CREATE VIRTUAL TABLE notes_fts USING fts5(
        slug UNINDEXED,
        title,
        body_text,
        tokenize = 'unicode61 remove_diacritics 2'
      );
    `,
  },
  {
    version: 2,
    name: 'webhooks',
    up: `
      CREATE TABLE webhooks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        url         TEXT NOT NULL,
        secret      TEXT NOT NULL,
        events      TEXT NOT NULL,
        created_at  TEXT NOT NULL,
        disabled_at TEXT
      );
      CREATE TABLE webhook_deliveries (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        webhook_id  INTEGER NOT NULL,
        event_kind  TEXT NOT NULL,
        payload     TEXT NOT NULL,
        status      INTEGER,
        response    TEXT,
        attempted_at TEXT NOT NULL,
        FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_deliveries_webhook ON webhook_deliveries(webhook_id);
    `,
  },
  settingsAuditMigration,
  migration005,
  migration006Analytics,
  migration007MediaBackup,
  migration008CommentsSubscribers,
  migration009SearchableShortlinkExtras,
  migration010CommentsThreading,
  migration011NoteKind,
];

export function runMigrations(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name    TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    db
      .prepare<unknown[], { version: number }>('SELECT version FROM schema_migrations')
      .all()
      .map((r) => r.version),
  );

  const tx = db.transaction((m: Migration) => {
    db.exec(m.up);
    db.prepare(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
    ).run(m.version, m.name, new Date().toISOString());
  });

  for (const m of MIGRATIONS) {
    if (!applied.has(m.version)) tx(m);
  }
}
