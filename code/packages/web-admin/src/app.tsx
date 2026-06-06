import { useEffect, useMemo, useState } from 'preact/hooks';
import { AdminShell, type AdminBreadcrumb, type AdminMenuGroup } from '@opennote/ui';
import { api, type NoteSummary } from './api.js';
import { Login } from './pages/login.js';
import { Dashboard } from './pages/dashboard.js';
import { NoteList } from './pages/note-list.js';
import { ColumnsPage, groupNotesByColumn } from './pages/columns.js';
import { NoteDetailPage } from './pages/note-detail.js';
import { NoteAnalyticsPage } from './pages/note-analytics.js';
import { TokensPage } from './pages/tokens.js';
import { WebhooksPage } from './pages/webhooks.js';
import { SettingsPage, SETTINGS_SECTIONS, type SettingsSectionId } from './pages/settings.js';
import { AuditPage } from './pages/audit.js';
import { MediaPage } from './pages/media.js';
import { OgPage } from './pages/og.js';
import { BackupPage } from './pages/backup.js';
import { ConfigDocsPage } from './pages/config-docs.js';
import { TagsPage } from './pages/tags.js';
import { CommentsPage } from './pages/comments.js';
import { SubscriptionsPage } from './pages/subscriptions.js';
import { AnalyticsOverviewPage } from './pages/analytics-overview.js';
import { AdsPage } from './pages/ads.js';

type Route =
  | { name: 'dashboard' }
  | { name: 'list'; shortLinkIdle?: boolean }
  | { name: 'columns' }
  | { name: 'detail'; slug: string }
  | { name: 'analytics'; slug: string }
  | { name: 'ads' }
  | { name: 'tokens' }
  | { name: 'webhooks' }
  | { name: 'settings'; section: SettingsSectionId }
  | { name: 'audit'; actionPrefix?: string }
  | { name: 'media' }
  | { name: 'og' }
  | { name: 'backup' }
  | { name: 'config-docs' }
  | { name: 'tags'; tag?: string }
  | { name: 'comments' }
  | { name: 'subscriptions' }
  | { name: 'analytics-overview' };

export interface ParsedRoute {
  route: Route;
  query: URLSearchParams;
}

export function parseRouteHash(rawHash: string): ParsedRoute {
  const normalized = rawHash.replace(/^#\/?/, '');
  const [hash = '', queryString = ''] = normalized.split('?');
  const query = new URLSearchParams(queryString);

  const route = routeFromHashPath(hash, query);
  return { route, query };
}

function routeFromHashPath(hash: string, query: URLSearchParams): Route {
  if (hash === '' || hash === 'dashboard') return { name: 'dashboard' };
  if (hash === 'vault' || hash === 'notes') return { name: 'list', shortLinkIdle: query.get('short_link_idle') === '1' };
  if (hash === 'columns') return { name: 'columns' };
  if (hash.startsWith('note/') || hash.startsWith('notes/')) {
    const rest = hash.startsWith('note/') ? hash.slice(5) : hash.slice(6);
    // note/<slug>/analytics or legacy notes/<slug>/analytics
    const m = /^([^/]+)\/analytics$/.exec(rest);
    if (m && m[1]) return { name: 'analytics', slug: decodeURIComponent(m[1]) };
    return { name: 'detail', slug: decodeURIComponent(rest) };
  }
  if (hash === 'ads') return { name: 'ads' };
  if (hash === 'tokens') return { name: 'tokens' };
  if (hash === 'webhooks') return { name: 'webhooks' };
  if (hash === 'audit') {
    const actionPrefix = query.get('action_prefix');
    return actionPrefix ? { name: 'audit', actionPrefix } : { name: 'audit' };
  }
  if (hash === 'media') return { name: 'media' };
  if (hash === 'og') return { name: 'og' };
  if (hash === 'backup') return { name: 'backup' };
  if (hash === 'config-docs') return { name: 'config-docs' };
  if (hash === 'tags') return { name: 'tags' };
  if (hash.startsWith('tags/')) return { name: 'tags', tag: decodeURIComponent(hash.slice(5)) };
  if (hash === 'comments') return { name: 'comments' };
  if (hash === 'subscriptions') return { name: 'subscriptions' };
  if (hash === 'analytics') return { name: 'analytics-overview' };
  if (hash === 'settings' || hash.startsWith('settings/')) {
    const section = hash.split('/')[1] ?? 'site';
    const valid = (SETTINGS_SECTIONS as readonly string[]).includes(section)
      ? (section as SettingsSectionId)
      : 'site';
    return { name: 'settings', section: valid };
  }
  return { name: 'dashboard' };
}

function readRoute(): ParsedRoute {
  return parseRouteHash(location.hash);
}

function currentPath(route: Route): string {
  switch (route.name) {
    case 'dashboard': return '#/';
    case 'list': return '#/vault';
    case 'columns': return '#/columns';
    case 'detail': return `#/note/${route.slug}`;
    case 'analytics': return `#/note/${route.slug}/analytics`;
    case 'ads': return '#/ads';
    case 'tokens': return '#/tokens';
    case 'webhooks': return '#/webhooks';
    case 'settings': return `#/settings/${route.section}`;
    case 'audit': return '#/audit';
    case 'media': return '#/media';
    case 'og': return '#/og';
    case 'backup': return '#/backup';
    case 'config-docs': return '#/config-docs';
    case 'tags': return route.tag ? `#/tags/${encodeURIComponent(route.tag)}` : '#/tags';
    case 'comments': return '#/comments';
    case 'subscriptions': return '#/subscriptions';
    case 'analytics-overview': return '#/analytics';
  }
}

function breadcrumbsFor(route: Route): AdminBreadcrumb[] {
  switch (route.name) {
    case 'dashboard':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '概览' }];
    case 'list':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '笔记库' }];
    case 'columns':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '内容' }, { label: '专栏' }];
    case 'detail':
      return [
        { label: 'Lumio Blog', href: '#/' },
        { label: '笔记库', href: '#/vault' },
        { label: route.slug },
      ];
    case 'analytics':
      return [
        { label: 'Lumio Blog', href: '#/' },
        { label: '笔记库', href: '#/vault' },
        { label: route.slug, href: `#/note/${route.slug}` },
        { label: '数据' },
      ];
    case 'ads':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '运营' }, { label: '广告位' }];
    case 'tokens':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '设置' }, { label: 'Tokens' }];
    case 'webhooks':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '设置' }, { label: 'Webhooks' }];
    case 'settings':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '设置', href: '#/settings' }, { label: route.section }];
    case 'audit':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: 'Audit log' }];
    case 'media':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '内容' }, { label: '媒体库' }];
    case 'og':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '设置' }, { label: 'OG 生成器' }];
    case 'backup':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '设置' }, { label: '备份与导出' }];
    case 'config-docs':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '设置' }, { label: '配置文档' }];
    case 'tags':
      return route.tag
        ? [
            { label: 'Lumio Blog', href: '#/' },
            { label: '内容' },
            { label: '标签', href: '#/tags' },
            { label: route.tag },
          ]
        : [{ label: 'Lumio Blog', href: '#/' }, { label: '内容' }, { label: '标签' }];
    case 'comments':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '互动' }, { label: '评论' }];
    case 'subscriptions':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '互动' }, { label: '订阅' }];
    case 'analytics-overview':
      return [{ label: 'Lumio Blog', href: '#/' }, { label: '分析' }, { label: '文章数据' }];
  }
}

interface AdminMenuCounts {
  notes?: number;
  columns?: number;
  tags?: number;
  pendingComments?: number;
  ads?: number;
}

function countColumns(notes: NoteSummary[]): number {
  return groupNotesByColumn(notes).length;
}

function assignCount(target: AdminMenuCounts, key: keyof AdminMenuCounts, value: number | undefined): void {
  if (value !== undefined) target[key] = value;
}

function badge(value: number | undefined): { badge: number } | Record<string, never> {
  return value === undefined ? {} : { badge: value };
}

export function buildAdminMenu(counts: AdminMenuCounts = {}): AdminMenuGroup[] {
  return [
    {
      label: '概览',
      items: [
        { label: '仪表盘', href: '#/', icon: 'home' },
      ],
    },
    {
      label: '内容',
      items: [
        {
          label: '笔记库',
          href: '#/vault',
          icon: 'folder',
          ...badge(counts.notes),
          match: (p) => p.startsWith('#/vault') || p.startsWith('#/note/'),
        },
        { label: '专栏管理', href: '#/columns', icon: 'book', ...badge(counts.columns) },
        { label: '标签管理', href: '#/tags', icon: 'tag', ...badge(counts.tags) },
        {
          label: '评论审核',
          href: '#/comments',
          icon: 'comment',
          ...badge(counts.pendingComments),
        },
      ],
    },
    {
      label: '运营',
      items: [
        { label: '广告位', href: '#/ads', icon: 'pin', ...badge(counts.ads) },
        { label: '数据统计', href: '#/analytics', icon: 'chart' },
        { label: '媒体库', href: '#/media', icon: 'image' },
        {
          label: '系统设置',
          href: '#/settings',
          icon: 'settings',
          match: (p) => p === '#/settings' || p.startsWith('#/settings/'),
        },
      ],
    },
  ];
}

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [parsedRoute, setParsedRoute] = useState<ParsedRoute>(readRoute());
  const [syncStatus, setSyncStatus] = useState<{ msg: string; err?: boolean } | null>(null);
  const [menuCounts, setMenuCounts] = useState<AdminMenuCounts>({});
  const route = parsedRoute.route;

  useEffect(() => {
    api.me().then((r) => setAuthed(r.authenticated)).catch(() => setAuthed(false));
    const onHash = () => setParsedRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!authed) {
      setMenuCounts({});
      return;
    }
    let cancelled = false;
    void Promise.allSettled([
      api.health(),
      api.listNotes(),
      api.tags.list(),
      api.comments.list({ status: 'pending', limit: 1 }),
      api.settings.get(),
    ]).then(([health, notes, tags, comments, settings]) => {
      if (cancelled) return;
      const next: AdminMenuCounts = {};
      assignCount(next, 'notes', health.status === 'fulfilled' ? health.value.note_count : undefined);
      assignCount(next, 'columns', notes.status === 'fulfilled' ? countColumns(notes.value.notes) : undefined);
      assignCount(next, 'tags', tags.status === 'fulfilled' ? tags.value.tags.length : undefined);
      assignCount(next, 'pendingComments', comments.status === 'fulfilled' ? comments.value.counts.pending : undefined);
      assignCount(next, 'ads', settings.status === 'fulfilled'
        ? (settings.value.home?.ads ?? []).filter((ad) => ad.enabled !== false).length
        : undefined);
      setMenuCounts(next);
    });
    return () => {
      cancelled = true;
    };
  }, [authed]);

  const menu = useMemo(() => buildAdminMenu(menuCounts), [menuCounts]);

  if (authed === null) return <main aria-busy="true"><p>loading…</p></main>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const onSync = () => {
    setSyncStatus({ msg: '正在同步内容…' });
    void api.sync()
      .then(() => setSyncStatus({ msg: '同步已完成。切换页面或刷新后可看到最新内容。' }))
      .catch((e: unknown) => {
        setSyncStatus({ msg: e instanceof Error ? e.message : String(e), err: true });
      });
  };
  const onLogout = () => { void api.logout().then(() => setAuthed(false)); };

  return (
    <AdminShell
      currentPath={currentPath(route)}
      breadcrumbs={breadcrumbsFor(route)}
      menu={menu}
      onSync={onSync}
      onLogout={onLogout}
      siteName="Lumio Blog"
      userInitials="L"
    >
      {syncStatus && (
        <div
          role={syncStatus.err ? 'alert' : 'status'}
          aria-live="polite"
          class="hf-tiny"
          style={{
            padding: '10px 12px',
            marginBottom: 12,
            borderRadius: 8,
            border: '1px solid var(--line)',
            background: syncStatus.err ? 'var(--danger-soft)' : 'var(--ok-soft)',
            color: syncStatus.err ? 'var(--danger-text)' : 'var(--ok-text)',
          }}
        >
          {syncStatus.msg}
        </div>
      )}
      {route.name === 'dashboard' && <Dashboard />}
      {route.name === 'list' && <NoteList shortLinkIdle={route.shortLinkIdle ?? false} />}
      {route.name === 'columns' && <ColumnsPage />}
      {route.name === 'detail' && <NoteDetailPage slug={route.slug} />}
      {route.name === 'analytics' && <NoteAnalyticsPage slug={route.slug} />}
      {route.name === 'ads' && <AdsPage />}
      {route.name === 'tokens' && <TokensPage />}
      {route.name === 'webhooks' && <WebhooksPage />}
      {route.name === 'settings' && <SettingsPage section={route.section} />}
      {route.name === 'audit' && <AuditPage initialActionPrefix={route.actionPrefix ?? ''} />}
      {route.name === 'media' && <MediaPage />}
      {route.name === 'og' && <OgPage />}
      {route.name === 'backup' && <BackupPage />}
      {route.name === 'config-docs' && <ConfigDocsPage />}
      {route.name === 'tags' && <TagsPage {...(route.tag !== undefined ? { tag: route.tag } : {})} />}
      {route.name === 'comments' && <CommentsPage />}
      {route.name === 'subscriptions' && <SubscriptionsPage />}
      {route.name === 'analytics-overview' && <AnalyticsOverviewPage />}
    </AdminShell>
  );
}
