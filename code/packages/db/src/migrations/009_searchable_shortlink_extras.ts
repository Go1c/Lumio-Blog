/**
 * Migration 009 — Multi-dimensional searchable + Short-link password & access counter
 *
 * notes 表的 `searchable` 单 boolean 拆成 4 个维度,前端 UI 出 4 个独立 toggle:
 *   ① searchable        — 站内搜索(保留原列,FTS 走它)
 *   ② seo_indexable     — 是否允许搜索引擎抓取 / 出现在 sitemap
 *   ③ rss_includable    — 是否进 RSS feed
 *   ④ featured_on_home  — 是否上首页推荐位
 *
 * short_links 表加 password_hash / access_count / last_accessed_at,
 * 支撑短链密码保护 + 访问计数。
 *
 * 全部为新增列 + 安全默认值,老数据自动 backfill,不破坏既有读写路径。
 */

export const migration009SearchableShortlinkExtras = {
  version: 9,
  name: 'searchable_shortlink_extras',
  up: `
    -- ---------- notes: 4 维 searchable ----------
    ALTER TABLE notes ADD COLUMN seo_indexable    INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE notes ADD COLUMN rss_includable   INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE notes ADD COLUMN featured_on_home INTEGER NOT NULL DEFAULT 0;

    -- backfill: 老 searchable 同时控制 SEO / RSS — 让升级前的语义平滑过渡。
    -- featured_on_home 不从 searchable 推导,保持默认 0。
    UPDATE notes SET seo_indexable  = searchable;
    UPDATE notes SET rss_includable = searchable;

    CREATE INDEX idx_notes_seo_indexable    ON notes(seo_indexable)    WHERE seo_indexable = 1;
    CREATE INDEX idx_notes_rss_includable   ON notes(rss_includable)   WHERE rss_includable = 1;
    CREATE INDEX idx_notes_featured_on_home ON notes(featured_on_home) WHERE featured_on_home = 1;

    -- ---------- short_links: 密码 + 计数 ----------
    ALTER TABLE short_links ADD COLUMN password_hash    TEXT;
    ALTER TABLE short_links ADD COLUMN access_count     INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE short_links ADD COLUMN last_accessed_at TEXT;
  `,
} as const;
