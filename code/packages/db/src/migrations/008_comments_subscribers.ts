/**
 * Migration 008 — Comments + Subscribers
 *
 * 提供评论 / 订阅者本地持久化(对应 admin 侧栏 互动 → 评论 / 订阅)。
 */

export const migration008CommentsSubscribers = {
  version: 8,
  name: 'comments_subscribers',
  up: `
    CREATE TABLE comments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT NOT NULL,
      author      TEXT NOT NULL,
      email       TEXT,
      website     TEXT,
      body        TEXT NOT NULL,
      status      TEXT NOT NULL CHECK(status IN ('pending','approved','rejected','spam')) DEFAULT 'pending',
      ip_hash     TEXT,
      ua          TEXT,
      created_at  TEXT NOT NULL,
      moderated_at TEXT,
      FOREIGN KEY (slug) REFERENCES notes(slug) ON DELETE CASCADE
    );
    CREATE INDEX idx_comments_slug       ON comments(slug);
    CREATE INDEX idx_comments_status     ON comments(status);
    CREATE INDEX idx_comments_created_at ON comments(created_at);

    CREATE TABLE subscribers (
      email          TEXT PRIMARY KEY,
      source         TEXT NOT NULL DEFAULT 'web',
      subscribed_at  TEXT NOT NULL,
      unsubscribed_at TEXT,
      ip_hash        TEXT
    );
    CREATE INDEX idx_subscribers_subscribed_at ON subscribers(subscribed_at);
  `,
} as const;
