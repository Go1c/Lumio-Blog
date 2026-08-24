import type { Hono } from 'hono';

/** 公开 301。sitemap 不含 /home，但爬虫仍会打这条历史路径。 */
export function registerPublicRedirects(app: Hono): void {
  app.get('/home', (c) => c.redirect('/', 301));
  app.get('/home/', (c) => c.redirect('/', 301));
}
