import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';
import type { SiteConfig } from '@opennote/core';
import { register as registerOg } from '../src/routes/og.js';

function pngSize(buf: Buffer): { width: number; height: number } {
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

let tmp: string;
let db: DB;
let app: Hono;

function setupDbSchema(d: DB): void {
  d.exec(`
    CREATE TABLE notes (
      slug TEXT PRIMARY KEY, title TEXT NOT NULL,
      summary TEXT, body_html TEXT NOT NULL DEFAULT '',
      body_text TEXT NOT NULL DEFAULT '',
      visibility TEXT NOT NULL DEFAULT 'public',
      searchable INTEGER NOT NULL DEFAULT 1,
      short_id TEXT, source_path TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '2025-01-01T00:00:00.000Z',
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
  `);
}

const cfg: SiteConfig = {
  site: { title: 'Test', url: 'https://example.com' },
  author: { name: 'Tester' },
  paths: { vault: '', out: '', db: '' },
};

describe('GET /og/:slug.png', () => {
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'opennote-og-'));
    db = new Database(':memory:');
    setupDbSchema(db);
    db.prepare(
      `INSERT INTO notes (slug, title, summary, body_html, body_text, updated_at, reading_minutes)
       VALUES (?, ?, ?, '', '', '2025-04-15T10:00:00.000Z', 12)`,
    ).run('hello', 'Hello World', 'a test post');

    app = new Hono();
    registerOg(app, { db, config: cfg, cacheDir: join(tmp, 'og') });
  });

  afterEach(() => {
    db.close();
    rmSync(tmp, { recursive: true, force: true });
  });

  it('200 + image/png + 命中缓存', async () => {
    const r = await app.request('/og/hello.png');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('image/png');
    const body = Buffer.from(await r.arrayBuffer());
    expect(pngSize(body)).toEqual({ width: 1200, height: 630 });
    const cacheDir = join(tmp, 'og');
    expect(existsSync(cacheDir)).toBe(true);

    const r2 = await app.request('/og/hello.png');
    expect(r2.status).toBe(200);
    expect(pngSize(Buffer.from(await r2.arrayBuffer()))).toEqual({ width: 1200, height: 630 });
  });

  it('未知 slug → 404', async () => {
    const r = await app.request('/og/unknown.png');
    expect(r.status).toBe(404);
  });

  it('不带 .png → 404', async () => {
    const r = await app.request('/og/hello');
    expect(r.status).toBe(404);
  });
});
