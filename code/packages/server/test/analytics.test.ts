import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';
import { Hono } from 'hono';
import { AnalyticsRepo } from '@opennote/db';
import { register as registerAnalytics } from '../src/routes/analytics.js';

/**
 * 简易 schema setup — 不跑完整 migrate,只建 analytics 必需的两张表
 * + notes(top_posts JOIN 用)
 */
function makeDb(): DB {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE notes (
      slug         TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      summary      TEXT,
      body_html    TEXT NOT NULL DEFAULT '',
      body_text    TEXT NOT NULL DEFAULT '',
      visibility   TEXT NOT NULL DEFAULT 'public',
      searchable   INTEGER NOT NULL DEFAULT 1,
      short_id     TEXT,
      source_path  TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL DEFAULT '',
      updated_at   TEXT NOT NULL DEFAULT '',
      published_at TEXT,
      scheduled_at TEXT,
      word_count   INTEGER NOT NULL DEFAULT 0,
      reading_minutes INTEGER NOT NULL DEFAULT 1,
      cover        TEXT,
      hash         TEXT NOT NULL DEFAULT ''
    );
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
    CREATE INDEX idx_ae_slug_ts ON analytics_events(slug, ts);
    CREATE INDEX idx_ae_event_ts ON analytics_events(event, ts);
    CREATE INDEX idx_ae_ts ON analytics_events(ts);
    CREATE TABLE analytics_daily (
      date TEXT NOT NULL,
      slug TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      unique_visitors INTEGER NOT NULL DEFAULT 0,
      total_dwell_seconds INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (date, slug)
    );
    -- routes 还需要 sessions / api_tokens(actorMw 用),但我们是 public POST /api/track 测,不需要 admin
    CREATE TABLE sessions (
      jti TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    );
    CREATE TABLE api_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      scope TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      last_used_at TEXT,
      revoked_at TEXT
    );
  `);
  return db;
}

describe('AnalyticsRepo', () => {
  let db: DB;
  let repo: AnalyticsRepo;

  beforeEach(() => {
    db = makeDb();
    repo = new AnalyticsRepo(db);
    db.prepare('INSERT INTO notes (slug, title) VALUES (?, ?)').run('hello', 'Hello');
    db.prepare('INSERT INTO notes (slug, title) VALUES (?, ?)').run('world', 'World');
  });

  it('overview 计算 total_views / uniques / top_posts 正确', () => {
    const now = new Date().toISOString();
    // 3 个 ip 看 hello,2 个 ip 看 world
    for (const ip of ['a', 'b', 'c']) {
      repo.ingestEvent({ slug: 'hello', event: 'view', ts: now, ip_hash: ip });
    }
    for (const ip of ['a', 'd']) {
      repo.ingestEvent({ slug: 'world', event: 'view', ts: now, ip_hash: ip });
    }
    repo.ingestEvent({ slug: 'hello', event: 'dwell', ts: now, ip_hash: 'a', dwell_seconds: 30 });
    repo.ingestEvent({ slug: 'hello', event: 'dwell', ts: now, ip_hash: 'b', dwell_seconds: 60 });

    const ov = repo.overview('7d');
    expect(ov.total_views).toBe(5);
    expect(ov.unique_visitors).toBe(4); // a/b/c/d
    expect(ov.avg_dwell_seconds).toBe(45);
    expect(ov.top_posts[0]).toEqual({ slug: 'hello', title: 'Hello', views: 3 });
    expect(ov.top_posts[1]).toEqual({ slug: 'world', title: 'World', views: 2 });
    expect(ov.bounce_rate).toBeGreaterThanOrEqual(0);
    expect(ov.bounce_rate).toBeLessThanOrEqual(1);
  });

  it('article heatmap 累计到达正确(scroll 60% 应让 bucket 0..5 = 1.0)', () => {
    const now = new Date().toISOString();
    repo.ingestEvent({ slug: 'hello', event: 'view', ts: now, ip_hash: 'x' });
    repo.ingestEvent({ slug: 'hello', event: 'scroll', ts: now, ip_hash: 'x', scroll_pct: 60 });
    const a = repo.article('hello');
    // 60% → reachedIdx = 5(0-index),bucket 0..5 = 1,6..9 = 0
    expect(a.completion_heatmap.slice(0, 6)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(a.completion_heatmap.slice(6)).toEqual([0, 0, 0, 0]);
    expect(a.views).toBe(1);
    expect(a.unique_visitors).toBe(1);
  });

  it('article heatmap 多人合并:50% + 100% → bucket0..4 = 1.0, bucket 5..9 = 0.5', () => {
    const now = new Date().toISOString();
    repo.ingestEvent({ slug: 'hello', event: 'scroll', ts: now, ip_hash: 'x', scroll_pct: 50 });
    repo.ingestEvent({ slug: 'hello', event: 'scroll', ts: now, ip_hash: 'y', scroll_pct: 100 });
    const a = repo.article('hello');
    expect(a.completion_heatmap[0]).toBe(1);
    expect(a.completion_heatmap[4]).toBe(1);
    expect(a.completion_heatmap[5]).toBe(0.5);
    expect(a.completion_heatmap[9]).toBe(0.5);
  });

  it('rollupDay 物化 analytics_daily', () => {
    const date = '2025-04-15';
    const ts = `${date}T10:30:00.000Z`;
    repo.ingestEvent({ slug: 'hello', event: 'view', ts, ip_hash: 'a' });
    repo.ingestEvent({ slug: 'hello', event: 'view', ts, ip_hash: 'b' });
    repo.ingestEvent({ slug: 'hello', event: 'dwell', ts, ip_hash: 'a', dwell_seconds: 100 });
    repo.rollupDay(date);
    const row = db
      .prepare<[string, string], { views: number; unique_visitors: number; total_dwell_seconds: number }>(
        'SELECT views, unique_visitors, total_dwell_seconds FROM analytics_daily WHERE date = ? AND slug = ?',
      )
      .get(date, 'hello');
    expect(row?.views).toBe(2);
    expect(row?.unique_visitors).toBe(2);
    expect(row?.total_dwell_seconds).toBe(100);
  });
});

describe('routes/analytics POST /api/track', () => {
  function buildApp(): { app: Hono; db: DB } {
    const db = makeDb();
    const app = new Hono();
    registerAnalytics(app, { db, ipSalt: 'test-salt' });
    return { app, db };
  }

  async function track(app: Hono, body: unknown, ip = '1.2.3.4'): Promise<Response> {
    return app.fetch(
      new Request('http://x/api/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify(body),
      }),
    );
  }

  it('happy path:接受合法 view 事件并写入 DB', async () => {
    const { app, db } = buildApp();
    const r = await track(app, { slug: 'hello', event: 'view' });
    expect(r.status).toBe(200);
    const cnt = db.prepare<unknown[], { c: number }>('SELECT COUNT(*) AS c FROM analytics_events').get();
    expect(cnt?.c).toBe(1);
  });

  it('校验失败:缺 slug 返 400', async () => {
    const { app } = buildApp();
    const r = await track(app, { event: 'view' });
    expect(r.status).toBe(400);
  });

  it('校验失败:event 不在白名单', async () => {
    const { app } = buildApp();
    const r = await track(app, { slug: 'hello', event: 'destroy' });
    expect(r.status).toBe(400);
  });

  it('限流:同 IP 第 61 次请求被拒(429)', async () => {
    const { app } = buildApp();
    for (let i = 0; i < 60; i++) {
      const r = await track(app, { slug: 'hello', event: 'view' });
      expect(r.status).toBe(200);
    }
    const r = await track(app, { slug: 'hello', event: 'view' });
    expect(r.status).toBe(429);
  });

  it('不同 IP 不互相干扰', async () => {
    const { app } = buildApp();
    for (let i = 0; i < 60; i++) {
      const r = await track(app, { slug: 'hello', event: 'view' }, '1.2.3.4');
      expect(r.status).toBe(200);
    }
    const r = await track(app, { slug: 'hello', event: 'view' }, '5.6.7.8');
    expect(r.status).toBe(200);
  });
});
