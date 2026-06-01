import { useEffect, useMemo, useState } from 'preact/hooks';
import { api, type TokenRow } from '../api.js';
import { WsEStyles } from '../components/ws-e-styles.js';

/**
 * Tokens 页 — 重写,对齐 hf-extras §10 HFApiTokens。
 *
 * 结构:
 * 1. 顶部:用法说明卡(read / write / admin scope 各能干什么)
 * 2. 中间:列表(name / scope / created / last_used / expires)+ 行操作(撤销 / 复制 ID)
 * 3. 底部:新建表单(name + scope + ttl_days)
 * 4. 创建后:模态显示完整 token,有"我已复制"按钮才能关闭
 */

type Scope = 'read' | 'write' | 'admin';

const SCOPE_DOCS: { scope: Scope; label: string; tone: 'ink' | 'accent' | 'warn'; bullets: string[] }[] = [
  {
    scope: 'read',
    label: 'read',
    tone: 'ink',
    bullets: ['只读笔记 / 标签 / 搜索', '不能修改任何内容'],
  },
  {
    scope: 'write',
    label: 'write',
    tone: 'accent',
    bullets: ['同步 / 修改笔记元数据', 'fast-note-sync 用这个', '不能管理 token / webhook'],
  },
  {
    scope: 'admin',
    label: 'admin',
    tone: 'warn',
    bullets: ['等价站长', '管理 token / webhook / 设置', '只发给受信任的脚本'],
  },
];

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  if (!isFinite(d)) return iso;
  const diff = Date.now() - d;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m 前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h 前`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d 前`;
  return iso.slice(0, 10);
}

function expiresLabel(iso: string | null): { text: string; tone: 'muted' | 'warn' | 'danger' } {
  if (!iso) return { text: '永不', tone: 'muted' };
  const ms = new Date(iso).getTime() - Date.now();
  if (!isFinite(ms)) return { text: iso.slice(0, 10), tone: 'muted' };
  if (ms < 0) return { text: '已过期', tone: 'danger' };
  const days = Math.floor(ms / 86_400_000);
  if (days < 14) return { text: `${days}d 后`, tone: 'warn' };
  return { text: `${days}d 后`, tone: 'muted' };
}

export function TokensPage() {
  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<Scope>('write');
  const [ttlDays, setTtlDays] = useState<number>(90);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await api.listTokens();
    setTokens(r.tokens as TokenRow[]);
  };
  useEffect(() => { void load(); }, []);

  const active = useMemo(
    () => (tokens ?? []).filter((t) => !t.revoked_at).length,
    [tokens],
  );

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请填写 token 名称');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api.createToken(name.trim(), scope, ttlDays);
      setCreated(r.token);
      setCopied(false);
      setName('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const revoke = async (id: number, n: string) => {
    if (!confirm(`撤销 token "${n}" ?它会立即失效。`)) return;
    await api.revokeToken(id);
    await load();
  };

  return (
    <div class="ws-e">
      <WsEStyles />
      <div class="ws-e__header">
        <h1 class="ws-e__h1"><span aria-hidden="true">🔑 </span>API tokens</h1>
        <p class="ws-e__lead">
          外部脚本(<code>fast-note-sync</code>、CI、Agent)通过 token 访问后台 API。
          <strong>令牌只显示一次</strong>,建议存到密码管理器。
        </p>
      </div>

      {/* 用法说明 */}
      <section aria-labelledby="scope-doc-h" class="ws-e__scope-grid">
        <h2 id="scope-doc-h" class="sr-only">scope 用法</h2>
        {SCOPE_DOCS.map((s) => (
          <article key={s.scope} class={`ws-e__scope ws-e__scope--${s.tone}`}>
            <div class="ws-e__scope-head">
              <code class="ws-e__scope-tag">{s.label}</code>
            </div>
            <ul>
              {s.bullets.map((b, i) => (<li key={i}>{b}</li>))}
            </ul>
          </article>
        ))}
      </section>

      {/* 列表 */}
      <section aria-labelledby="tokens-h" class="ws-e__panel">
        <header class="ws-e__panel-head">
          <h2 id="tokens-h">已激活 · {active} 个</h2>
          <span class="ws-e__panel-hint">共 {tokens?.length ?? 0} 条历史</span>
        </header>
        {tokens === null ? (
          <p role="status" aria-live="polite" class="ws-e__empty">loading…</p>
        ) : tokens.length === 0 ? (
          <p class="ws-e__empty">还没有 token。下面创建一个吧。</p>
        ) : (
          <div class="ws-e__table-wrap">
            <table class="ws-e__table" aria-label="所有 API tokens">
              <thead>
                <tr>
                  <th scope="col">名称</th>
                  <th scope="col">权限</th>
                  <th scope="col">创建</th>
                  <th scope="col">最后使用</th>
                  <th scope="col">过期</th>
                  <th scope="col"><span class="sr-only">操作</span></th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => {
                  const exp = expiresLabel(t.expires_at);
                  const revoked = !!t.revoked_at;
                  return (
                    <tr key={t.id} class={revoked ? 'ws-e__row--dim' : ''}>
                      <td data-label="名称">
                        <div class="ws-e__token-name">{t.name}</div>
                        <code class="hf-mono hf-tiny hf-faint">id #{t.id}</code>
                      </td>
                      <td data-label="权限">
                        <span class={`badge ws-e__scope-badge ws-e__scope-badge--${t.scope}`}>{t.scope}</span>
                      </td>
                      <td data-label="创建" class="hf-mono hf-tiny hf-muted">
                        <time dateTime={t.created_at.slice(0, 10)}>{t.created_at.slice(0, 10)}</time>
                      </td>
                      <td data-label="最后使用" class="hf-mono hf-tiny hf-muted">{relativeTime(t.last_used_at)}</td>
                      <td data-label="过期">
                        <span class={`hf-mono hf-tiny ws-e__exp ws-e__exp--${exp.tone}`}>{exp.text}</span>
                      </td>
                      <td data-label="操作">
                        {revoked ? (
                          <span class="hf-mono hf-tiny hf-faint">已撤销</span>
                        ) : (
                          <button
                            type="button"
                            class="ws-e__row-btn ws-e__row-btn--danger"
                            onClick={() => revoke(t.id, t.name)}
                            aria-label={`撤销 token ${t.name}`}
                          >
                            撤销
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 新建 */}
      <section aria-labelledby="new-token-h" class="ws-e__panel">
        <header class="ws-e__panel-head">
          <h2 id="new-token-h">新建 token</h2>
        </header>
        <form onSubmit={submit} class="ws-e__form" noValidate>
          <div class="ws-e__field">
            <label htmlFor="token-name">名称</label>
            <input
              id="token-name"
              type="text"
              value={name}
              required
              maxLength={60}
              placeholder="如:obsidian-mac"
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'token-form-err' : undefined}
            />
          </div>
          <div class="ws-e__field ws-e__field--narrow">
            <label htmlFor="token-scope">权限</label>
            <select
              id="token-scope"
              value={scope}
              onChange={(e) => setScope((e.target as HTMLSelectElement).value as Scope)}
            >
              <option value="read">read</option>
              <option value="write">write</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div class="ws-e__field ws-e__field--narrow">
            <label htmlFor="token-ttl">有效期(天)</label>
            <input
              id="token-ttl"
              type="number"
              min={1}
              max={3650}
              value={ttlDays}
              onInput={(e) => setTtlDays(Number((e.target as HTMLInputElement).value || 0))}
            />
          </div>
          <div class="ws-e__form-actions">
            <button type="submit" class="primary" disabled={busy}>
              {busy ? '创建中…' : '+ 创建'}
            </button>
          </div>
          {error && <p id="token-form-err" role="alert" class="error ws-e__form-err">{error}</p>}
        </form>
      </section>

      {/* 创建模态 */}
      {created && (
        <div class="ws-e__modal-backdrop" role="presentation" onClick={(e) => {
          // 阻止背景点击意外关闭(必须按按钮)
          e.stopPropagation();
        }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="created-h"
            class="ws-e__modal"
          >
            <h2 id="created-h" class="ws-e__modal-title">
              <span aria-hidden="true">● </span>新令牌已创建
            </h2>
            <p class="ws-e__modal-body">
              这是<strong>唯一一次</strong>看到完整 token 的机会。复制并存到密码管理器。
            </p>
            <div class="ws-e__token-display">
              <code aria-label="新创建的 token">{created}</code>
            </div>
            <div class="ws-e__modal-actions">
              <button
                type="button"
                class={copied ? '' : 'primary'}
                onClick={() => void copy(created)}
              >
                {copied ? '已复制 ✓' : '复制'}
              </button>
              <button
                type="button"
                disabled={!copied}
                aria-disabled={!copied}
                title={copied ? '' : '请先复制 token'}
                onClick={() => { setCreated(null); setCopied(false); }}
              >
                我已复制,关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
