import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { registerPublicRedirects } from './public-redirects.js';

describe('registerPublicRedirects', () => {
  it('sends /home to the homepage with 301', async () => {
    const app = new Hono();
    registerPublicRedirects(app);

    const res = await app.request('/home');
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('/');
  });

  it('also redirects the trailing-slash variant', async () => {
    const app = new Hono();
    registerPublicRedirects(app);

    const res = await app.request('/home/');
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('/');
  });
});
