import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { register as registerNewsletter } from '../src/routes/newsletter.js';

let app: Hono;

beforeEach(() => {
  app = new Hono();
});

afterEach(() => {
  delete process.env.BUTTONDOWN_API_KEY;
  vi.restoreAllMocks();
});

describe('Newsletter routes — disabled', () => {
  it('没配 BUTTONDOWN_API_KEY → /subscribe 返回 503 newsletter_disabled', async () => {
    registerNewsletter(app, {});
    const r = await app.request('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'foo@bar.com' }),
    });
    expect(r.status).toBe(503);
    const j = (await r.json()) as { error: { code: string } };
    expect(j.error.code).toBe('newsletter_disabled');
  });

  it('没配 → /recent 也返回 503', async () => {
    registerNewsletter(app, {});
    const r = await app.request('/api/newsletter/recent');
    expect(r.status).toBe(503);
  });
});

describe('Newsletter routes — happy path', () => {
  it('subscribe 调 buttondown 并返回 ok', async () => {
    const fakeFetch = vi.fn(async (_url, _init) => {
      return new Response(null, { status: 201 });
    }) as unknown as typeof fetch;
    registerNewsletter(app, { apiKey: 'fake-key', fetchImpl: fakeFetch });

    const r = await app.request('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.co' }),
    });
    expect(r.status).toBe(200);
    const j = (await r.json()) as { ok: boolean };
    expect(j.ok).toBe(true);
    expect(fakeFetch).toHaveBeenCalledOnce();
  });

  it('subscribe 缺 email → 400 validation_failed', async () => {
    registerNewsletter(app, { apiKey: 'fake' });
    const r = await app.request('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(r.status).toBe(400);
    const j = (await r.json()) as { error: { code: string; field?: string } };
    expect(j.error.code).toBe('validation_failed');
    expect(j.error.field).toBe('email');
  });

  it('recent 拉 buttondown 并返回 issues', async () => {
    const fakeFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                id: 'x1',
                subject: 'Issue 1',
                publish_date: '2025-04-01',
                absolute_url: 'https://example/x1',
                description: 'short desc',
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;
    registerNewsletter(app, { apiKey: 'fake', fetchImpl: fakeFetch });

    const r = await app.request('/api/newsletter/recent?limit=3');
    expect(r.status).toBe(200);
    const j = (await r.json()) as { issues: { id: string; subject: string }[] };
    expect(j.issues).toHaveLength(1);
    expect(j.issues[0]?.id).toBe('x1');
  });
});
