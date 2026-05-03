import { useEffect, useState } from 'preact/hooks';
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

  return (
    <>
      <a class="skip-link" href="#main-content">跳到主内容</a>
      <header>
        <h1><a href="#/" style={{ color: 'inherit', textDecoration: 'none' }}>opennote · admin</a></h1>
        <nav class="right" aria-label="后台导航">
          <a href="#/" aria-current={route.name === 'list' ? 'page' : undefined} style={{ color: 'var(--muted)' }}>笔记</a>
          <a href="#/tokens" aria-current={route.name === 'tokens' ? 'page' : undefined} style={{ color: 'var(--muted)' }}>tokens</a>
          <a href="#/webhooks" aria-current={route.name === 'webhooks' ? 'page' : undefined} style={{ color: 'var(--muted)' }}>webhooks</a>
          <button type="button" aria-label="同步内容" onClick={() => api.sync().then(() => location.reload())}><span aria-hidden="true">↻</span> sync</button>
          <button type="button" aria-label="退出登录" onClick={() => api.logout().then(() => setAuthed(false))}>logout</button>
        </nav>
      </header>
      <main id="main-content">
        {route.name === 'list' && <NoteList />}
        {route.name === 'detail' && <NoteDetailPage slug={route.slug} />}
        {route.name === 'tokens' && <TokensPage />}
        {route.name === 'webhooks' && <WebhooksPage />}
      </main>
    </>
  );
}
