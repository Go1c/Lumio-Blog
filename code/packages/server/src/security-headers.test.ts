import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { isNoindexPath, securityHeaders } from './security-headers.js';

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
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toMatch(/script-src[^;]*https:\/\/data\.lumio\.games/);
    expect(csp).toMatch(/connect-src[^;]*https:\/\/data\.lumio\.games/);
  });

  it('marks admin and api responses noindex, but leaves public pages indexable', async () => {
    const app = new Hono();
    app.use('*', securityHeaders());
    app.get('*', (c) => c.text('ok'));

    expect((await app.request('/admin/')).headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect((await app.request('/api/notes')).headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect((await app.request('/posts/hello.html')).headers.get('x-robots-tag')).toBeNull();
    // 前缀匹配不能误伤同名开头的公开路径
    expect((await app.request('/administrivia')).headers.get('x-robots-tag')).toBeNull();
  });

  it('serves .md artifacts as text/markdown instead of octet-stream', async () => {
    const app = new Hono();
    app.use('*', securityHeaders());
    // 模拟 serveStatic 对未知扩展名的行为
    app.get('*', (c) => {
      c.header('Content-Type', 'application/octet-stream');
      return c.body('# Title');
    });

    const md = await app.request('/posts/hello.md');
    expect(md.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(await md.text()).toBe('# Title');

    const other = await app.request('/favicon.ico');
    expect(other.headers.get('content-type')).toBe('application/octet-stream');
  });
});

describe('isNoindexPath', () => {
  it('matches the admin and api trees only', () => {
    expect(isNoindexPath('/admin')).toBe(true);
    expect(isNoindexPath('/admin/settings')).toBe(true);
    expect(isNoindexPath('/api')).toBe(true);
    expect(isNoindexPath('/api/track')).toBe(true);
    expect(isNoindexPath('/')).toBe(false);
    expect(isNoindexPath('/apiary')).toBe(false);
    expect(isNoindexPath('/posts/admin.html')).toBe(false);
  });
});
