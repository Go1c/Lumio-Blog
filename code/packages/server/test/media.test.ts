import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';
import { migration007MediaBackup, MediaRepo } from '@opennote/db';
import { LocalMediaStore } from '../src/media-store.js';
import { register as registerMedia } from '../src/routes/media.js';
import { EventBus } from '../src/events.js';
import { TokenService } from '../src/tokens.js';

let tmp: string;
let db: DB;
let app: Hono;
let bus: EventBus;
let store: LocalMediaStore;

function setupDbSchema(d: DB): void {
  d.pragma('foreign_keys = ON');
  d.exec(`
    CREATE TABLE notes (
      slug TEXT PRIMARY KEY, title TEXT NOT NULL,
      summary TEXT, body_html TEXT NOT NULL DEFAULT '',
      body_text TEXT NOT NULL DEFAULT '',
      visibility TEXT NOT NULL DEFAULT 'public',
      searchable INTEGER NOT NULL DEFAULT 1,
      short_id TEXT, source_path TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      published_at TEXT, scheduled_at TEXT,
      word_count INTEGER NOT NULL DEFAULT 0,
      reading_minutes INTEGER NOT NULL DEFAULT 1,
      cover TEXT, hash TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE sessions (
      jti TEXT PRIMARY KEY, subject TEXT NOT NULL,
      created_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT
    );
    CREATE TABLE api_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE, scope TEXT NOT NULL,
      created_at TEXT NOT NULL, expires_at TEXT,
      last_used_at TEXT, revoked_at TEXT
    );
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL,
      actor TEXT NOT NULL, action TEXT NOT NULL,
      target TEXT, diff TEXT, ip TEXT, ua TEXT
    );
  `);
  d.exec(migration007MediaBackup.up);
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'opennote-media-'));
  db = new Database(':memory:');
  setupDbSchema(db);
  bus = new EventBus();
  store = new LocalMediaStore({ rootDir: join(tmp, 'media'), urlPrefix: '/static/media' });
  app = new Hono();
  registerMedia(app, { db, store, bus });
});

afterEach(() => {
  db.close();
  rmSync(tmp, { recursive: true, force: true });
});

async function adminReq(method: string, path: string, init?: RequestInit): Promise<Response> {
  const tokens = new TokenService(db);
  const { token } = tokens.create(`t-${Math.random()}`, 'admin', 30);
  const headers = new Headers(init?.headers);
  headers.set('authorization', `Bearer ${token}`);
  return app.request(path, { ...init, method, headers });
}

describe('Media routes', () => {
  it('上传 → 列表 → refs 全链路', async () => {
    // 上传一个 PNG
    const png = Buffer.from('89504e470d0a1a0a' + '00'.repeat(8), 'hex');
    const fd = new FormData();
    fd.append('file', new File([png], 'pixel.png', { type: 'image/png' }));
    const up = await adminReq('POST', '/api/admin/media', { body: fd });
    expect(up.status).toBe(200);
    const item = (await up.json()) as { id: string; bytes: number; mime: string };
    expect(item.mime).toBe('image/png');
    expect(item.bytes).toBe(png.byteLength);

    // list
    const ls = await adminReq('GET', '/api/admin/media');
    expect(ls.status).toBe(200);
    const page = (await ls.json()) as { items: { id: string }[]; next_cursor: null };
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe(item.id);

    // 同 sha 复传 → 复用同 id
    const fd2 = new FormData();
    fd2.append('file', new File([png], 'pixel-2.png', { type: 'image/png' }));
    const up2 = await adminReq('POST', '/api/admin/media', { body: fd2 });
    expect(up2.status).toBe(200);
    const item2 = (await up2.json()) as { id: string };
    expect(item2.id).toBe(item.id);

    // refs(空)
    const refs = await adminReq('GET', `/api/admin/media/${item.id}/refs`);
    expect(refs.status).toBe(200);

    // 删除
    const del = await adminReq('DELETE', `/api/admin/media/${item.id}`);
    expect(del.status).toBe(200);

    const ls2 = await adminReq('GET', '/api/admin/media');
    const page2 = (await ls2.json()) as { items: unknown[] };
    expect(page2.items).toHaveLength(0);
  });

  it('删除时存在 ref 且无 force → 409', async () => {
    // 直接 insert media + ref
    const repo = new MediaRepo(db);
    repo.insert({
      id: 'abc.png',
      filename: 'a.png',
      mime: 'image/png',
      bytes: 10,
      url: '/static/media/abc.png',
      uploaded_at: new Date().toISOString(),
      sha256: 'deadbeef',
    });
    db.prepare('INSERT INTO notes (slug, title) VALUES (?, ?)').run('hello', 'Hello');
    db.prepare('INSERT INTO media_refs (media_id, slug, kind) VALUES (?, ?, ?)')
      .run('abc.png', 'hello', 'embed');

    const res = await adminReq('DELETE', '/api/admin/media/abc.png');
    expect(res.status).toBe(409);
    const j = (await res.json()) as { error: { code: string } };
    expect(j.error.code).toBe('conflict');

    // force=1 → 200
    const ok = await adminReq('DELETE', '/api/admin/media/abc.png?force=1');
    expect(ok.status).toBe(200);
  });
});
