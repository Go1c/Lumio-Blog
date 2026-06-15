import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('admin hash routing', () => {
  it('keeps the route path when dashboard links include query params', async () => {
    const app = await import('./app.js') as unknown as {
      parseRouteHash?: (hash: string) => { route: { name: string }; query: URLSearchParams };
      buildAdminMenu?: (counts?: { notes?: number; columns?: number; tags?: number; pendingComments?: number; ads?: number }) => Array<{
        label: string;
        items: Array<{ label: string; href?: string; badge?: string | number }>;
      }>;
      ADMIN_COUNTS_REFRESH_EVENT?: string;
      requestAdminMenuCountsRefresh?: (target?: EventTarget) => void;
    };

    expect(app.parseRouteHash?.('#/vault?short_link_idle=1').route.name).toBe('list');
    expect(app.parseRouteHash?.('#/notes?short_link_idle=1').route.name).toBe('list');
    expect(app.parseRouteHash?.('#/vault/Rendering/URP').route).toMatchObject({
      name: 'list',
      folderPath: 'Rendering/URP',
    });
    expect(app.parseRouteHash?.('#/notes/my-note').route).toMatchObject({
      name: 'detail',
      slug: 'my-note',
    });
    expect(app.parseRouteHash?.('#/ads').route.name).toBe('ads');
    expect(app.parseRouteHash?.('#/tokens').route.name).toBe('tokens');
    expect(app.parseRouteHash?.('#/webhooks').route.name).toBe('webhooks');
    expect(app.parseRouteHash?.('#/audit?action_prefix=sync.').route.name).toBe('audit');
    expect(app.parseRouteHash?.('#/audit?action_prefix=sync.').query.get('action_prefix')).toBe('sync.');
    expect(app.parseRouteHash?.('#/og').route.name).toBe('og');
    expect(app.parseRouteHash?.('#/backup').route.name).toBe('backup');
    expect(app.parseRouteHash?.('#/config-docs').route.name).toBe('config-docs');
    expect(app.parseRouteHash?.('#/subscriptions').route.name).toBe('subscriptions');
    expect(app.parseRouteHash?.('#/columns').route.name).toBe('columns');

    const coreDesignRoutes = new Map([
      ['#/dashboard', 'dashboard'],
      ['#/vault', 'list'],
      ['#/note/my-note', 'detail'],
      ['#/columns', 'columns'],
      ['#/tags', 'tags'],
      ['#/comments', 'comments'],
      ['#/ads', 'ads'],
    ]);
    for (const [hash, routeName] of coreDesignRoutes) {
      expect(app.parseRouteHash?.(hash).route.name).toBe(routeName);
    }

    const implementedAdminRoutes = new Map([
      ['#/analytics', 'analytics-overview'],
      ['#/media', 'media'],
      ['#/subscriptions', 'subscriptions'],
      ['#/og', 'og'],
      ['#/tokens', 'tokens'],
      ['#/webhooks', 'webhooks'],
      ['#/audit', 'audit'],
      ['#/backup', 'backup'],
      ['#/config-docs', 'config-docs'],
      ['#/settings/author', 'settings'],
    ]);
    for (const [hash, routeName] of implementedAdminRoutes) {
      expect(app.parseRouteHash?.(hash).route.name).toBe(routeName);
    }

    const menu = app.buildAdminMenu?.({ notes: 9, columns: 3, tags: 5, pendingComments: 2, ads: 4 });
    const allItems = menu?.flatMap((group) => group.items) ?? [];
    const menuTargets = new Map([
      ['仪表盘', '#/'],
      ['笔记库', '#/vault'],
      ['专栏管理', '#/columns'],
      ['标签管理', '#/tags'],
      ['评论审核', '#/comments'],
      ['广告位', '#/ads'],
      ['数据统计', '#/analytics'],
      ['媒体库', '#/media'],
      ['订阅管理', '#/subscriptions'],
      ['OG 生成器', '#/og'],
      ['系统设置', '#/settings'],
      ['API Tokens', '#/tokens'],
      ['Webhooks', '#/webhooks'],
      ['审计日志', '#/audit'],
      ['备份导出', '#/backup'],
      ['配置文档', '#/config-docs'],
    ]);
    for (const [label, href] of menuTargets) {
      expect(allItems.find((item) => item.label === label)?.href).toBe(href);
    }

    expect(allItems.find((item) => item.label === '笔记库')).toMatchObject({ href: '#/vault', badge: 9 });
    expect(allItems.find((item) => item.label === '广告位')).toMatchObject({ href: '#/ads', badge: 4 });
    expect(allItems.find((item) => item.label === '媒体库')?.href).toBe('#/media');
    expect(allItems.find((item) => item.label === '专栏管理')?.badge).toBe(3);
    expect(allItems.find((item) => item.label === '订阅管理')?.href).toBe('#/subscriptions');
    expect(allItems.find((item) => item.label === 'API Tokens')?.href).toBe('#/tokens');
    expect(allItems.find((item) => item.label === 'Webhooks')?.href).toBe('#/webhooks');
    expect(allItems.find((item) => item.label === '审计日志')?.href).toBe('#/audit');
    expect(allItems.find((item) => item.label === 'OG 生成器')?.href).toBe('#/og');
    expect(allItems.find((item) => item.label === '备份导出')?.href).toBe('#/backup');
    expect(allItems.find((item) => item.label === '配置文档')?.href).toBe('#/config-docs');
  });

  it('exposes an event bridge for keeping sidebar badges in sync after page actions', async () => {
    const app = await import('./app.js') as unknown as {
      ADMIN_COUNTS_REFRESH_EVENT?: string;
      requestAdminMenuCountsRefresh?: (target?: EventTarget) => void;
    };
    const source = readFileSync(new URL('./app.tsx', import.meta.url), 'utf-8');
    const target = new EventTarget();
    let fired = 0;

    expect(app.ADMIN_COUNTS_REFRESH_EVENT).toBe('opennote:admin-counts-refresh');
    target.addEventListener(app.ADMIN_COUNTS_REFRESH_EVENT!, () => {
      fired += 1;
    });
    app.requestAdminMenuCountsRefresh?.(target);

    expect(fired).toBe(1);
    expect(source).toContain('window.addEventListener(ADMIN_COUNTS_REFRESH_EVENT');
    expect(source).toContain('refreshMenuCounts');
  });
});
