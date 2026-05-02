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

  if (authed === null) return <main><p>loading…</p></main>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  return (
    <>
      <header>
        <h1><a href="#/" style={{ color: 'inherit', textDecoration: 'none' }}>opennote · admin</a></h1>
        <div class="right">
          <a href="#/" style={{ color: 'var(--muted)' }}>笔记</a>
          <a href="#/tokens" style={{ color: 'var(--muted)' }}>tokens</a>
          <a href="#/webhooks" style={{ color: 'var(--muted)' }}>webhooks</a>
          <button onClick={() => api.sync().then(() => location.reload())}>↻ sync</button>
          <button onClick={() => api.logout().then(() => setAuthed(false))}>logout</button>
        </div>
      </header>
      <main>
        {route.name === 'list' && <NoteList />}
        {route.name === 'detail' && <NoteDetailPage slug={route.slug} />}
        {route.name === 'tokens' && <TokensPage />}
        {route.name === 'webhooks' && <WebhooksPage />}
      </main>
    </>
  );
}
