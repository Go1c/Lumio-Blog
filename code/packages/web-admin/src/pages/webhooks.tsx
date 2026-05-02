import { useEffect, useState } from 'preact/hooks';
import { api } from '../api.js';

export function WebhooksPage() {
  const [list, setList] = useState<any[]>([]);
  const [url, setUrl] = useState('');

  const load = () => api.listWebhooks().then((r) => setList(r.webhooks));
  useEffect(() => { load(); }, []);

  const create = async (e: Event) => {
    e.preventDefault();
    await api.createWebhook(url, []);
    setUrl('');
    await load();
  };

  return (
    <div>
      <nav class="crumbs"><a href="#/">← 笔记</a></nav>
      <h2>Webhooks</h2>
      <form onSubmit={create} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input type="text" placeholder="https://..." value={url} onInput={(e) => setUrl((e.target as HTMLInputElement).value)} required />
        <button class="primary" type="submit">添加</button>
      </form>
      <table>
        <thead><tr><th>URL</th><th>事件</th><th>创建</th><th></th></tr></thead>
        <tbody>
          {list.map((w) => (
            <tr key={w.id}>
              <td style={{ wordBreak: 'break-all' }}>{w.url}</td>
              <td style={{ color: 'var(--muted)' }}>{w.events === '[]' ? '全部' : w.events}</td>
              <td style={{ color: 'var(--muted)' }}>{w.created_at.slice(0, 10)}</td>
              <td><button onClick={() => api.deleteWebhook(w.id).then(load)}>删除</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
