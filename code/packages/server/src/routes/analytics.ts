import { createHash } from 'node:crypto';
import { Hono, type Context, type MiddlewareHandler, type Next } from 'hono';
import type { Database } from 'better-sqlite3';
import {
  AnalyticsRepo,
  type AnalyticsMetric,
} from '@opennote/db';
import type { AnalyticsRange, TrackEvent } from '@opennote/core';
import { AuthService, getSessionToken } from '../auth.js';
import { TokenService, requireToken } from '../tokens.js';

export interface AnalyticsDeps {
  db: Database;
  /** salt for IP hashing — 不要和别处复用 */
  ipSalt?: string;
  /** disable POST /api/track(若用户用 Plausible 等外部) */
  trackingDisabled?: boolean;
}

const VALID_RANGES: ReadonlyArray<AnalyticsRange> = ['7d', '30d', '90d', 'all'];
const VALID_EVENTS: ReadonlyArray<TrackEvent['event']> = ['view', 'dwell', 'scroll', 'click'];
const VALID_METRICS: ReadonlyArray<AnalyticsMetric> = ['views', 'unique_visitors', 'avg_dwell'];

/**
 * 注册 analytics 路由到主 app。
 * 由主 agent 在 routes.ts 里调用 register(app, deps)。
 */
export function register(app: Hono, deps: AnalyticsDeps): void {
  const repo = new AnalyticsRepo(deps.db);
  const auth = new AuthService(deps.db);
  const tokens = new TokenService(deps.db);
  const salt = deps.ipSalt ?? process.env.OPENNOTE_ANALYTICS_SALT ?? 'opennote-default-salt';
  const limiter = new RateLimiter(60, 60_000);

  // ----- public POST /api/track -----
  app.post('/api/track', async (c) => {
    if (deps.trackingDisabled) {
      return c.json({ error: { code: 'forbidden', message: 'tracking disabled' } }, 403);
    }
    const ip = clientIp(c);
    if (!limiter.allow(ip)) {
      return c.json({ error: { code: 'rate_limited' } }, 429);
    }
    const body = (await c.req.json().catch(() => null)) as Partial<TrackEvent> | null;
    if (!body || typeof body.slug !== 'string' || !body.slug) {
      return c.json({ error: { code: 'validation_failed', field: 'slug' } }, 400);
    }
    if (!body.event || !VALID_EVENTS.includes(body.event)) {
      return c.json({ error: { code: 'validation_failed', field: 'event' } }, 400);
    }
    const meta = body.meta && typeof body.meta === 'object' ? body.meta : undefined;
    const dwell = pickInt(meta?.['dwell_seconds']);
    const scrollPct = pickInt(meta?.['scroll_pct']);
    const ua = c.req.header('user-agent')?.slice(0, 256);
    const ref = typeof meta?.['referrer'] === 'string'
      ? String(meta['referrer']).slice(0, 256)
      : c.req.header('referer')?.slice(0, 256);

    repo.ingestEvent({
      slug: body.slug,
      event: body.event,
      ts: new Date().toISOString(),
      ip_hash: hashIp(ip, salt),
      ...(ua ? { ua } : {}),
      ...(ref ? { referrer: ref } : {}),
      ...(dwell !== undefined ? { dwell_seconds: dwell } : {}),
      ...(scrollPct !== undefined ? { scroll_pct: scrollPct } : {}),
      ...(meta ? { meta } : {}),
    });
    return c.json({ ok: true });
  });

  // ----- admin endpoints -----
  const admin = new Hono();
  admin.use('*', actorMw(auth, tokens, 'admin'));

  admin.get('/overview', (c) => {
    const range = parseRange(c.req.query('range'));
    if (!range) return c.json({ error: { code: 'validation_failed', field: 'range' } }, 400);
    return c.json(repo.overview(range));
  });

  admin.get('/timeseries', (c) => {
    const range = parseRange(c.req.query('range'));
    if (!range) return c.json({ error: { code: 'validation_failed', field: 'range' } }, 400);
    const metric = (c.req.query('metric') ?? 'views') as AnalyticsMetric;
    if (!VALID_METRICS.includes(metric)) {
      return c.json({ error: { code: 'validation_failed', field: 'metric' } }, 400);
    }
    return c.json({ range, metric, points: repo.timeseries(range, metric) });
  });

  admin.get('/posts/:slug', (c) => {
    const slug = c.req.param('slug');
    if (!slug) return c.json({ error: { code: 'validation_failed', field: 'slug' } }, 400);
    return c.json(repo.article(slug));
  });

  app.route('/api/admin/analytics', admin);
}

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

function parseRange(v: string | undefined): AnalyticsRange | null {
  if (!v) return '7d';
  return VALID_RANGES.includes(v as AnalyticsRange) ? (v as AnalyticsRange) : null;
}

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

function pickInt(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.floor(v));
  if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
  return undefined;
}

/**
 * 简单 LRU 滑窗 rate limiter。
 * 同 routes.ts 的 actorMw 思路;此处不复用以保持模块独立。
 */
class RateLimiter {
  private buckets = new Map<string, number[]>();
  constructor(private limit: number, private windowMs: number) {}

  allow(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? [];
    const fresh = bucket.filter((t) => now - t < this.windowMs);
    if (fresh.length >= this.limit) {
      this.buckets.set(key, fresh);
      this.evictIfLarge();
      return false;
    }
    fresh.push(now);
    this.buckets.set(key, fresh);
    this.evictIfLarge();
    return true;
  }

  private evictIfLarge(): void {
    if (this.buckets.size > 5000) {
      // 简单粗暴:全清。够用
      this.buckets.clear();
    }
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
