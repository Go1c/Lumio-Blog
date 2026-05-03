import { useEffect, useState } from 'preact/hooks';
import { AdminShell, type AdminBreadcrumb } from '@opennote/ui';
import { api } from './api.js';
import { Login } from './pages/login.js';
import { NoteList } from './pages/note-list.js';
import { NoteDetailPage } from './pages/note-detail.js';
import { TokensPage } from './pages/tokens.js';
import { WebhooksPage } from './pages/webhooks.js';

type Route =
  | { name: 'list' }
  | { name: 'detail'; slug: string }
  | { name: 'tokens' }
  | { name: 'webhooks' };

function readRoute(): Route {
  const hash = location.hash.replace(/^#\/?/, '');
  if (hash.startsWith('notes/')) return { name: 'detail', slug: decodeURIComponent(hash.slice(6)) };
  if (hash === 'tokens') return { name: 'tokens' };
  if (hash === 'webhooks') return { name: 'webhooks' };
  return { name: 'list' };
}

function currentPath(route: Route): string {
  switch (route.name) {
    case 'list': return '#/';
    case 'detail': return `#/notes/${route.slug}`;
    case 'tokens': return '#/tokens';
    case 'webhooks': return '#/webhooks';
  }
}

function breadcrumbsFor(route: Route): AdminBreadcrumb[] {
  switch (route.name) {
    case 'list':
      return [{ label: 'opennote', href: '#/' }, { label: '笔记' }];
    case 'detail':
      return [
        { label: 'opennote', href: '#/' },
        { label: '笔记', href: '#/' },
        { label: route.slug },
      ];
    case 'tokens':
      return [{ label: 'opennote', href: '#/' }, { label: '设置' }, { label: 'Tokens' }];
    case 'webhooks':
      return [{ label: 'opennote', href: '#/' }, { label: '设置' }, { label: 'Webhooks' }];
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
      {route.name === 'list' && <NoteList />}
      {route.name === 'detail' && <NoteDetailPage slug={route.slug} />}
      {route.name === 'tokens' && <TokensPage />}
      {route.name === 'webhooks' && <WebhooksPage />}
    </AdminShell>
  );
}
