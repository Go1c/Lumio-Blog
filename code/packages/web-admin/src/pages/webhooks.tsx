import { useEffect, useMemo, useState } from 'preact/hooks';
import { api, type WebhookDelivery, type WebhookRow } from '../api.js';
import { WsEStyles } from '../components/ws-e-styles.js';

/**
 * Webhooks 页 — 重写
 *
 * - 列表(URL / 事件 / 状态 / 最近成功)
 * - 行展开 → 最近 20 条 deliveries(失败可重试)
 * - 新建表单(URL / 事件多选 / secret 自动生成 + 显示一次)
 * - 详情侧栏:HMAC + cURL
 */

type WebhookRowFull = WebhookRow;

const EVENT_KINDS = [
  'note.published',
  'note.updated',
  'note.unpublished',
  'sync.completed',
  'sync.failed',
  'settings.changed',
  'media.uploaded',
  'media.deleted',
  'backup.done',
  'backup.failed',
] as const;

function urlValid(u: string): boolean {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function eventsArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v as string[];
  } catch { /* ignore */ }
  return [];
}

function statusOf(deliveries: WebhookDelivery[] | undefined, w: WebhookRowFull): { tone: 'ok' | 'warn' | 'danger' | 'muted'; label: string } {
  if (w.disabled_at) return { tone: 'muted', label: 'paused' };
  if (!deliveries || deliveries.length === 0) return { tone: 'muted', label: 'idle' };
  const last = deliveries[0];
  if (last && typeof last.status === 'number' && last.status >= 200 && last.status < 300) {
    return { tone: 'ok', label: 'active' };
  }
  return { tone: 'danger', label: 'failed' };
}

function genSecret(): string {
  // 32 char hex,前端生成只为预览;最终值仍由后端写盘
  const buf = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
    return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function WebhooksPage() {
  const [list, setList] = useState<WebhookRowFull[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deliveriesById, setDeliveriesById] = useState<Record<number, WebhookDelivery[]>>({});
  const [detailId, setDetailId] = useState<number | null>(null);

  // 新建表单
  const [url, setUrl] = useState('');
  const [selEvents, setSelEvents] = useState<string[]>([]);
  const [secret, setSecret] = useState<string>(genSecret());
  const [secretVisible, setSecretVisible] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await api.listWebhooks();
    setList(r.webhooks as WebhookRowFull[]);
  };
  useEffect(() => { void load(); }, []);

  const loadDeliveries = async (id: number) => {
    try {
      const r = await api.webhookDeliveries(id, 20);
      setDeliveriesById((cur) => ({ ...cur, [id]: r.deliveries }));
    } catch {
      setDeliveriesById((cur) => ({ ...cur, [id]: [] }));
    }
  };

  const toggle = async (id: number) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!deliveriesById[id]) await loadDeliveries(id);
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!urlValid(url)) {
      setError('请填写合法的 http(s) URL');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api.createWebhook(url, selEvents, secret);
      setCreatedSecret(r.secret ?? secret);
      setUrl('');
      setSelEvents([]);
      setSecret(genSecret());
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number, u: string) => {
    if (!confirm(`删除 webhook ${u}?`)) return;
    await api.deleteWebhook(id);
    await load();
    setDetailId(null);
    setExpanded(null);
  };

  const redeliver = async (webhookId: number, deliveryId: number) => {
    try {
      await api.redeliverWebhook(webhookId, deliveryId);
      await loadDeliveries(webhookId);
    } catch (err) {
      alert(`重发失败:${(err as Error).message}`);
    }
  };

  const detail = useMemo(
    () => (list ?? []).find((w) => w.id === detailId) ?? null,
    [list, detailId],
  );

  return (
    <div class="ws-e">
      <WsEStyles />
      <div class="ws-e__header">
        <h1 class="ws-e__h1"><span aria-hidden="true">📡 </span>Webhooks</h1>
        <p class="ws-e__lead">
          笔记发布、同步完成、备份成功等事件都会 POST 到你的 URL。
          payload 是 <code>SyncEvent</code> JSON,头部带 <code>x-opennote-signature: sha256=…</code>(HMAC)。
        </p>
      </div>

      {/* 列表 */}
      <section aria-labelledby="webhooks-h" class="ws-e__panel">
        <header class="ws-e__panel-head">
          <h2 id="webhooks-h">已配置 · {list?.length ?? 0} 个</h2>
        </header>
        {list === null ? (
          <p role="status" aria-live="polite" class="ws-e__empty">loading…</p>
        ) : list.length === 0 ? (
          <p class="ws-e__empty">还没有 webhook。下面创建一个吧。</p>
        ) : (
          <ul class="ws-e__webhook-list">
            {list.map((w) => {
              const events = eventsArray(w.events);
              const isOpen = expanded === w.id;
              const deliveries = deliveriesById[w.id];
              const status = statusOf(deliveries, w);
              return (
                <li key={w.id} class="ws-e__webhook">
                  <div class="ws-e__webhook-row">
                    <button
                      type="button"
                      class="ws-e__webhook-toggle"
                      aria-expanded={isOpen ? 'true' : 'false'}
                      aria-controls={`wh-${w.id}-deliveries`}
                      onClick={() => void toggle(w.id)}
                    >
                      <span aria-hidden="true" class="ws-e__caret">{isOpen ? '▾' : '▸'}</span>
                    </button>
                    <div class="ws-e__webhook-main">
                      <code class="ws-e__webhook-url">{w.url}</code>
                      <div class="ws-e__webhook-meta">
                        <span class={`ws-e__pill ws-e__pill--${status.tone}`}>{status.label}</span>
                        {events.length === 0 ? (
                          <span class="hf-mono hf-tiny hf-faint">所有事件</span>
                        ) : (
                          events.map((e) => (
                            <span key={e} class="hf-mono hf-tiny ws-e__event-tag">{e}</span>
                          ))
                        )}
                        <time class="hf-mono hf-tiny hf-muted" dateTime={w.created_at.slice(0, 10)}>
                          创建于 {w.created_at.slice(0, 10)}
                        </time>
                      </div>
                    </div>
                    <div class="ws-e__webhook-actions">
                      <button
                        type="button"
                        class="ws-e__row-btn"
                        onClick={() => setDetailId(w.id)}
                      >
                        详情
                      </button>
                      <button
                        type="button"
                        class="ws-e__row-btn ws-e__row-btn--danger"
                        onClick={() => void remove(w.id, w.url)}
                        aria-label={`删除 webhook ${w.url}`}
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div id={`wh-${w.id}-deliveries`} class="ws-e__deliveries">
                      <div class="hf-mono hf-tiny hf-muted ws-e__deliveries-h">
                        最近 20 条投递
                      </div>
                      {!deliveries ? (
                        <p class="ws-e__empty">loading…</p>
                      ) : deliveries.length === 0 ? (
                        <p class="ws-e__empty">还没有投递记录。</p>
                      ) : (
                        <table class="ws-e__deliveries-table">
                          <thead>
                            <tr>
                              <th scope="col">事件</th>
                              <th scope="col">状态</th>
                              <th scope="col">尝试</th>
                              <th scope="col">时间</th>
                              <th scope="col"><span class="sr-only">操作</span></th>
                            </tr>
                          </thead>
                          <tbody>
                            {deliveries.map((d) => {
                              const ok = typeof d.status === 'number' && d.status >= 200 && d.status < 300;
                              return (
                                <tr key={d.id}>
                                  <td data-label="事件"><code class="hf-mono hf-tiny">{d.event_kind}</code></td>
                                  <td data-label="状态">
                                    <span class={`hf-mono hf-tiny ws-e__delivery-status ws-e__delivery-status--${ok ? 'ok' : 'danger'}`}>
                                      {d.status ?? '✗'}
                                    </span>
                                  </td>
                                  <td data-label="尝试" class="hf-mono hf-tiny">#{d.attempt}</td>
                                  <td data-label="时间" class="hf-mono hf-tiny hf-muted">
                                    <time dateTime={d.attempted_at}>{d.attempted_at.replace('T', ' ').slice(0, 19)}</time>
                                  </td>
                                  <td data-label="操作">
                                    {!ok && (
                                      <button
                                        type="button"
                                        class="ws-e__row-btn"
                                        onClick={() => void redeliver(w.id, d.id)}
                                      >
                                        重发
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 新建 */}
      <section aria-labelledby="new-webhook-h" class="ws-e__panel">
        <header class="ws-e__panel-head">
          <h2 id="new-webhook-h">新建 webhook</h2>
        </header>
        <form onSubmit={submit} class="ws-e__form ws-e__form--col" noValidate>
          <div class="ws-e__field">
            <label htmlFor="webhook-url">URL</label>
            <input
              id="webhook-url"
              type="url"
              required
              placeholder="https://example.com/hook"
              value={url}
              onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'webhook-form-err' : undefined}
            />
          </div>
          <fieldset class="ws-e__field">
            <legend>事件(全不选 = 所有事件)</legend>
            <div class="ws-e__events">
              {EVENT_KINDS.map((k) => {
                const checked = selEvents.includes(k);
                return (
                  <label key={k} class="ws-e__event-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelEvents((cur) => checked ? cur.filter((x) => x !== k) : [...cur, k]);
                      }}
                    />
                    <span class="hf-mono hf-tiny">{k}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div class="ws-e__field">
            <label htmlFor="webhook-secret">Secret(可自定义,留空自动生成)</label>
            <div class="ws-e__inline-group">
              <input
                id="webhook-secret"
                type={secretVisible ? 'text' : 'password'}
                value={secret}
                autoComplete="new-password"
                onInput={(e) => setSecret((e.target as HTMLInputElement).value)}
              />
              <button
                type="button"
                onClick={() => setSecretVisible((v) => !v)}
                aria-pressed={secretVisible}
              >
                {secretVisible ? '隐藏' : '显示'}
              </button>
              <button type="button" onClick={() => setSecret(genSecret())}>重新生成</button>
            </div>
          </div>
          <div class="ws-e__form-actions">
            <button type="submit" class="primary" disabled={busy}>
              {busy ? '创建中…' : '+ 创建'}
            </button>
          </div>
          {error && <p id="webhook-form-err" role="alert" class="error ws-e__form-err">{error}</p>}
        </form>
      </section>

      {/* secret 显示一次 */}
      {createdSecret && (
        <div class="ws-e__modal-backdrop" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="wh-secret-h" class="ws-e__modal">
            <h2 id="wh-secret-h" class="ws-e__modal-title">Webhook secret</h2>
            <p class="ws-e__modal-body">
              用这个 secret 验证 <code>x-opennote-signature</code>。<strong>仅显示一次</strong>。
            </p>
            <div class="ws-e__token-display">
              <code aria-label="webhook secret">{createdSecret}</code>
            </div>
            <div class="ws-e__modal-actions">
              <button
                type="button"
                class="primary"
                onClick={() => { void navigator.clipboard.writeText(createdSecret); }}
              >
                复制
              </button>
              <button type="button" onClick={() => setCreatedSecret(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 详情侧栏 */}
      {detail && (
        <aside
          class="ws-e__sidebar"
          aria-label={`webhook ${detail.url} 详情`}
        >
          <header class="ws-e__sidebar-head">
            <h2>详情</h2>
            <button
              type="button"
              class="ws-e__row-btn"
              onClick={() => setDetailId(null)}
              aria-label="关闭详情"
            >
              ✕
            </button>
          </header>
          <div class="ws-e__sidebar-body">
            <div class="ws-e__field">
              <span class="ws-e__field-label">URL</span>
              <code class="ws-e__webhook-url">{detail.url}</code>
            </div>
            <div class="ws-e__field">
              <span class="ws-e__field-label">事件</span>
              <div class="ws-e__webhook-meta">
                {(() => {
                  const evs = eventsArray(detail.events);
                  if (evs.length === 0) return <span class="hf-mono hf-tiny hf-faint">所有事件</span>;
                  return evs.map((e) => (<span key={e} class="hf-mono hf-tiny ws-e__event-tag">{e}</span>));
                })()}
              </div>
            </div>
            <div class="ws-e__field">
              <span class="ws-e__field-label">HMAC 签名</span>
              <p class="ws-e__sm hf-muted">
                每个请求带 header:
              </p>
              <pre class="ws-e__code">{`x-opennote-signature: sha256=<hex>
x-opennote-event: <event.kind>`}</pre>
              <p class="ws-e__sm hf-muted">
                签名算法:<code>HMAC_SHA256(secret, raw_body)</code> hex 编码。
                请用 constant-time 比较。
              </p>
            </div>
            <div class="ws-e__field">
              <span class="ws-e__field-label">cURL 调试</span>
              <pre class="ws-e__code">{`# 模拟一次投递(用 secret 自己算签名)
SECRET="<your-secret>"
BODY='{"kind":"note.published","slug":"hello"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl -X POST '${detail.url}' \\
  -H 'content-type: application/json' \\
  -H "x-opennote-signature: sha256=$SIG" \\
  -H 'x-opennote-event: note.published' \\
  -d "$BODY"`}</pre>
            </div>
            <div class="ws-e__field">
              <span class="ws-e__field-label">重试策略</span>
              <p class="ws-e__sm hf-muted">
                失败后退避:立即 → 30s → 5min → 30min → 6h(共 5 次)。
                超过仍失败 = 该 webhook 标 <code>failed</code>,可手动重发。
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
