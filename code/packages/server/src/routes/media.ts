import { createHash } from 'node:crypto';
import { extname, join, relative, sep } from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { Hono, type Context, type MiddlewareHandler, type Next } from 'hono';
import type { Database } from 'better-sqlite3';
import { MediaRepo } from '@opennote/db';
import type { MediaItem } from '@opennote/core';
import type { MediaStore, LocalMediaStore } from '../media-store.js';
import type { EventBus } from '../events.js';
import { AuditLog } from '../audit.js';
import { AuthService, getSessionToken } from '../auth.js';
import { TokenService, requireToken } from '../tokens.js';

export interface MediaDeps {
  db: Database;
  store: MediaStore;
  bus: EventBus;
  /** vault 根目录(FNS 同步进来的笔记 + 附件都在这下面);设了才暴露 /vault 扫描端点 */
  vaultDir?: string;
}

/**
 * 注册 media 路由到主 app(/api/admin/media)。
 * 由主 agent 在 routes.ts 里 import 并 register(app, deps)。
 */
export function register(app: Hono, deps: MediaDeps): MediaRepo {
  const repo = new MediaRepo(deps.db);
  const audit = new AuditLog(deps.db);
  const auth = new AuthService(deps.db);
  const tokens = new TokenService(deps.db);
  const adminMw = actorMw(auth, tokens, 'admin');

  const r = new Hono();
  r.use('*', adminMw);

  // 列表(分页)
  r.get('/', (c) => {
    const cursor = c.req.query('cursor') ?? null;
    const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);
    return c.json(repo.list(cursor, limit));
  });

  // 上传 — multipart 单文件 field "file"
  r.post('/', async (c) => {
    let form: FormData;
    try {
      form = await c.req.formData();
    } catch {
      return c.json(
        { error: { code: 'validation_failed', message: 'expected multipart' } },
        400,
      );
    }
    const file = form.get('file');
    if (!(file instanceof File)) {
      return c.json({ error: { code: 'validation_failed', field: 'file' } }, 400);
    }
    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);
    const sha = createHash('sha256').update(buf).digest('hex');

    // 同 sha256 → 直接复用
    const dup = repo.findBySha256(sha);
    if (dup) return c.json(dup);

    const ext = extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const id = `${sha.slice(0, 16)}${ext}`;
    const filename = file.name || id;
    const mime = (file.type as string) || guessMime(ext);

    const put = await deps.store.put({ id, filename, mime, body: buf });
    const item: MediaItem = {
      id,
      filename,
      mime,
      bytes: put.bytes,
      url: put.url,
      uploaded_at: new Date().toISOString(),
      reference_count: 0,
    };
    repo.insert({
      id,
      filename,
      mime,
      bytes: put.bytes,
      url: put.url,
      uploaded_at: item.uploaded_at,
      sha256: put.sha256,
    });
    audit.write({
      actor: c.get('actor') ?? 'owner',
      action: 'media.upload',
      target: id,
      diff: JSON.stringify({ filename, mime, bytes: put.bytes }),
    });
    deps.bus.emit({
      kind: 'media.uploaded',
      id,
      filename,
      mime,
      bytes: put.bytes,
    });
    return c.json(item);
  });

  // 删除(force=1 时即使有引用也删)
  r.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const m = repo.getById(id);
    if (!m) return c.json({ error: { code: 'not_found' } }, 404);
    const force = c.req.query('force') === '1' || c.req.query('force') === 'true';
    if (m.reference_count > 0 && !force) {
      return c.json(
        {
          error: {
            code: 'conflict',
            message: `still referenced by ${m.reference_count} note(s)`,
          },
        },
        409,
      );
    }
    await deps.store.delete(id).catch(() => undefined);
    repo.delete(id);
    audit.write({
      actor: c.get('actor') ?? 'owner',
      action: 'media.delete',
      target: id,
      diff: JSON.stringify({ force }),
    });
    deps.bus.emit({ kind: 'media.deleted', id });
    return c.json({ ok: true });
  });

  // 引用列表
  r.get('/:id/refs', (c) => {
    const id = c.req.param('id');
    const m = repo.getById(id);
    if (!m) return c.json({ error: { code: 'not_found' } }, 404);
    return c.json({ refs: repo.listRefs(id) });
  });

  // FNS / vault 附件扫描 — 列出 vaultDir 里所有非 .md 文件
  // 这就是 "媒体库链接 FNS 附件库" 的来源:vaultDir 是 FNS 推同步进来的根目录
  r.get('/vault', async (c) => {
    if (!deps.vaultDir) {
      return c.json({ enabled: false, vault: null, items: [] });
    }
    try {
      const items = await scanVaultAttachments(deps.vaultDir, 2000);
      return c.json({
        enabled: true,
        vault: deps.vaultDir,
        items,
      });
    } catch (e) {
      return c.json({ error: { code: 'scan_failed', message: (e as Error).message } }, 500);
    }
  });

  app.route('/api/admin/media', r);
  return repo;
}

interface VaultAttachment {
  rel_path: string;
  filename: string;
  bytes: number;
  mime: string;
  modified_at: string;
}

async function scanVaultAttachments(root: string, max: number): Promise<VaultAttachment[]> {
  const out: VaultAttachment[] = [];
  async function walk(dir: string): Promise<void> {
    if (out.length >= max) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= max) return;
      if (e.name.startsWith('.')) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile()) {
        // 跳过 .md(那是笔记本身)
        if (e.name.toLowerCase().endsWith('.md')) continue;
        const st = await stat(full).catch(() => null);
        if (!st) continue;
        out.push({
          rel_path: relative(root, full).split(sep).join('/'),
          filename: e.name,
          bytes: st.size,
          mime: guessMime(extname(e.name).slice(1)),
          modified_at: st.mtime.toISOString(),
        });
      }
    }
  }
  await walk(root);
  out.sort((a, b) => b.modified_at.localeCompare(a.modified_at));
  return out;
}

/** 注册 LocalMediaStore 的静态文件读出路由(在 prefix 下) */
export function registerLocalMediaStatic(app: Hono, store: LocalMediaStore): void {
  const prefix = store.urlPrefix.replace(/\/$/, '');
  app.get(`${prefix}/:id`, async (c) => {
    const id = c.req.param('id');
    const buf = await store.get(id);
    if (!buf) return c.json({ error: { code: 'not_found' } }, 404);
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        'content-type': guessMimeFromId(id),
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  });
}

// ---------------------------------------------------------------------

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

function guessMime(ext: string): string {
  const e = ext.replace(/^\./, '').toLowerCase();
  switch (e) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mp3': return 'audio/mpeg';
    case 'pdf': return 'application/pdf';
    case 'json': return 'application/json';
    case 'txt': return 'text/plain';
    case 'md': return 'text/markdown';
    default: return 'application/octet-stream';
  }
}

function guessMimeFromId(id: string): string {
  const dot = id.lastIndexOf('.');
  if (dot < 0) return 'application/octet-stream';
  return guessMime(id.slice(dot));
}
