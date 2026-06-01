import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { securityHeaders } from './security-headers.js';

describe('securityHeaders', () => {
  it('sets baseline browser security headers without blocking the app response', async () => {
    const app = new Hono();
    app.use('*', securityHeaders());
    app.get('/admin', (c) => c.text('ok'));

    const res = await app.request('/admin');

    expect(await res.text()).toBe('ok');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('strict-transport-security')).toContain('max-age=');
    expect(res.headers.get('permissions-policy')).toContain('camera=()');
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  });
});
