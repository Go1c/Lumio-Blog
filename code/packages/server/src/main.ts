import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { openDb, MediaRepo } from '@opennote/db';
import { startWatcher, syncAll } from '@opennote/sync';
import { renderSite } from '@opennote/web-public';
import { loadConfig } from './config.js';
import { buildApp } from './routes.js';
import { EventBus } from './events.js';
import { startScheduler } from './scheduler.js';
import { startAnalyticsRollup } from './cron/analytics-rollup.js';
import { BackupRunner } from './backup-runner.js';
import { createMediaStoreFromEnv, LocalMediaStore } from './media-store.js';
import { MediaRefExtractor } from './media-ref-extractor.js';
import { FnsSupervisor, defaultFnsCliDir, defaultFnsConfigOutPath } from './fns-supervisor.js';
import { SyncDiagnosticsBuffer } from './routes/sync-meta.js';
import { loadFeaturesYaml } from './routes/settings.js';

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
  await mkdir(vault, { recursive: true });
  await mkdir(dirname(dbPath), { recursive: true });
  await mkdir(out, { recursive: true });

  const db = openDb(dbPath);
  const bus = new EventBus();

  const log = (level: string, msg: string, meta?: unknown): void =>
    console.log(JSON.stringify({ ts: new Date().toISOString(), level, event: msg, ...(meta as object | undefined) }));

  // WS-G4 — media + backup wiring
  const dataDir = resolveCfg('./data');
  const mediaDir = resolveCfg(process.env.OPENNOTE_MEDIA_DIR ?? './data/media');
  await mkdir(dataDir, { recursive: true });
  await mkdir(mediaDir, { recursive: true });

  const mediaStore = createMediaStoreFromEnv({
    localRoot: mediaDir,
    urlPrefix: '/static/media',
  });
  const mediaRefExtractor = new MediaRefExtractor({
    repo: new MediaRepo(db),
    prefixes: [
      '/static/media',
      // Obsidian 附件管线产出的 URL,跟 admin 上传走的 /static/media 同一个 media_refs 表
      '/_attachments',
      ...(mediaStore instanceof LocalMediaStore ? [] : []),
    ],
  });
  const backupRunner = new BackupRunner({
    db, bus, vaultDir: vault, dbPath, outDir: resolve(dataDir, 'backups'),
  });

  const syncDiagnostics = new SyncDiagnosticsBuffer();

  const triggerSync = async (opts?: { forceAll?: boolean }): Promise<void> => {
    // 每次同步前重新加载 features.yaml,确保 admin 设置变更立即生效
    const features = await loadFeaturesYaml().catch(() => null);
    if (features) {
      config.features = {
        ...config.features,
        comments: features.content.comments,
        newsletter: features.content.newsletter,
        search: features.content.search,
        graph: features.content.graph,
        post_summary: features.content.post_summary,
      };
    }
    await syncAll({
      vault, db, out,
      onLog: (lvl, m, meta) => log(lvl, m, meta),
      onEvent: (e) => bus.emit(e),
      onNoteRendered: mediaRefExtractor.hook,
      onDiagnostics: (d) => syncDiagnostics.record(d),
      forceAll: opts?.forceAll,
    });
    await renderSite({ db, out, config });
  };

  await triggerSync();

  startWatcher({
    vault, db, out,
    onLog: (lvl, m, meta) => log(lvl, m, meta),
    onEvent: async (e) => {
      bus.emit(e);
      if (e.kind === 'sync.completed') await renderSite({ db, out, config });
    },
    onNoteRendered: mediaRefExtractor.hook,
  });

  startScheduler(db, bus, triggerSync);
  startAnalyticsRollup({ db, log });

  // FastNoteSync supervisor — 从 fns-config.yaml 启动 Python fns_cli 子进程
  const fnsSupervisor = new FnsSupervisor({
    vaultDir: vault,
    configOutPath: defaultFnsConfigOutPath(),
    cliDir: defaultFnsCliDir(),
    bus,
    log,
  });
  void fnsSupervisor.start();
  process.on('SIGTERM', () => { void fnsSupervisor.stop(); });
  process.on('SIGINT', () => { void fnsSupervisor.stop(); });

  const api = buildApp({
    db, config, bus, triggerSync,
    dataDir, vaultDir: vault, dbPath,
    backupRunner, mediaStore,
    syncDiagnostics,
  });

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
