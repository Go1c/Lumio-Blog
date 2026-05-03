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
      <nav class="crumbs" aria-label="面包屑"><a href="#/"><span aria-hidden="true">← </span>笔记</a></nav>
      <h2>Webhooks</h2>
      <form onSubmit={create} aria-labelledby="new-webhook-h" style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'flex-end' }}>
        <h3 id="new-webhook-h" class="sr-only">添加新 webhook</h3>
        <div style={{ flex: 1 }}>
          <label htmlFor="webhook-url">Webhook URL</label>
          <input id="webhook-url" name="url" type="url" placeholder="https://..." value={url} onInput={(e) => setUrl((e.target as HTMLInputElement).value)} required />
        </div>
        <button class="primary" type="submit">添加</button>
      </form>
      <table aria-label="所有 webhooks">
        <thead>
          <tr>
            <th scope="col">URL</th>
            <th scope="col">事件</th>
            <th scope="col">创建</th>
            <th scope="col"><span class="sr-only">操作</span></th>
          </tr>
        </thead>
        <tbody>
          {list.map((w) => (
            <tr key={w.id}>
              <td style={{ wordBreak: 'break-all' }}>{w.url}</td>
              <td style={{ color: 'var(--muted)' }}>{w.events === '[]' ? '全部' : w.events}</td>
              <td style={{ color: 'var(--muted)' }}><time dateTime={w.created_at.slice(0, 10)}>{w.created_at.slice(0, 10)}</time></td>
              <td><button type="button" aria-label={`删除 webhook ${w.url}`} onClick={() => api.deleteWebhook(w.id).then(load)}>删除</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
