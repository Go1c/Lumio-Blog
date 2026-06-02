import { useEffect, useMemo, useState } from 'preact/hooks';
import { api, type AuditEntry } from '../api.js';
import { WsEStyles } from '../components/ws-e-styles.js';

/**
 * Audit log 浏览页
 * - 表格:时间 / actor / action / target / diff
 * - 顶部过滤:按 actor / 按 action prefix
 * - 点行展开看 diff(JSON pretty)
 */

const ACTION_PREFIXES = [
  { label: '全部', value: '' },
  { label: 'auth.*', value: 'auth.' },
  { label: 'note.*', value: 'note.' },
  { label: 'token.*', value: 'token.' },
  { label: 'webhook.*', value: 'webhook.' },
  { label: 'settings.*', value: 'settings.' },
  { label: 'sync.*', value: 'sync.' },
];

function prettyJson(raw: string | null): string {
  if (!raw) return '';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function fmtTs(iso: string): string {
  // 显示到秒,空格分隔
  return iso.replace('T', ' ').slice(0, 19);
}

export function AuditPage({ initialActionPrefix = '' }: { initialActionPrefix?: string }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [actor, setActor] = useState('');
  const [actionPrefix, setActionPrefix] = useState(initialActionPrefix);
  const [limit, setLimit] = useState(100);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  /** 服务端只识别 limit;actor / action_prefix 也透传给后端(便于将来扩展),
   *  同时在客户端做兜底过滤,避免服务端未实现时 UI 不工作。 */
  const load = async () => {
    setError(null);
    try {
      const opts: { limit?: number; actor?: string; action_prefix?: string } = { limit };
      if (actor.trim()) opts.actor = actor.trim();
      if (actionPrefix) opts.action_prefix = actionPrefix;
      const r = await api.listAudit(opts);
      setEntries(r.entries);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    setActionPrefix(initialActionPrefix);
  }, [initialActionPrefix]);

  const filtered = useMemo(() => {
    if (!entries) return null;
    return entries.filter((e) => {
      if (actor.trim() && e.actor !== actor.trim()) return false;
      if (actionPrefix && !e.action.startsWith(actionPrefix)) return false;
      return true;
    });
  }, [entries, actor, actionPrefix]);

  const onApply = (e: Event) => {
    e.preventDefault();
    void load();
  };

  const toggle = (id: number) => {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const distinctActors = useMemo(() => {
    if (!entries) return [];
    return Array.from(new Set(entries.map((e) => e.actor))).sort();
  }, [entries]);

  return (
    <div class="ws-e">
      <WsEStyles />
      <div class="ws-e__header">
        <h1 class="ws-e__h1"><span aria-hidden="true">📜 </span>审计日志</h1>
        <p class="ws-e__lead">
          所有写操作和登录都会被记录。最新在最上。
        </p>
      </div>

      <form class="ws-e__filters" onSubmit={onApply} aria-label="过滤审计日志">
        <div class="ws-e__field ws-e__field--narrow">
          <label htmlFor="audit-actor">Actor</label>
          <input
            id="audit-actor"
            type="text"
            list="audit-actor-list"
            placeholder="owner / token:write / anon"
            value={actor}
            onInput={(e) => setActor((e.target as HTMLInputElement).value)}
          />
          <datalist id="audit-actor-list">
            {distinctActors.map((a) => <option key={a} value={a} />)}
          </datalist>
        </div>
        <div class="ws-e__field ws-e__field--narrow">
          <label htmlFor="audit-action">Action 前缀</label>
          <select
            id="audit-action"
            value={actionPrefix}
            onChange={(e) => setActionPrefix((e.target as HTMLSelectElement).value)}
          >
            {ACTION_PREFIXES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div class="ws-e__field ws-e__field--narrow">
          <label htmlFor="audit-limit">条数</label>
          <select
            id="audit-limit"
            value={String(limit)}
            onChange={(e) => setLimit(Number((e.target as HTMLSelectElement).value))}
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="250">250</option>
            <option value="500">500</option>
          </select>
        </div>
        <div class="ws-e__form-actions">
          <button type="submit" class="primary">应用</button>
        </div>
      </form>

      {error && <p role="alert" class="error">{error}</p>}

      <section aria-labelledby="audit-h" class="ws-e__panel">
        <header class="ws-e__panel-head">
          <h2 id="audit-h" class="sr-only">审计条目</h2>
          <span>共 {filtered?.length ?? 0} 条</span>
        </header>
        {filtered === null ? (
          <p role="status" aria-live="polite" class="ws-e__empty">loading…</p>
        ) : filtered.length === 0 ? (
          <p class="ws-e__empty">没有匹配的条目。</p>
        ) : (
          <div class="ws-e__table-wrap">
            <table class="ws-e__table ws-e__audit-table" aria-label="审计日志">
              <thead>
                <tr>
                  <th scope="col" style={{ width: 32 }}><span class="sr-only">展开</span></th>
                  <th scope="col">时间</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Action</th>
                  <th scope="col">Target</th>
                  <th scope="col">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.flatMap((e) => {
                  const isOpen = expanded.has(e.id);
                  const hasDiff = !!e.diff;
                  const rows = [
                    <tr
                      key={`r-${e.id}`}
                      class={`ws-e__audit-row ${isOpen ? 'is-open' : ''} ${hasDiff ? 'has-diff' : ''}`}
                    >
                      <td data-label="展开">
                        {hasDiff && (
                          <button
                            type="button"
                            class="ws-e__row-btn"
                            aria-label={isOpen ? '折叠 diff' : '展开 diff'}
                            aria-expanded={isOpen ? 'true' : 'false'}
                            onClick={() => toggle(e.id)}
                          >
                            <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                          </button>
                        )}
                      </td>
                      <td data-label="时间" class="hf-mono hf-tiny hf-muted">
                        <time dateTime={e.ts}>{fmtTs(e.ts)}</time>
                      </td>
                      <td data-label="Actor"><code class="hf-mono hf-tiny">{e.actor}</code></td>
                      <td data-label="Action"><code class="hf-mono hf-tiny ws-e__action">{e.action}</code></td>
                      <td data-label="Target" class="hf-mono hf-tiny hf-muted">{e.target ?? '—'}</td>
                      <td data-label="IP" class="hf-mono hf-tiny hf-muted">{e.ip ?? '—'}</td>
                    </tr>,
                  ];
                  if (isOpen && hasDiff) {
                    rows.push(
                      <tr key={`d-${e.id}`} class="ws-e__audit-diff-row">
                        <td colSpan={6} data-label="Diff">
                          <pre class="ws-e__code">{prettyJson(e.diff ?? null)}</pre>
                        </td>
                      </tr>,
                    );
                  }
                  return rows;
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
