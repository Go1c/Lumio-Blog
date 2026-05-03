/**
 * WS-E — Webhooks admin routes(增强)
 *
 * 现有 routes.ts 已注册 GET/POST/DELETE /api/admin/webhooks,
 * 这里只补两条:
 *   GET  /api/admin/webhooks/:id/deliveries?limit=
 *   POST /api/admin/webhooks/:id/redeliver/:event_id
 *
 * 鉴权:复用主路由的 actor middleware(cookie session 或 bearer admin token)。
 */
import type { Hono, Context } from 'hono';
import { AuditLog } from '../audit.js';
import { AuthService, getSessionToken } from '../auth.js';
import { TokenService, requireToken } from '../tokens.js';
import { WebhookService } from '../webhooks.js';
import type { RouteDeps } from '../routes.js';

function buildActorMw(deps: RouteDeps) {
  const auth = new AuthService(deps.db);
  const tokens = new TokenService(deps.db);
  return async (c: Context, next: () => Promise<void>) => {
    const cookie = getSessionToken(c);
    if (cookie && auth.isValidSession(cookie)) {
      c.set('actor', 'owner');
      return next();
    }
    return requireToken(tokens, 'admin')(c, async () => {
      c.set('actor', `token:${c.get('tokenScope')}`);
      await next();
    });
  };
}

export function register(app: Hono, deps: RouteDeps): void {
  const audit = new AuditLog(deps.db);
  const hooks = new WebhookService(deps.db);
  hooks.bootResume();
  const actorMw = buildActorMw(deps);

  app.get('/api/admin/webhooks/:id/deliveries', actorMw, (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isFinite(id)) {
      return c.json({ error: { code: 'validation_failed', field: 'id' } }, 400);
    }
    if (!hooks.get(id)) return c.json({ error: { code: 'not_found' } }, 404);
    const limit = Number(c.req.query('limit') ?? 20);
    const deliveries = hooks.listDeliveries(id, Number.isFinite(limit) ? limit : 20);
    return c.json({ deliveries });
  });

  app.post('/api/admin/webhooks/:id/redeliver/:event_id', actorMw, async (c) => {
    const id = Number(c.req.param('id'));
    const eventId = Number(c.req.param('event_id'));
    if (!Number.isFinite(id) || !Number.isFinite(eventId)) {
      return c.json({ error: { code: 'validation_failed' } }, 400);
    }
    if (!hooks.get(id)) return c.json({ error: { code: 'not_found' } }, 404);
    const d = hooks.getDelivery(eventId);
    if (!d || d.webhook_id !== id) {
      return c.json({ error: { code: 'not_found' } }, 404);
    }
    try {
      await hooks.redeliver(eventId);
      audit.write({
        actor: c.get('actor') ?? 'owner',
        action: 'webhook.redeliver',
        target: String(id),
        diff: JSON.stringify({ delivery_id: eventId, event_kind: d.event_kind }),
      });
      return c.json({ ok: true });
    } catch (e) {
      return c.json({ error: { code: 'internal_error', message: (e as Error).message } }, 500);
    }
  });
}
