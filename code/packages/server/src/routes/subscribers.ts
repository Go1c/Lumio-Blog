import { createHash } from 'node:crypto';
import { Hono, type Context, type MiddlewareHandler, type Next } from 'hono';
import type { Database } from 'better-sqlite3';
import { SubscribersRepo } from '@opennote/db';
import { AuthService, getSessionToken } from '../auth.js';
import { TokenService, requireToken } from '../tokens.js';
import { AuditLog } from '../audit.js';

export interface SubscribersDeps {
  db: Database;
  ipSalt?: string;
}

export function register(app: Hono, deps: SubscribersDeps): void {
  const repo = new SubscribersRepo(deps.db);
  const auth = new AuthService(deps.db);
  const tokens = new TokenService(deps.db);
  const audit = new AuditLog(deps.db);
  const salt = deps.ipSalt ?? process.env.OPENNOTE_SUBSCRIBERS_SALT ?? 'opennote-default-salt';
  const limiter = new RateLimiter(5, 60_000);

  // ---------------- public ----------------
  // 公开订阅(本地;Buttondown 走 /api/newsletter/subscribe)
  app.post('/api/subscribe', async (c) => {
    const ip = clientIp(c);
    if (!limiter.allow(ip)) return c.json({ error: { code: 'rate_limited' } }, 429);
    const body = (await c.req.json().catch(() => null)) as { email?: string } | null;
    const email = body?.email?.trim().toLowerCase();
    if (!email || !/.+@.+\..+/.test(email)) {
      return c.json({ error: { code: 'validation_failed', field: 'email' } }, 400);
    }
    const r = repo.subscribe({ email, source: 'web', ip_hash: hashIp(ip, salt) });
    return c.json({ ok: true, already: r.already });
  });

  app.post('/api/unsubscribe', async (c) => {
    const body = (await c.req.json().catch(() => null)) as { email?: string } | null;
    const email = body?.email?.trim().toLowerCase();
    if (!email) return c.json({ error: { code: 'validation_failed', field: 'email' } }, 400);
    repo.unsubscribe(email);
    return c.json({ ok: true });
  });

  // ---------------- admin ----------------
  const adm = new Hono();
  adm.use('*', actorMw(auth, tokens, 'admin'));

  adm.get('/', (c) => {
    const activeOnly = c.req.query('active') === '1';
    return c.json({
      counts: repo.counts(),
      subscribers: repo.list({ activeOnly }),
    });
  });

  adm.post('/', async (c) => {
    const body = (await c.req.json().catch(() => null)) as { email?: string; source?: string } | null;
    const email = body?.email?.trim().toLowerCase();
    if (!email || !/.+@.+\..+/.test(email)) {
      return c.json({ error: { code: 'validation_failed', field: 'email' } }, 400);
    }
    const r = repo.subscribe({ email, source: body?.source ?? 'admin' });
    audit.write({
      actor: c.get('actor') ?? 'owner',
      action: 'subscriber.add',
      target: email,
    });
    return c.json({ ok: true, already: r.already });
  });

  adm.delete('/:email', (c) => {
    const email = decodeURIComponent(c.req.param('email')).toLowerCase();
    repo.delete(email);
    audit.write({
      actor: c.get('actor') ?? 'owner',
      action: 'subscriber.delete',
      target: email,
    });
    return c.json({ ok: true });
  });

  adm.post('/:email/unsubscribe', (c) => {
    const email = decodeURIComponent(c.req.param('email')).toLowerCase();
    repo.unsubscribe(email);
    audit.write({
      actor: c.get('actor') ?? 'owner',
      action: 'subscriber.unsubscribe',
      target: email,
    });
    return c.json({ ok: true });
  });

  app.route('/api/admin/subscribers', adm);
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
