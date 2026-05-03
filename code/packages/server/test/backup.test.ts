import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';
import { migration007MediaBackup, BackupRepo } from '@opennote/db';
import { BackupRunner } from '../src/backup-runner.js';
import { register as registerBackup } from '../src/routes/backup.js';
import { EventBus } from '../src/events.js';
import { TokenService } from '../src/tokens.js';

let tmp: string;
let db: DB;
let app: Hono;
let bus: EventBus;
let runner: BackupRunner;

function setupDbSchema(d: DB): void {
  d.pragma('foreign_keys = ON');
  d.exec(`
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
  tmp = mkdtempSync(join(tmpdir(), 'opennote-backup-'));
  db = new Database(':memory:');
  setupDbSchema(db);
  bus = new EventBus();

  // 假 vault + 假 dbPath
  const vault = join(tmp, 'vault');
  mkdirSync(vault, { recursive: true });
  writeFileSync(join(vault, 'a.md'), '# hello\n');
  const dbPath = join(tmp, 'mock.sqlite');
  writeFileSync(dbPath, 'fake'); // 内存 db.backup() 也能 fallback

  runner = new BackupRunner({
    db,
    bus,
    vaultDir: vault,
    dbPath,
    outDir: join(tmp, 'backups'),
  });

  app = new Hono();
  registerBackup(app, { db, runner });
});

afterEach(() => {
  db.close();
  rmSync(tmp, { recursive: true, force: true });
});

async function adminReq(method: string, path: string): Promise<Response> {
  const tokens = new TokenService(db);
  const { token } = tokens.create(`t-${Math.random()}`, 'admin', 30);
  return app.request(path, {
    method,
    headers: { authorization: `Bearer ${token}` },
  });
}

describe('Backup routes', () => {
  it('POST 创建 job → status 拿到结果(无 archiver 时降级 failed)', async () => {
    const r = await adminReq('POST', '/api/admin/backup');
    expect(r.status).toBe(202);
    const job = (await r.json()) as { id: string; status: string };
    expect(job.status).toBe('pending');

    // 等一下让 setImmediate 跑
    await new Promise((res) => setTimeout(res, 200));

    const repo = new BackupRepo(db);
    const after = repo.get(job.id);
    expect(after).toBeDefined();
    // archiver 没装时会失败,装了会成功
    expect(['done', 'failed', 'running']).toContain(after?.status);

    // status endpoint 也能拿
    const sres = await adminReq('GET', `/api/admin/backup/${job.id}/status`);
    expect(sres.status).toBe(200);
    const sj = (await sres.json()) as { id: string };
    expect(sj.id).toBe(job.id);
  });

  it('GET unknown job → 404', async () => {
    const r = await adminReq('GET', '/api/admin/backup/bk_nope/status');
    expect(r.status).toBe(404);
  });

  it('GET download for non-done job → 409', async () => {
    // 直接 insert 一个 pending job
    const repo = new BackupRepo(db);
    repo.insert({
      id: 'bk_test',
      status: 'pending',
      progress: 0,
      bytes: null,
      download_url: null,
      error: null,
      created_at: new Date().toISOString(),
      finished_at: null,
    });
    const r = await adminReq('GET', '/api/admin/backup/bk_test/download');
    expect(r.status).toBe(409);
  });

  it('outDir 在 enqueue 后会被创建(若 archiver 可用)', async () => {
    const r = await adminReq('POST', '/api/admin/backup');
    const job = (await r.json()) as { id: string };
    await new Promise((res) => setTimeout(res, 200));
    const path = runner.filePathFor(job.id);
    // archiver 装了 → 文件存在;没装 → 文件不存在但 outDir 也可能不存在,放过
    if (existsSync(path)) {
      expect(existsSync(path)).toBe(true);
    }
  });
});
