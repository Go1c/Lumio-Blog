import { existsSync, createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { Hono, type Context, type MiddlewareHandler, type Next } from 'hono';
import type { Database } from 'better-sqlite3';
import { AuditLog } from '../audit.js';
import { AuthService, getSessionToken } from '../auth.js';
import { TokenService, requireToken } from '../tokens.js';
import type { BackupRunner } from '../backup-runner.js';

export interface BackupDeps {
  db: Database;
  runner: BackupRunner;
}

/**
 * 注册 backup 路由(/api/admin/backup)。
 * 主 agent 在 routes.ts 里调用 register(app, deps)。
 */
export function register(app: Hono, deps: BackupDeps): void {
  const audit = new AuditLog(deps.db);
  const auth = new AuthService(deps.db);
  const tokens = new TokenService(deps.db);
  const adminMw = actorMw(auth, tokens, 'admin');

  const r = new Hono();
  r.use('*', adminMw);

  // 创建 job
  r.post('/', (c) => {
    const job = deps.runner.enqueue();
    audit.write({
      actor: c.get('actor') ?? 'owner',
      action: 'backup.enqueue',
      target: job.id,
    });
    return c.json(job, 202);
  });

  // 状态查询
  r.get('/:id/status', (c) => {
    const id = c.req.param('id');
    const job = deps.runner.get(id);
    if (!job) return c.json({ error: { code: 'not_found' } }, 404);
    return c.json(job);
  });

  // 下载
  r.get('/:id/download', async (c) => {
    const id = c.req.param('id');
    const job = deps.runner.get(id);
    if (!job) return c.json({ error: { code: 'not_found' } }, 404);
    if (job.status !== 'done') {
      return c.json({ error: { code: 'conflict', message: `status=${job.status}` } }, 409);
    }
    const path = deps.runner.filePathFor(id);
    if (!existsSync(path)) {
      return c.json({ error: { code: 'not_found', message: 'archive missing' } }, 404);
    }
    const s = await stat(path);
    c.header('content-type', 'application/zip');
    c.header('content-length', String(s.size));
    c.header('content-disposition', `attachment; filename="${id}.zip"`);
    const stream = createReadStream(path);
    const web = Readable.toWeb(stream) as unknown as ReadableStream;
    return c.body(web);
  });

  app.route('/api/admin/backup', r);
}

function actorMw(
  auth: AuthService,
  tokens: TokenService,
  minScope: 'read' | 'write' | 'admin',
): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const cookie = getSessionToken(c);
    if (cookie && auth.isValidSession(cookie)) {
      c.set('actor', 'owner');
      return next();
    }
    return requireToken(tokens, minScope)(c, async () => {
      c.set('actor', `token:${c.get('tokenScope')}`);
      await next();
    });
  };
}
