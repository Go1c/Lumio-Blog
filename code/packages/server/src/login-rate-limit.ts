interface LoginRateLimiterOptions {
  maxFailures?: number;
  windowMs?: number;
  lockoutMs?: number;
  now?: () => number;
}

interface LoginBucket {
  failures: number;
  firstFailureAt: number;
  blockedUntil: number;
}

export interface LoginRateLimitResult {
  limited: boolean;
  retryAfterMs: number;
}

export class LoginRateLimiter {
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private readonly lockoutMs: number;
  private readonly now: () => number;
  private readonly buckets = new Map<string, LoginBucket>();

  constructor(opts: LoginRateLimiterOptions = {}) {
    this.maxFailures = opts.maxFailures ?? 5;
    this.windowMs = opts.windowMs ?? 10 * 60_000;
    this.lockoutMs = opts.lockoutMs ?? 10 * 60_000;
    this.now = opts.now ?? Date.now;
  }

  check(key: string): LoginRateLimitResult {
    const bucket = this.buckets.get(key);
    if (!bucket) return { limited: false, retryAfterMs: 0 };

    const now = this.now();
    if (bucket.blockedUntil > now) {
      return { limited: true, retryAfterMs: bucket.blockedUntil - now };
    }
    if (now - bucket.firstFailureAt > this.windowMs) {
      this.buckets.delete(key);
    }
    return { limited: false, retryAfterMs: 0 };
  }

  recordFailure(key: string): LoginRateLimitResult {
    const now = this.now();
    const existing = this.buckets.get(key);
    const bucket =
      existing && now - existing.firstFailureAt <= this.windowMs
        ? existing
        : { failures: 0, firstFailureAt: now, blockedUntil: 0 };

    bucket.failures += 1;
    if (bucket.failures >= this.maxFailures) {
      bucket.blockedUntil = now + this.lockoutMs;
    }
    this.buckets.set(key, bucket);
    return this.check(key);
  }

  recordSuccess(key: string): void {
    this.buckets.delete(key);
  }
}

export function requestIp(getHeader: (name: string) => string | null | undefined): string {
  const cf = getHeader('cf-connecting-ip')?.trim();
  if (cf) return cf;
  const forwarded = getHeader('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  return getHeader('x-real-ip')?.trim() || 'unknown';
}
