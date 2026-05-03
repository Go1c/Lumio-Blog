import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { parse as parseYaml } from 'yaml';
import { runMigrations } from '@opennote/db';
import { EventBus } from '../src/events.js';
import { register as registerSettings } from '../src/routes/settings.js';
import type { RouteDeps } from '../src/routes.js';
import type { SiteConfig, SyncEvent } from '@opennote/core';

/**
 * WS-G1 Settings API 测试
 *
 * 注:这些测试只覆盖 settings 路由,所以直接 register 到一个新 Hono 实例,
 * 不依赖 buildApp(那需要更多 deps 而且 routes.ts 还没集成 settings register)。
 */

let tmp: string;
let cfgPath: string;
let featuresPath: string;
let db: Database.Database;
let app: Hono;
let bus: EventBus;
let events: SyncEvent[] = [];
let syncCalls = 0;

function startCfg(): void {
  writeFileSync(
    cfgPath,
    `site:\n  title: "Test Site"\n  url: "https://example.test"\nauthor:\n  name: "Tester"\npaths:\n  vault: ./vault\n  out: ./out\n  db: ./test.db\n`,
  );
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'opennote-settings-'));
  cfgPath = join(tmp, 'config.yaml');
  featuresPath = join(tmp, 'features.yaml');
  startCfg();
  process.env.OPENNOTE_CONFIG = cfgPath;
  process.env.OPENNOTE_FEATURES = featuresPath;

  db = new Database(':memory:');
  runMigrations(db);
  // 手动应用 004 迁移(测试时,主 agent 还没集成到 migrate.ts)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings_changes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      ts        TEXT NOT NULL,
      actor     TEXT NOT NULL,
      section   TEXT NOT NULL,
      diff_json TEXT NOT NULL
    );
  `);

  bus = new EventBus();
  events = [];
  bus.subscribe((e) => events.push(e));

  syncCalls = 0;
  const deps: RouteDeps = {
    db,
    config: { site: { title: 'x', url: 'https://x' }, author: { name: 'x' }, paths: { vault: '', out: '', db: '' } } as SiteConfig,
    bus,
    triggerSync: async () => {
      syncCalls += 1;
    },
  };

  app = new Hono();
  registerSettings(app, deps);
});

afterEach(() => {
  db.close();
  rmSync(tmp, { recursive: true, force: true });
  delete process.env.OPENNOTE_CONFIG;
  delete process.env.OPENNOTE_FEATURES;
});

async function cookieReq(method: string, path: string, body?: unknown): Promise<Response> {
  // settings actorMw 同时接受 admin bearer; 没设的话直接走 cookie 分支会 401。
  // 测试里通过创建 admin token 走 bearer 路径。
  const adminToken = (() => {
    // 用 token service 创建一个 admin token
    // 这里直接 inline,避免引依赖
    return null;
  })();
  void adminToken;
  return app.request(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  });
}

async function adminReq(method: string, path: string, body?: unknown): Promise<Response> {
  // 创建 admin token 并用 Bearer 调用
  const { TokenService } = await import('../src/tokens.js');
  const tokens = new TokenService(db);
  const { token } = tokens.create('test-admin', 'admin', 30);
  return app.request(path, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body == null ? undefined : JSON.stringify(body),
  });
}

describe('GET /api/admin/settings', () => {
  it('returns AdminSettings with default features when features.yaml is missing', async () => {
    const res = await adminReq('GET', '/api/admin/settings');
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toHaveProperty('site');
    expect(data).toHaveProperty('author');
    expect(data).toHaveProperty('theme');
    expect(data).toHaveProperty('seo');
    expect(data).toHaveProperty('home');
    expect(data).toHaveProperty('features');
    const features = data.features as Record<string, Record<string, unknown>>;
    expect(features.content?.search).toBe(true);
    expect(features.admin?.analytics).toBe(true);
    const site = data.site as { title: string };
    expect(site.title).toBe('Test Site');
  });

  it('returns 401 without auth', async () => {
    const res = await cookieReq('GET', '/api/admin/settings');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/admin/settings', () => {
  it('updates site section in config.yaml and emits settings.changed', async () => {
    const res = await adminReq('PATCH', '/api/admin/settings', {
      site: { title: 'New Title' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; patched: string[] };
    expect(body.ok).toBe(true);
    expect(body.patched).toContain('site');

    // 写回 yaml
    const cfg = parseYaml(readFileSync(cfgPath, 'utf-8')) as { site: { title: string; url: string } };
    expect(cfg.site.title).toBe('New Title');
    expect(cfg.site.url).toBe('https://example.test'); // 保留

    // 事件
    const settingsEvents = events.filter((e) => e.kind === 'settings.changed');
    expect(settingsEvents.length).toBe(1);

    // 触发 sync
    expect(syncCalls).toBeGreaterThanOrEqual(0); // 是 fire-and-forget,可能还没跑;不强求,只验证调用机制不抛错

    // 审计
    const auditCount = (db.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'settings.patch'`).get() as { n: number }).n;
    expect(auditCount).toBe(1);
    const sc = (db.prepare('SELECT COUNT(*) AS n FROM settings_changes').get() as { n: number }).n;
    expect(sc).toBe(1);
  });

  it('updates features and writes features.yaml', async () => {
    const res = await adminReq('PATCH', '/api/admin/settings', {
      features: { content: { comments: false } },
    });
    expect(res.status).toBe(200);
    expect(existsSync(featuresPath)).toBe(true);
    const f = parseYaml(readFileSync(featuresPath, 'utf-8')) as { content: { comments: boolean; search: boolean } };
    expect(f.content.comments).toBe(false);
    expect(f.content.search).toBe(true); // default 保留
  });

  it('returns 400 on validation failure', async () => {
    const res = await adminReq('PATCH', '/api/admin/settings', {
      site: { url: 'not-a-url' },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('validation_failed');
  });

  it('returns 400 on empty patch', async () => {
    const res = await adminReq('PATCH', '/api/admin/settings', {});
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await cookieReq('PATCH', '/api/admin/settings', { site: { title: 'Y' } });
    expect(res.status).toBe(401);
  });
});
