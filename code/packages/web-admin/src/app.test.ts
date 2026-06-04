import { describe, expect, it } from 'vitest';

describe('admin hash routing', () => {
  it('keeps the route path when dashboard links include query params', async () => {
    const app = await import('./app.js') as unknown as {
      parseRouteHash?: (hash: string) => { route: { name: string }; query: URLSearchParams };
      buildAdminMenu?: (counts?: { notes?: number; columns?: number; tags?: number; pendingComments?: number }) => Array<{
        label: string;
        items: Array<{ label: string; href?: string; badge?: string | number }>;
      }>;
    };

    expect(app.parseRouteHash?.('#/notes?short_link_idle=1').route.name).toBe('list');
    expect(app.parseRouteHash?.('#/audit?action_prefix=sync.').route.name).toBe('audit');
    expect(app.parseRouteHash?.('#/audit?action_prefix=sync.').query.get('action_prefix')).toBe('sync.');
    expect(app.parseRouteHash?.('#/columns').route.name).toBe('columns');

    const menu = app.buildAdminMenu?.({ notes: 9, columns: 3, tags: 5, pendingComments: 2 });
    const allItems = menu?.flatMap((group) => group.items) ?? [];
    expect(allItems.find((item) => item.label === '广告位')).toBeUndefined();
    expect(allItems.find((item) => item.label === '媒体库')?.href).toBe('#/media');
    expect(allItems.find((item) => item.label === '专栏管理')?.badge).toBe(3);
  });
});
