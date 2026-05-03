import { useEffect, useState } from 'preact/hooks';
import { Tag } from '@opennote/ui';
import {
  api,
  type SubscriberRow,
  type SubscriberCounts,
} from '../api.js';
import { WsEStyles } from '../components/ws-e-styles.js';

function fmtTs(iso: string): string {
  return iso.replace('T', ' ').slice(0, 19);
}

export function SubscriptionsPage() {
  const [list, setList] = useState<SubscriberRow[] | null>(null);
  const [counts, setCounts] = useState<SubscriberCounts | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const r = await api.subscribers.list(activeOnly);
      setList(r.subscribers);
      setCounts(r.counts);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeOnly]);

  const onAdd = async (e: Event) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const r = await api.subscribers.add(email);
      setNewEmail('');
      setInfo(r.already ? `${email} 已经在订阅列表中` : `已添加 ${email}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onUnsubscribe = async (email: string) => {
    if (!confirm(`将 ${email} 标记为已退订?`)) return;
    try {
      await api.subscribers.unsubscribe(email);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onDelete = async (email: string) => {
    if (!confirm(`永久删除订阅者 ${email} 的记录?`)) return;
    try {
      await api.subscribers.delete(email);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const exportCsv = () => {
    if (!list) return;
    const rows = ['email,source,subscribed_at,unsubscribed_at'];
    for (const s of list) {
      rows.push([s.email, s.source, s.subscribed_at, s.unsubscribed_at ?? ''].join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div class="ws-e">
      <WsEStyles />
      <div class="ws-e__header">
        <h1 class="ws-e__h1"><span aria-hidden="true">📬 </span>订阅</h1>
        <p class="ws-e__lead">
          站点订阅者(本地存储)。公开提交端点是 <code>POST /api/subscribe</code>。
          如果配置了 <code>BUTTONDOWN_API_KEY</code>,推荐站点改用 <code>/api/newsletter/subscribe</code> 由 Buttondown 接管。
        </p>
      </div>

      {/* 统计 */}
      <section class="ws-e__panel" aria-label="订阅统计">
        <div style={{ display: 'flex', gap: 16, padding: 12, flexWrap: 'wrap' }}>
          <Stat label="活跃" value={counts?.active ?? 0} tone="ok" />
          <Stat label="已退订" value={counts?.unsubscribed ?? 0} tone="warn" />
          <Stat label="累计" value={counts?.total ?? 0} />
          <div class="hf-grow" />
          <button
            type="button"
            class="ws-e__row-btn"
            onClick={exportCsv}
            disabled={!list || list.length === 0}
            aria-label="导出 CSV"
          >
            导出 CSV
          </button>
        </div>
      </section>

      {/* 添加 */}
      <section class="ws-e__panel" aria-labelledby="sub-add-h">
        <header class="ws-e__panel-head">
          <h2 id="sub-add-h">手动添加</h2>
        </header>
        <form
          onSubmit={onAdd}
          style={{ display: 'flex', gap: 8, padding: 12, flexWrap: 'wrap', alignItems: 'center' }}
        >
          <input
            type="email"
            placeholder="email@example.com"
            aria-label="订阅邮箱"
            value={newEmail}
            onInput={(e) => setNewEmail((e.target as HTMLInputElement).value)}
            style={{ flex: '1 1 240px', minHeight: 32, padding: '6px 10px' }}
            required
          />
          <button type="submit" class="primary" disabled={busy}>
            {busy ? '提交中…' : '添加订阅者'}
          </button>
        </form>
      </section>

      {info && <p role="status" aria-live="polite" class="hf-tiny hf-muted">{info}</p>}
      {error && <p role="alert" class="error">{error}</p>}

      {/* 列表 */}
      <section aria-labelledby="sub-h" class="ws-e__panel">
        <header class="ws-e__panel-head">
          <h2 id="sub-h">订阅者</h2>
          <label class="hf-tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly((e.target as HTMLInputElement).checked)}
            />
            仅显示活跃
          </label>
        </header>

        {list === null ? (
          <p role="status" aria-live="polite" class="ws-e__empty">loading…</p>
        ) : list.length === 0 ? (
          <p class="ws-e__empty">还没有订阅者。</p>
        ) : (
          <div class="ws-e__table-wrap">
            <table class="ws-e__table" aria-label="订阅者列表">
              <thead>
                <tr>
                  <th scope="col">邮箱</th>
                  <th scope="col">来源</th>
                  <th scope="col">状态</th>
                  <th scope="col">订阅时间</th>
                  <th scope="col">退订时间</th>
                  <th scope="col"><span class="sr-only">操作</span></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => {
                  const active = !s.unsubscribed_at;
                  return (
                    <tr key={s.email} class={active ? '' : 'ws-e__row--dim'}>
                      <td><code class="hf-mono hf-tiny">{s.email}</code></td>
                      <td><span class="hf-mono hf-tiny hf-muted">{s.source}</span></td>
                      <td>
                        {active ? <Tag tone="ok">活跃</Tag> : <Tag tone="warn">退订</Tag>}
                      </td>
                      <td class="hf-mono hf-tiny hf-muted">{fmtTs(s.subscribed_at)}</td>
                      <td class="hf-mono hf-tiny hf-muted">{s.unsubscribed_at ? fmtTs(s.unsubscribed_at) : '—'}</td>
                      <td>
                        {active && (
                          <button
                            type="button"
                            class="ws-e__row-btn"
                            onClick={() => onUnsubscribe(s.email)}
                          >
                            退订
                          </button>
                        )}{' '}
                        <button
                          type="button"
                          class="ws-e__row-btn ws-e__row-btn--danger"
                          onClick={() => onDelete(s.email)}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'warn' }) {
  const color = tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink-1)';
  return (
    <div>
      <div class="hf-tiny hf-muted" style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
