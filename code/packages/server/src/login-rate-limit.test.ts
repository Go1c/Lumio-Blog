import { describe, expect, it } from 'vitest';
import { LoginRateLimiter, requestIp } from './login-rate-limit.js';

describe('LoginRateLimiter', () => {
  it('blocks repeated failures for the same client and clears on success', () => {
    let now = 1_000;
    const limiter = new LoginRateLimiter({
      maxFailures: 3,
      windowMs: 60_000,
      lockoutMs: 120_000,
      now: () => now,
    });

    expect(limiter.check('203.0.113.10').limited).toBe(false);
    limiter.recordFailure('203.0.113.10');
    limiter.recordFailure('203.0.113.10');
    expect(limiter.check('203.0.113.10').limited).toBe(false);

    limiter.recordFailure('203.0.113.10');
    expect(limiter.check('203.0.113.10')).toMatchObject({ limited: true });
    expect(limiter.check('198.51.100.5').limited).toBe(false);

    now += 30_000;
    expect(limiter.check('203.0.113.10').retryAfterMs).toBeGreaterThan(0);
    limiter.recordSuccess('203.0.113.10');
    expect(limiter.check('203.0.113.10').limited).toBe(false);
  });

  it('uses proxy headers consistently for rate limit keys', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.9, 10.0.0.1',
      'x-real-ip': '198.51.100.2',
    });

    expect(requestIp((name) => headers.get(name))).toBe('203.0.113.9');
  });
});
