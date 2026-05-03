/**
 * Migration 007 — Media + Backup tables
 *
 * 提供 media library + backup job 持久化。
 * 由 WS-G4 拥有,仅在 migrate.ts 中按 version 注册。
 */

export const migration007MediaBackup = {
  version: 7,
  name: 'media_backup',
  up: `
    -- 媒体物件:由 LocalMediaStore 或 S3MediaStore 写入,这里只存 metadata
    CREATE TABLE media (
      id           TEXT PRIMARY KEY,
      filename     TEXT NOT NULL,
      mime         TEXT NOT NULL,
      bytes        INTEGER NOT NULL DEFAULT 0,
      url          TEXT NOT NULL,
      uploaded_at  TEXT NOT NULL,
      sha256       TEXT
    );
    CREATE INDEX idx_media_uploaded_at ON media(uploaded_at);
    CREATE INDEX idx_media_sha256      ON media(sha256);

    -- 媒体引用:笔记 body_html 解析后写入,删除 media 之前必须无 ref
    CREATE TABLE media_refs (
      media_id  TEXT NOT NULL,
      slug      TEXT NOT NULL,
      kind      TEXT NOT NULL CHECK(kind IN ('embed','cover','link')),
      PRIMARY KEY (media_id, slug, kind),
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_media_refs_slug ON media_refs(slug);

    -- 备份任务持久化
    CREATE TABLE backup_jobs (
      id            TEXT PRIMARY KEY,
      status        TEXT NOT NULL CHECK(status IN ('pending','running','done','failed')),
      progress      REAL NOT NULL DEFAULT 0,
      bytes         INTEGER,
      download_url  TEXT,
      error         TEXT,
      created_at    TEXT NOT NULL,
      finished_at   TEXT
    );
    CREATE INDEX idx_backup_jobs_created_at ON backup_jobs(created_at);
  `,
} as const;
