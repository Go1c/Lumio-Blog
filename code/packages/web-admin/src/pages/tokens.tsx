import { useEffect, useState } from 'preact/hooks';
import { api } from '../api.js';

export function TokensPage() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'read' | 'write' | 'admin'>('write');
  const [created, setCreated] = useState<string | null>(null);

  const load = () => api.listTokens().then((r) => setTokens(r.tokens));
  useEffect(() => { load(); }, []);

  const create = async (e: Event) => {
    e.preventDefault();
    const r = await api.createToken(name, scope);
    setCreated(r.token);
    setName('');
    await load();
  };

  return (
    <div>
      <nav class="crumbs"><a href="#/">← 笔记</a></nav>
      <h2>API tokens</h2>
      <form onSubmit={create} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input type="text" placeholder="名称" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} required />
        <select value={scope} onChange={(e) => setScope((e.target as HTMLSelectElement).value as any)}>
          <option value="read">read</option>
          <option value="write">write</option>
          <option value="admin">admin</option>
        </select>
        <button class="primary" type="submit">创建</button>
      </form>
      {created && (
        <div style={{ padding: 12, background: 'var(--panel)', border: '1px solid var(--green)', borderRadius: 4, marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 12 }}>新 token（仅显示一次）：</p>
          <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{created}</code>
          <button onClick={() => { navigator.clipboard.writeText(created); }} style={{ marginLeft: 8 }}>复制</button>
          <button onClick={() => setCreated(null)} style={{ marginLeft: 4 }}>关闭</button>
        </div>
      )}
      <table>
        <thead><tr><th>名字</th><th>scope</th><th>最近使用</th><th>过期</th><th></th></tr></thead>
        <tbody>
          {tokens.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td><span class="badge">{t.scope}</span></td>
              <td style={{ color: 'var(--muted)' }}>{t.last_used_at?.slice(0, 10) ?? '—'}</td>
              <td style={{ color: 'var(--muted)' }}>{t.expires_at?.slice(0, 10) ?? '永久'}</td>
              <td>{t.revoked_at ? '已撤销' : <button onClick={() => api.revokeToken(t.id).then(load)}>撤销</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
