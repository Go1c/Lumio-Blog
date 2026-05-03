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
      <nav class="crumbs" aria-label="面包屑"><a href="#/"><span aria-hidden="true">← </span>笔记</a></nav>
      <h2>API tokens</h2>
      <form onSubmit={create} aria-labelledby="new-token-h" style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <h3 id="new-token-h" class="sr-only">创建新 token</h3>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label htmlFor="token-name">名称</label>
          <input id="token-name" name="name" type="text" placeholder="如:博客同步脚本" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} required />
        </div>
        <div>
          <label htmlFor="token-scope">权限范围</label>
          <select id="token-scope" name="scope" value={scope} onChange={(e) => setScope((e.target as HTMLSelectElement).value as any)}>
            <option value="read">read</option>
            <option value="write">write</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button class="primary" type="submit">创建</button>
      </form>
      {created && (
        <div role="alert" aria-live="assertive" style={{ padding: 12, background: 'var(--panel)', border: '1px solid var(--green)', borderRadius: 4, marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 12 }}>新 token(仅显示一次):</p>
          <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{created}</code>
          <button type="button" aria-label="复制 token" onClick={() => { navigator.clipboard.writeText(created); }} style={{ marginLeft: 8 }}>复制</button>
          <button type="button" aria-label="关闭新 token 提示" onClick={() => setCreated(null)} style={{ marginLeft: 4 }}>关闭</button>
        </div>
      )}
      <table aria-label="所有 API tokens">
        <thead>
          <tr>
            <th scope="col">名字</th>
            <th scope="col">scope</th>
            <th scope="col">最近使用</th>
            <th scope="col">过期</th>
            <th scope="col"><span class="sr-only">操作</span></th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td><span class="badge">{t.scope}</span></td>
              <td style={{ color: 'var(--muted)' }}>{t.last_used_at ? <time dateTime={t.last_used_at.slice(0, 10)}>{t.last_used_at.slice(0, 10)}</time> : '—'}</td>
              <td style={{ color: 'var(--muted)' }}>{t.expires_at ? <time dateTime={t.expires_at.slice(0, 10)}>{t.expires_at.slice(0, 10)}</time> : '永久'}</td>
              <td>{t.revoked_at ? '已撤销' : <button type="button" aria-label={`撤销 token ${t.name}`} onClick={() => api.revokeToken(t.id).then(load)}>撤销</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
