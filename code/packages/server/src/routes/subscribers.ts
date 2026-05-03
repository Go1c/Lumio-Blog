import { Hono } from 'hono';
import type { Database } from 'better-sqlite3';
import { SubscribersRepo } from '@opennote/db';
import { AuthService } from '../auth.js';
import { TokenService } from '../tokens.js';
import { AuditLog } from '../audit.js';
import { actorMw, clientIp, hashIp, RateLimiter } from '../route-utils.js';

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
  // 公开端点都要限流;两个端点共用同一个 limiter 桶,防止被绕过。
  const publicLimiter = new RateLimiter(5, 60_000);

  // ---------------- public ----------------
  app.post('/api/subscribe', async (c) => {
    const ip = clientIp(c);
    if (!publicLimiter.allow(ip)) return c.json({ error: { code: 'rate_limited' } }, 429);
    const body = (await c.req.json().catch(() => null)) as { email?: string } | null;
    const email = body?.email?.trim().toLowerCase();
    if (!email || !/.+@.+\..+/.test(email)) {
      return c.json({ error: { code: 'validation_failed', field: 'email' } }, 400);
    }
    const r = repo.subscribe({ email, source: 'web', ip_hash: hashIp(ip, salt) });
    return c.json({ ok: true, already: r.already });
  });

  app.post('/api/unsubscribe', async (c) => {
    const ip = clientIp(c);
    if (!publicLimiter.allow(ip)) return c.json({ error: { code: 'rate_limited' } }, 429);
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
