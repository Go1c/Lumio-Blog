/**
 * Migration 006 — analytics
 *
 * 提供两张表:
 *   - analytics_events   原始打点流水(由 POST /api/track 写入)
 *   - analytics_daily    按日 + slug 物化(每日 cron 从 events rollup)
 *
 * 不直接改 migrate.ts —— 主 agent 把这个对象 import 进去 splice 到 MIGRATIONS。
 */

export const migration006Analytics = {
  version: 6,
  name: 'analytics',
  up: `
    CREATE TABLE analytics_events (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      slug            TEXT NOT NULL,
      event           TEXT NOT NULL,
      ts              TEXT NOT NULL,
      ip_hash         TEXT,
      ua              TEXT,
      referrer        TEXT,
      dwell_seconds   INTEGER,
      scroll_pct      INTEGER,
      meta_json       TEXT
    );

    CREATE INDEX idx_analytics_events_slug_ts  ON analytics_events(slug, ts);
    CREATE INDEX idx_analytics_events_event_ts ON analytics_events(event, ts);
    CREATE INDEX idx_analytics_events_ts       ON analytics_events(ts);

    CREATE TABLE analytics_daily (
      date                  TEXT NOT NULL,
      slug                  TEXT NOT NULL,
      views                 INTEGER NOT NULL DEFAULT 0,
      unique_visitors       INTEGER NOT NULL DEFAULT 0,
      total_dwell_seconds   INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (date, slug)
    );

    CREATE INDEX idx_analytics_daily_date ON analytics_daily(date);
  `,
} as const;
