import { describe, expect, it } from 'vitest';

describe('admin hash routing', () => {
  it('keeps the route path when dashboard links include query params', async () => {
    const app = await import('./app.js') as unknown as {
      parseRouteHash?: (hash: string) => { route: { name: string }; query: URLSearchParams };
    };

    expect(app.parseRouteHash?.('#/notes?short_link_idle=1').route.name).toBe('list');
    expect(app.parseRouteHash?.('#/audit?action_prefix=sync.').route.name).toBe('audit');
    expect(app.parseRouteHash?.('#/audit?action_prefix=sync.').query.get('action_prefix')).toBe('sync.');
  });
});
