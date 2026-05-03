import { Hono, type Context, type MiddlewareHandler, type Next } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Database } from 'better-sqlite3';
import { resolve } from 'node:path';
import { NoteRepo, ShortLinkRepo } from '@opennote/db';
import type { SiteConfig, SyncEvent, Visibility } from '@opennote/core';
import { AuthService, clearSessionCookie, setSessionCookie, getSessionToken } from './auth.js';
import { TokenService, requireToken } from './tokens.js';
import { WebhookService } from './webhooks.js';
import { AuditLog } from './audit.js';
import type { EventBus } from './events.js';
import { register as registerSettings } from './routes/settings.js';
import { register as registerSearch } from './routes/search.js';
import { register as registerGraph } from './routes/graph.js';
import { register as registerAnalytics } from './routes/analytics.js';
import * as mediaRoutes from './routes/media.js';
import * as backupRoutes from './routes/backup.js';
import * as ogRoutes from './routes/og.js';
import * as newsletterRoutes from './routes/newsletter.js';
import { createMediaStoreFromEnv, LocalMediaStore, type MediaStore } from './media-store.js';
import type { BackupRunner } from './backup-runner.js';

export interface RouteDeps {
  db: Database;
  config: SiteConfig;
  bus: EventBus;
  triggerSync: () => Promise<void>;
  // Optional — main.ts may wire these for full functionality
  vaultDir?: string;
  dbPath?: string;
  dataDir?: string;
  backupRunner?: BackupRunner;
  mediaStore?: MediaStore;
}

export function buildApp(deps: RouteDeps): Hono {
  const app = new Hono();
  const noteRepo = new NoteRepo(deps.db);
  const shortRepo = new ShortLinkRepo(deps.db);
  const auth = new AuthService(deps.db);
  const tokens = new TokenService(deps.db);
  const hooks = new WebhookService(deps.db);
  const audit = new AuditLog(deps.db);

  // 把每个事件投到 webhooks
  deps.bus.subscribe((e) => { void hooks.deliver(e); });

  // ---------- 公开 API ----------
  app.get('/api/health', (c) => {
    const counts = noteRepo.countByVisibility();
    return c.json({
      ok: true,
      note_count: counts.public + counts.unlisted + counts['link-only'] + counts.private,
      visibility_counts: counts,
    });
  });

  app.get('/api/posts', (c) => {
    const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);
    const offset = Number(c.req.query('offset') ?? 0);
    const rows = noteRepo.listPublic(limit, offset);
    return c.json({
      posts: rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        published_at: r.published_at,
        reading_minutes: r.reading_minutes,
      })),
    });
  });

  app.get('/api/posts/:slug', (c) => {
    const slug = c.req.param('slug');
    const row = noteRepo.getBySlug(slug);
    if (!row) return c.json({ error: { code: 'not_found' } }, 404);
    if (row.visibility === 'private') return c.json({ error: { code: 'not_found' } }, 404);
    return c.json({ post: row });
  });

  // /api/search is registered by registerSearch (WS-G2) below — provides FTS5 + facets

  app.get('/n/:short_id', (c) => {
    const sid = c.req.param('short_id');
    const row = noteRepo.getByShortId(sid);
    if (!row) {
      return c.html(privateInterceptHtml('这条短链不可用', '它可能已被撤销，或从未存在。'), 404);
    }
    return c.redirect(`/posts/${row.slug}.html`, 302);
  });

  // ---------- Auth ----------
  app.post('/api/auth/login', async (c) => {
    const { password } = await c.req.json<{ password: string }>().catch(() => ({ password: '' }));
    if (!auth.verifyPassword(password ?? '')) {
      audit.write({ actor: 'anon', action: 'auth.login.failed', ip: c.req.header('x-forwarded-for') ?? null });
      return c.json({ error: { code: 'unauthorized' } }, 401);
    }
    const token = auth.createSession();
    setSessionCookie(c, token);
    audit.write({ actor: 'owner', action: 'auth.login.ok', ip: c.req.header('x-forwarded-for') ?? null });
    return c.json({ ok: true });
  });

  app.post('/api/auth/logout', (c) => {
    const token = getSessionToken(c);
    if (token) {
      auth.revokeSession(token);
      audit.write({ actor: 'owner', action: 'auth.logout' });
    }
    clearSessionCookie(c);
    return c.json({ ok: true });
  });

  app.get('/api/auth/me', (c) => {
    const token = getSessionToken(c);
    if (token && auth.isValidSession(token)) {
      return c.json({ authenticated: true, subject: 'owner' });
    }
    return c.json({ authenticated: false });
  });

  // ---------- 通用 actor middleware ----------
  // 接受 cookie session 或 bearer token；把 actor 信息塞到 ctx
  function actorMw(minScope: 'read' | 'write' | 'admin'): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      const cookie = getSessionToken(c);
      if (cookie && auth.isValidSession(cookie)) {
        c.set('actor', 'owner');
        return next();
      }
      // 退化为 bearer
      return requireToken(tokens, minScope)(c, async () => {
        c.set('actor', `token:${c.get('tokenScope')}`);
        await next();
      });
    };
  }

  // ---------- Admin (cookie 或 bearer admin) ----------
  const admin = new Hono();
  admin.use('*', actorMw('admin'));

  admin.get('/notes', (c) => {
    const rows = noteRepo.listAll();
    return c.json({
      notes: rows.map((r) => ({
        slug: r.slug, title: r.title,
        visibility: r.visibility, searchable: !!r.searchable,
        short_id: r.short_id, updated_at: r.updated_at, word_count: r.word_count,
      })),
    });
  });

  admin.get('/notes/:slug', (c) => {
    const slug = c.req.param('slug');
    const note = noteRepo.getBySlug(slug);
    if (!note) return c.json({ error: { code: 'not_found' } }, 404);
    return c.json({ note, backlinks: noteRepo.backlinks(slug) });
  });

  admin.patch('/notes/:slug/meta', async (c) => {
    return patchMeta(c);
  });

  admin.post('/notes/:slug/short-link', async (c) => {
    const slug = c.req.param('slug');
    const note = noteRepo.getBySlug(slug);
    if (!note) return c.json({ error: { code: 'not_found' } }, 404);
    const existing = shortRepo.getActive(slug);
    if (existing) shortRepo.tombstone(existing.short_id);
    audit.write({ actor: c.get('actor') ?? 'owner', action: 'shortlink.rotate', target: slug });
    await deps.triggerSync();
    return c.json({ ok: true });
  });

  admin.post('/sync', async (c) => {
    audit.write({ actor: c.get('actor') ?? 'owner', action: 'sync.manual' });
    await deps.triggerSync();
    return c.json({ ok: true });
  });

  // Tokens
  admin.get('/tokens', (c) => c.json({ tokens: tokens.list() }));
  admin.post('/tokens', async (c) => {
    const { name, scope, ttl_days } = await c.req.json<{ name: string; scope: 'read' | 'write' | 'admin'; ttl_days?: number }>();
    if (!name || !scope) return c.json({ error: { code: 'validation_failed' } }, 400);
    const r = tokens.create(name, scope, ttl_days ?? 90);
    audit.write({ actor: c.get('actor') ?? 'owner', action: 'token.create', target: String(r.id), diff: JSON.stringify({ name, scope }) });
    return c.json(r);
  });
  admin.delete('/tokens/:id', (c) => {
    const id = Number(c.req.param('id'));
    tokens.revoke(id);
    audit.write({ actor: c.get('actor') ?? 'owner', action: 'token.revoke', target: String(id) });
    return c.json({ ok: true });
  });

  // Webhooks
  admin.get('/webhooks', (c) => c.json({ webhooks: hooks.list() }));
  admin.post('/webhooks', async (c) => {
    const { url, events, secret } = await c.req.json<{ url: string; events?: string[]; secret?: string }>();
    if (!url) return c.json({ error: { code: 'validation_failed' } }, 400);
    const id = hooks.create(url, events ?? [], secret ?? Math.random().toString(36).slice(2));
    audit.write({ actor: c.get('actor') ?? 'owner', action: 'webhook.create', target: String(id), diff: JSON.stringify({ url, events }) });
    return c.json({ id });
  });
  admin.delete('/webhooks/:id', (c) => {
    const id = Number(c.req.param('id'));
    hooks.delete(id);
    audit.write({ actor: c.get('actor') ?? 'owner', action: 'webhook.delete', target: String(id) });
    return c.json({ ok: true });
  });

  admin.get('/audit', (c) => {
    const limit = Math.min(Number(c.req.query('limit') ?? 50), 500);
    return c.json({ entries: audit.recent(limit) });
  });

  // SSE: live event stream
  admin.get('/changes', (c) => {
    return streamSSE(c, async (stream) => {
      let alive = true;
      const unsub = deps.bus.subscribe((e: SyncEvent) => {
        void stream.writeSSE({ event: e.kind, data: JSON.stringify(e) });
      });
      stream.onAbort(() => {
        alive = false;
        unsub();
      });
      try {
        while (alive) {
          await stream.sleep(30_000);
          if (!alive) break;
          await stream.writeSSE({ event: 'ping', data: '{}' });
        }
      } catch {
        // client closed
      } finally {
        unsub();
      }
    });
  });

  app.route('/api/admin', admin);

  // ---------- Agent write API（bearer write scope）----------
  // 共享 patchMeta 实现，权限来自 actorMw('write')
  app.patch('/api/notes/:slug/meta', actorMw('write'), patchMeta);

  // ---------- WS-G register (settings / search / graph / analytics / media / backup / og / newsletter) ----------
  registerSettings(app, deps);
  registerSearch(app, { db: deps.db });
  registerGraph(app, { db: deps.db });
  registerAnalytics(app, { db: deps.db });

  const dataDir = deps.dataDir ?? './data';
  const mediaStore = deps.mediaStore ?? createMediaStoreFromEnv({
    localRoot: resolve(dataDir, 'media'),
    urlPrefix: '/static/media',
  });
  mediaRoutes.register(app, { db: deps.db, store: mediaStore, bus: deps.bus });
  if (mediaStore instanceof LocalMediaStore) {
    mediaRoutes.registerLocalMediaStatic(app, mediaStore);
  }

  if (deps.backupRunner) {
    backupRoutes.register(app, { db: deps.db, runner: deps.backupRunner });
  }

  ogRoutes.register(app, {
    db: deps.db,
    config: deps.config,
    cacheDir: resolve(dataDir, 'og'),
  });

  newsletterRoutes.register(app, {});

  return app;

  // -------------------------------------------------
  async function patchMeta(c: Context): Promise<Response> {
    const slug = c.req.param('slug');
    if (!slug) return c.json({ error: { code: 'validation_failed', field: 'slug' } }, 400);
    const note = noteRepo.getBySlug(slug);
    if (!note) return c.json({ error: { code: 'not_found' } }, 404);

    const body: { visibility?: string; searchable?: boolean } =
      await c.req.json<{ visibility?: string; searchable?: boolean }>().catch(() => ({}));
    const allowed: Partial<{ visibility: Visibility; searchable: 0 | 1 }> = {};
    const VALID: Visibility[] = ['public', 'unlisted', 'link-only', 'private'];

    if (body.visibility) {
      if (!VALID.includes(body.visibility as Visibility)) {
        return c.json({ error: { code: 'validation_failed', field: 'visibility' } }, 400);
      }
      allowed.visibility = body.visibility as Visibility;
    }
    if (typeof body.searchable === 'boolean') {
      const v = (allowed.visibility ?? note.visibility);
      if ((v === 'link-only' || v === 'private') && body.searchable) {
        return c.json({ error: { code: 'validation_failed', field: 'searchable', message: `${v} 不允许 searchable=true` } }, 400);
      }
      allowed.searchable = body.searchable ? 1 : 0;
    }

    if (Object.keys(allowed).length === 0) {
      return c.json({ error: { code: 'validation_failed', message: 'no fields' } }, 400);
    }

    noteRepo.patchMeta(slug, allowed);
    audit.write({
      actor: c.get('actor') ?? 'owner',
      action: 'note.meta.patch',
      target: slug,
      diff: JSON.stringify(allowed),
    });
    deps.bus.emit({ kind: 'note.updated', slug });
    return c.json({ slug, patched: Object.keys(allowed) });
  }
}

declare module 'hono' {
  interface ContextVariableMap {
    actor: string;
  }
}

function privateInterceptHtml(title: string, subtitle: string): string {
  return `<!doctype html><meta charset=utf-8>
<title>${title}</title>
<style>body{font:16px/1.6 system-ui;max-width:480px;margin:80px auto;padding:24px;color:#1a1a1a}h1{margin:0 0 8px}p{color:#666}a{color:#2563eb}</style>
<h1>${title}</h1><p>${subtitle}</p><p><a href="/">← 回首页</a></p>`;
}
