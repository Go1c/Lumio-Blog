import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { register } from './newsletter.js';

describe('newsletter routes', () => {
  it('accepts the public form POST shape used by no-JS newsletter forms', async () => {
    const app = new Hono();
    let captured = '';
    register(app, {
      localFallback: async (email) => {
        captured = email;
        return { already: false };
      },
    });

    const res = await app.request('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: 'reader@example.com' }).toString(),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, already: false, source: 'local' });
    expect(captured).toBe('reader@example.com');
  });
});
