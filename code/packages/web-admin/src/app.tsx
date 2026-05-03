import { useEffect, useState } from 'preact/hooks';
import { AdminShell, type AdminBreadcrumb } from '@opennote/ui';
import { api } from './api.js';
import { Login } from './pages/login.js';
import { Dashboard } from './pages/dashboard.js';
import { NoteList } from './pages/note-list.js';
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

type Route =
  | { name: 'dashboard' }
  | { name: 'list' }
  | { name: 'detail'; slug: string }
  | { name: 'analytics'; slug: string }
  | { name: 'tokens' }
  | { name: 'webhooks' }
  | { name: 'settings'; section: SettingsSectionId }
  | { name: 'audit' }
  | { name: 'media' }
  | { name: 'og' }
  | { name: 'backup' }
  | { name: 'config-docs' };

function readRoute(): Route {
  const hash = location.hash.replace(/^#\/?/, '');
  if (hash === '' || hash === 'dashboard') return { name: 'dashboard' };
  if (hash === 'notes') return { name: 'list' };
  if (hash.startsWith('notes/')) {
    const rest = hash.slice(6);
    // notes/<slug>/analytics
    const m = /^([^/]+)\/analytics$/.exec(rest);
    if (m && m[1]) return { name: 'analytics', slug: decodeURIComponent(m[1]) };
    return { name: 'detail', slug: decodeURIComponent(rest) };
  }
  if (hash === 'tokens') return { name: 'tokens' };
  if (hash === 'webhooks') return { name: 'webhooks' };
  if (hash === 'audit') return { name: 'audit' };
  if (hash === 'media') return { name: 'media' };
  if (hash === 'og') return { name: 'og' };
  if (hash === 'backup') return { name: 'backup' };
  if (hash === 'config-docs') return { name: 'config-docs' };
  if (hash === 'settings' || hash.startsWith('settings/')) {
    const section = hash.split('/')[1] ?? 'site';
    const valid = (SETTINGS_SECTIONS as readonly string[]).includes(section)
      ? (section as SettingsSectionId)
      : 'site';
    return { name: 'settings', section: valid };
  }
  return { name: 'dashboard' };
}

function currentPath(route: Route): string {
  switch (route.name) {
    case 'dashboard': return '#/';
    case 'list': return '#/notes';
    case 'detail': return `#/notes/${route.slug}`;
    case 'analytics': return `#/notes/${route.slug}/analytics`;
    case 'tokens': return '#/tokens';
    case 'webhooks': return '#/webhooks';
    case 'settings': return `#/settings/${route.section}`;
    case 'audit': return '#/audit';
    case 'media': return '#/media';
    case 'og': return '#/og';
    case 'backup': return '#/backup';
    case 'config-docs': return '#/config-docs';
  }
}

function breadcrumbsFor(route: Route): AdminBreadcrumb[] {
  switch (route.name) {
    case 'dashboard':
      return [{ label: 'opennote', href: '#/' }, { label: '概览' }];
    case 'list':
      return [{ label: 'opennote', href: '#/' }, { label: '笔记' }];
    case 'detail':
      return [
        { label: 'opennote', href: '#/' },
        { label: '笔记', href: '#/notes' },
        { label: route.slug },
      ];
    case 'analytics':
      return [
        { label: 'opennote', href: '#/' },
        { label: '笔记', href: '#/notes' },
        { label: route.slug, href: `#/notes/${route.slug}` },
        { label: '数据' },
      ];
    case 'tokens':
      return [{ label: 'opennote', href: '#/' }, { label: '设置' }, { label: 'Tokens' }];
    case 'webhooks':
      return [{ label: 'opennote', href: '#/' }, { label: '设置' }, { label: 'Webhooks' }];
    case 'settings':
      return [{ label: 'opennote', href: '#/' }, { label: '设置', href: '#/settings' }, { label: route.section }];
    case 'audit':
      return [{ label: 'opennote', href: '#/' }, { label: 'Audit log' }];
    case 'media':
      return [{ label: 'opennote', href: '#/' }, { label: '内容' }, { label: '媒体库' }];
    case 'og':
      return [{ label: 'opennote', href: '#/' }, { label: '设置' }, { label: 'OG 生成器' }];
    case 'backup':
      return [{ label: 'opennote', href: '#/' }, { label: '设置' }, { label: '备份与导出' }];
    case 'config-docs':
      return [{ label: 'opennote', href: '#/' }, { label: '设置' }, { label: '配置文档' }];
  }
}

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [route, setRoute] = useState<Route>(readRoute());

  useEffect(() => {
    api.me().then((r) => setAuthed(r.authenticated)).catch(() => setAuthed(false));
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (authed === null) return <main aria-busy="true"><p>loading…</p></main>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const onSync = () => { void api.sync().then(() => location.reload()); };
  const onLogout = () => { void api.logout().then(() => setAuthed(false)); };

  return (
    <AdminShell
      currentPath={currentPath(route)}
      breadcrumbs={breadcrumbsFor(route)}
      onSync={onSync}
      onLogout={onLogout}
      siteName="opennote"
      userInitials="L"
    >
      {route.name === 'dashboard' && <Dashboard />}
      {route.name === 'list' && <NoteList />}
      {route.name === 'detail' && <NoteDetailPage slug={route.slug} />}
      {route.name === 'analytics' && <NoteAnalyticsPage slug={route.slug} />}
      {route.name === 'tokens' && <TokensPage />}
      {route.name === 'webhooks' && <WebhooksPage />}
      {route.name === 'settings' && <SettingsPage section={route.section} />}
      {route.name === 'audit' && <AuditPage />}
      {route.name === 'media' && <MediaPage />}
      {route.name === 'og' && <OgPage />}
      {route.name === 'backup' && <BackupPage />}
      {route.name === 'config-docs' && <ConfigDocsPage />}
    </AdminShell>
  );
}
