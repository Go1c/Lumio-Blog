import { createHash } from 'node:crypto';
import { Hono, type Context, type MiddlewareHandler, type Next } from 'hono';
import type { Database } from 'better-sqlite3';
import { CommentsRepo, NoteRepo, type CommentStatus } from '@opennote/db';
import { AuthService, getSessionToken } from '../auth.js';
import { TokenService, requireToken } from '../tokens.js';
import { AuditLog } from '../audit.js';

export interface CommentsDeps {
  db: Database;
  ipSalt?: string;
}

const VALID_STATUS: CommentStatus[] = ['pending', 'approved', 'rejected', 'spam'];
const MAX_AUTHOR = 80;
const MAX_BODY = 4000;
const MAX_WEBSITE = 240;

export function register(app: Hono, deps: CommentsDeps): void {
  const repo = new CommentsRepo(deps.db);
  const noteRepo = new NoteRepo(deps.db);
  const auth = new AuthService(deps.db);
  const tokens = new TokenService(deps.db);
  const audit = new AuditLog(deps.db);
  const salt = deps.ipSalt ?? process.env.OPENNOTE_COMMENTS_SALT ?? 'opennote-default-salt';
  const limiter = new RateLimiter(10, 60_000);

  // ---------------- public ----------------
  // 公开列表(仅 approved)
  app.get('/api/posts/:slug/comments', (c) => {
    const slug = c.req.param('slug');
    const note = noteRepo.getBySlug(slug);
    if (!note || note.visibility === 'private') {
      return c.json({ error: { code: 'not_found' } }, 404);
    }
    return c.json({ comments: repo.publicForSlug(slug) });
  });

  // 公开提交
  app.post('/api/posts/:slug/comments', async (c) => {
    const slug = c.req.param('slug');
    const note = noteRepo.getBySlug(slug);
    if (!note || note.visibility === 'private') {
      return c.json({ error: { code: 'not_found' } }, 404);
    }
    const ip = clientIp(c);
    if (!limiter.allow(ip)) {
      return c.json({ error: { code: 'rate_limited' } }, 429);
    }
    const body = (await c.req.json().catch(() => null)) as
      | { author?: string; email?: string; website?: string; body?: string }
      | null;
    if (!body) return c.json({ error: { code: 'validation_failed' } }, 400);

    const author = (body.author ?? '').trim().slice(0, MAX_AUTHOR);
    const text = (body.body ?? '').trim().slice(0, MAX_BODY);
    if (!author) return c.json({ error: { code: 'validation_failed', field: 'author' } }, 400);
    if (!text) return c.json({ error: { code: 'validation_failed', field: 'body' } }, 400);
    const email = body.email?.trim().slice(0, 240);
    if (email && !/.+@.+\..+/.test(email)) {
      return c.json({ error: { code: 'validation_failed', field: 'email' } }, 400);
    }
    const website = body.website?.trim().slice(0, MAX_WEBSITE);

    const row = repo.insert({
      slug,
      author,
      email: email || null,
      website: website || null,
      body: text,
      ip_hash: hashIp(ip, salt),
      ua: c.req.header('user-agent')?.slice(0, 256) ?? null,
    });
    return c.json({ ok: true, id: row.id, status: row.status });
  });

  // ---------------- admin ----------------
  const adm = new Hono();
  adm.use('*', actorMw(auth, tokens, 'admin'));

  adm.get('/', (c) => {
    const status = c.req.query('status') as CommentStatus | undefined;
    const slug = c.req.query('slug') ?? undefined;
    const limit = Math.min(Number(c.req.query('limit') ?? 100), 500);
    const opts: Parameters<CommentsRepo['list']>[0] = { limit };
    if (status && VALID_STATUS.includes(status)) opts.status = status;
    if (slug) opts.slug = slug;
    return c.json({
      counts: repo.counts(),
      comments: repo.list(opts),
    });
  });

  adm.patch('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isFinite(id)) return c.json({ error: { code: 'validation_failed' } }, 400);
    const j = (await c.req.json().catch(() => null)) as { status?: CommentStatus } | null;
    if (!j?.status || !VALID_STATUS.includes(j.status)) {
      return c.json({ error: { code: 'validation_failed', field: 'status' } }, 400);
    }
    const before = repo.getById(id);
    if (!before) return c.json({ error: { code: 'not_found' } }, 404);
    repo.setStatus(id, j.status);
    audit.write({
      actor: c.get('actor') ?? 'owner',
      action: 'comment.moderate',
      target: String(id),
      diff: JSON.stringify({ from: before.status, to: j.status }),
    });
    return c.json({ ok: true });
  });

  adm.delete('/:id', (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isFinite(id)) return c.json({ error: { code: 'validation_failed' } }, 400);
    const before = repo.getById(id);
    if (!before) return c.json({ error: { code: 'not_found' } }, 404);
    repo.delete(id);
    audit.write({
      actor: c.get('actor') ?? 'owner',
      action: 'comment.delete',
      target: String(id),
    });
    return c.json({ ok: true });
  });

  app.route('/api/admin/comments', adm);
}

// ---------------------------------------------------------------------
function clientIp(c: Context): string {
  const xf = c.req.header('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  return c.req.header('x-real-ip') ?? '0.0.0.0';
}

function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(`${salt}|${ip}`).digest('hex').slice(0, 32);
}

class RateLimiter {
  private buckets = new Map<string, number[]>();
  constructor(private limit: number, private windowMs: number) {}
  allow(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? [];
    const fresh = bucket.filter((t) => now - t < this.windowMs);
    if (fresh.length >= this.limit) {
      this.buckets.set(key, fresh);
      return false;
    }
    fresh.push(now);
    this.buckets.set(key, fresh);
    if (this.buckets.size > 5000) this.buckets.clear();
    return true;
  }
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
