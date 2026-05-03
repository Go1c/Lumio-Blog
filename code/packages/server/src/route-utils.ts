import { createHash } from 'node:crypto';
import type { Context, MiddlewareHandler, Next } from 'hono';
import { AuthService, getSessionToken } from './auth.js';
import { TokenService, requireToken } from './tokens.js';

/**
 * 公共的 admin / write / read 守卫:cookie session 优先,退化到 bearer token。
 * 通过后把 actor 写到 ctx,后续路由可以 c.get('actor') 拿审计字段。
 */
export function actorMw(
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

/** 取客户端 IP(优先 X-Forwarded-For 第一个,再 X-Real-IP)。 */
export function clientIp(c: Context): string {
  const xf = c.req.header('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  return c.req.header('x-real-ip') ?? '0.0.0.0';
}

/** sha256(salt|ip),取前 32 字符。用于公开提交场景的隐私友好限流。 */
export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(`${salt}|${ip}`).digest('hex').slice(0, 32);
}

/**
 * 简单 LRU 滑窗 rate limiter — IP 维度,内存,不持久化。
 * 多实例部署 → 每实例独立计数,够用即可。
 */
export class RateLimiter {
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
    if (this.buckets.size > 5000) this.buckets.clear();
  }
}

/**
 * 把 query string 里的 limit 解析为 [1, max] 之间的有限整数,失败回退到 fallback。
 * 防御 NaN / 负数 / 超大值传到 SQL LIMIT。
 */
export function parseLimit(raw: string | undefined, fallback: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  if (i < 1) return fallback;
  return Math.min(i, max);
}
