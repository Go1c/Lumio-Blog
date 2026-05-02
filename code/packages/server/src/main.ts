import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { openDb } from '@opennote/db';
import { startWatcher, syncAll } from '@opennote/sync';
import { renderSite } from '@opennote/web-public';
import { loadConfig } from './config.js';
import { buildApp } from './routes.js';
import { EventBus } from './events.js';
import { startScheduler } from './scheduler.js';

/**
 * 找 web-admin 的构建产物。优先级：
 * 1. OPENNOTE_ADMIN_DIST 环境变量
 * 2. 同 monorepo 下 packages/web-admin/dist（开发时）
 * 3. 用户 vault 下 .opennote/admin（部署时建议放这里）
 */
function resolveAdminDist(): string | null {
  const env = process.env.OPENNOTE_ADMIN_DIST;
  if (env) {
    const p = resolve(env);
    return existsSync(p) ? p : null;
  }
  // __dirname 在 ESM 下不存在，从 import.meta.url 推
  const here = dirname(fileURLToPath(import.meta.url));
  // dev: <repo>/code/packages/server/src/main.ts → ../../web-admin/dist
  // prod: <repo>/code/packages/server/dist/main.js → ../../web-admin/dist
  const candidates = [
    resolve(here, '../../web-admin/dist'),
    resolve(here, '../web-admin/dist'),
    resolve(process.cwd(), '.opennote/admin'),
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  return null;
}

async function main(): Promise<void> {
  const cfgPath = process.env.OPENNOTE_CONFIG ?? './config.yaml';
  const config = await loadConfig(cfgPath);

  const cfgDir = dirname(resolve(cfgPath));
  const resolveCfg = (p: string) => (p.startsWith('/') ? p : resolve(cfgDir, p));

  const vault = resolveCfg(config.paths.vault);
  const dbPath = resolveCfg(config.paths.db);
  const out = resolveCfg(config.paths.out);
  await mkdir(dirname(dbPath), { recursive: true });
  await mkdir(out, { recursive: true });

  const db = openDb(dbPath);
  const bus = new EventBus();

  const log = (level: string, msg: string, meta?: unknown): void =>
    console.log(JSON.stringify({ ts: new Date().toISOString(), level, event: msg, ...(meta as object | undefined) }));

  const triggerSync = async (): Promise<void> => {
    await syncAll({
      vault, db,
      onLog: (lvl, m, meta) => log(lvl, m, meta),
      onEvent: (e) => bus.emit(e),
    });
    await renderSite({ db, out, config });
  };

  startWatcher({
    vault, db,
    onLog: (lvl, m, meta) => log(lvl, m, meta),
    onEvent: async (e) => {
      bus.emit(e);
      if (e.kind === 'sync.completed') await renderSite({ db, out, config });
    },
  });

  startScheduler(db, bus, triggerSync);

  const api = buildApp({ db, config, bus, triggerSync });

  const root = new Hono();
  root.use('*', logger());
  root.route('/', api);

  const adminDist = resolveAdminDist();
  if (adminDist) {
    log('info', 'admin.dist.found', { path: adminDist });
    root.use('/admin/*', serveStatic({
      root: adminDist,
      rewriteRequestPath: (p) => p.replace(/^\/admin/, '') || '/index.html',
    }));
    // SPA fallback：/admin 直接命中 index.html
    root.get('/admin', (c) => c.redirect('/admin/'));
  } else {
    log('warn', 'admin.dist.missing', { hint: 'pnpm --filter @opennote/web-admin build' });
  }

  root.use('/*', serveStatic({ root: out }));

  const port = Number(process.env.PORT ?? 3000);
  console.log(`opennote v0.5 → http://localhost:${port}`);
  if (adminDist) console.log(`         admin → http://localhost:${port}/admin/`);
  serve({ fetch: root.fetch, port });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
