import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Hono, type Context, type MiddlewareHandler, type Next } from 'hono';
import type { Database } from 'better-sqlite3';
import { NoteRepo } from '@opennote/db';
import type { SiteConfig } from '@opennote/core';
import { AuthService, getSessionToken } from '../auth.js';
import { TokenService, requireToken } from '../tokens.js';
import { renderOg, type OgTemplate, type OgData, OG_TEMPLATES } from '../og/render.js';

export interface OgDeps {
  db: Database;
  config: SiteConfig;
  /** OG cache 目录(./data/og) */
  cacheDir: string;
}

/**
 * 注册 OG 路由(/og/:slug.png + /api/admin/og/preview)。
 */
export function register(app: Hono, deps: OgDeps): void {
  const noteRepo = new NoteRepo(deps.db);
  const auth = new AuthService(deps.db);
  const tokens = new TokenService(deps.db);
  const adminMw = actorMw(auth, tokens, 'admin');

  // 公开:/og/<slug>.png
  app.get('/og/:slugfile', async (c) => {
    const slugfile = c.req.param('slugfile');
    if (!slugfile.endsWith('.png')) {
      return c.json({ error: { code: 'not_found' } }, 404);
    }
    const slug = slugfile.slice(0, -4);
    const note = noteRepo.getBySlug(slug);
    if (!note) return c.json({ error: { code: 'not_found' } }, 404);
    if (note.visibility === 'private') {
      return c.json({ error: { code: 'not_found' } }, 404);
    }

    const tmpl = pickTemplate(c.req.query('template'), deps.config);
    const updated = (note.updated_at ?? '').replace(/[^A-Za-z0-9]/g, '');
    const cachePath = resolve(deps.cacheDir, `${tmpl}_${slug}_${updated}.png`);

    if (existsSync(cachePath)) {
      const buf = await readFile(cachePath);
      return pngResponse(buf, true);
    }

    const data = noteToOg(note, deps.config);
    const buf = await renderOg(tmpl, data);
    await mkdir(deps.cacheDir, { recursive: true });
    await writeFile(cachePath, buf);
    return pngResponse(buf, true);
  });

  // 后台预览:/api/admin/og/preview?slug=&template=&overrides=<json>
  app.get('/api/admin/og/preview', adminMw, async (c) => {
    const slug = c.req.query('slug');
    if (!slug) {
      return c.json({ error: { code: 'validation_failed', field: 'slug' } }, 400);
    }
    const note = noteRepo.getBySlug(slug);
    if (!note) return c.json({ error: { code: 'not_found' } }, 404);

    const tmpl = pickTemplate(c.req.query('template'), deps.config);
    const overridesRaw = c.req.query('overrides');
    let overrides: Partial<OgData> = {};
    if (overridesRaw) {
      try {
        overrides = JSON.parse(overridesRaw) as Partial<OgData>;
      } catch {
        return c.json(
          { error: { code: 'validation_failed', field: 'overrides' } },
          400,
        );
      }
    }
    const data = { ...noteToOg(note, deps.config), ...overrides };
    const buf = await renderOg(tmpl, data);
    return pngResponse(buf, false);
  });
}

function pngResponse(buf: Buffer, cache: boolean): Response {
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      'content-type': 'image/png',
      'cache-control': cache
        ? 'public, max-age=86400, stale-while-revalidate=604800'
        : 'no-store',
    },
  });
}

function pickTemplate(qp: string | undefined, cfg: SiteConfig): OgTemplate {
  if (qp && (OG_TEMPLATES as readonly string[]).includes(qp)) return qp as OgTemplate;
  const def = cfg.seo?.default_og_template;
  if (def && (OG_TEMPLATES as readonly string[]).includes(def)) return def as OgTemplate;
  return 'minimal';
}

function noteToOg(
  note: { title: string; summary: string | null; updated_at: string; reading_minutes: number },
  cfg: SiteConfig,
): OgData {
  const out: OgData = {
    title: note.title,
    site: cfg.site?.url?.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    date: note.updated_at?.slice(0, 10),
    reading: `${note.reading_minutes} min`,
    author: cfg.author?.name,
  };
  if (note.summary) out.description = note.summary;
  return out;
}

export function ogCachePath(
  cacheDir: string,
  tmpl: OgTemplate,
  slug: string,
  updated: string,
): string {
  const u = updated.replace(/[^A-Za-z0-9]/g, '');
  return join(resolve(cacheDir), `${tmpl}_${slug}_${u}.png`);
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
