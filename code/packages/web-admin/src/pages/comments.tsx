import { useEffect, useMemo, useState } from 'preact/hooks';
import { Tag } from '@opennote/ui';
import {
  api,
  type CommentRow,
  type CommentStatus,
  type CommentCounts,
} from '../api.js';
import { WsEStyles } from '../components/ws-e-styles.js';

const STATUS_TABS: { value: CommentStatus | 'all'; label: string }[] = [
  { value: 'pending', label: '待审' },
  { value: 'approved', label: '已通过' },
  { value: 'spam', label: '垃圾' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'all', label: '全部' },
];

function fmtTs(iso: string): string {
  return iso.replace('T', ' ').slice(0, 19);
}

function statusTone(s: CommentStatus): 'ok' | 'warn' | 'danger' | 'default' {
  if (s === 'approved') return 'ok';
  if (s === 'pending') return 'warn';
  if (s === 'spam' || s === 'rejected') return 'danger';
  return 'default';
}

export function CommentsPage() {
  const [tab, setTab] = useState<CommentStatus | 'all'>('pending');
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [counts, setCounts] = useState<CommentCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<number>>(new Set());

  const load = async () => {
    setError(null);
    try {
      const opts: { status?: CommentStatus } = {};
      if (tab !== 'all') opts.status = tab;
      const r = await api.comments.list(opts);
      setComments(r.comments);
      setCounts(r.counts);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  const setBusyFor = (id: number, on: boolean) => {
    setBusy((cur) => {
      const next = new Set(cur);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  };

  const moderate = async (id: number, status: CommentStatus) => {
    setBusyFor(id, true);
    try {
      await api.comments.setStatus(id, status);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyFor(id, false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('永久删除这条评论?此操作不可恢复。')) return;
    setBusyFor(id, true);
    try {
      await api.comments.delete(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyFor(id, false);
    }
  };

  const totalForTab = useMemo(() => {
    if (!counts) return 0;
    if (tab === 'all') return counts.pending + counts.approved + counts.rejected + counts.spam;
    return counts[tab];
  }, [counts, tab]);

  return (
    <div class="ws-e">
      <WsEStyles />
      <div class="ws-e__header">
        <h1 class="ws-e__h1"><span aria-hidden="true">💬 </span>评论</h1>
        <p class="ws-e__lead">
          公开访客通过 <code>POST /api/posts/:slug/comments</code> 提交。新评论默认进入 <strong>待审</strong>,审核通过后才会显示在文章页。
        </p>
      </div>

      <nav class="ws-e__tabs" aria-label="评论状态" style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {STATUS_TABS.map((t) => {
          const active = t.value === tab;
          const n = !counts ? null : t.value === 'all'
            ? counts.pending + counts.approved + counts.rejected + counts.spam
            : counts[t.value];
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-pressed={active}
              class="ws-e__row-btn"
              style={{
                padding: '4px 10px',
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--ink-2)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                fontSize: 12,
              }}
            >
              {t.label}{n === null ? '' : ` · ${n}`}
            </button>
          );
        })}
      </nav>

      {error && <p role="alert" class="error">{error}</p>}

      <section aria-labelledby="cmt-h" class="ws-e__panel">
        <header class="ws-e__panel-head">
          <h2 id="cmt-h">{comments ? `${comments.length} 条 / 共 ${totalForTab}` : '加载中…'}</h2>
        </header>
        {comments === null ? (
          <p role="status" aria-live="polite" class="ws-e__empty">loading…</p>
        ) : comments.length === 0 ? (
          <p class="ws-e__empty">这里没有评论。</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {comments.map((c) => {
              const isBusy = busy.has(c.id);
              return (
                <li
                  key={c.id}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: 12,
                    background: 'var(--bg)',
                  }}
                >
                  <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 13 }}>{c.author}</strong>
                    {c.email && <span class="hf-mono hf-tiny hf-muted">{c.email}</span>}
                    {c.website && (
                      <a class="hf-mono hf-tiny" href={c.website} target="_blank" rel="noreferrer noopener">
                        {c.website}
                      </a>
                    )}
                    <span class="hf-mono hf-tiny hf-faint" aria-hidden="true">·</span>
                    <a class="hf-tiny" href={`#/notes/${encodeURIComponent(c.slug)}`}>{c.slug}</a>
                    <span class="hf-mono hf-tiny hf-faint" aria-hidden="true">·</span>
                    <time class="hf-mono hf-tiny hf-muted" dateTime={c.created_at}>{fmtTs(c.created_at)}</time>
                    <div class="hf-grow" />
                    <Tag tone={statusTone(c.status)}>{c.status}</Tag>
                  </header>
                  <p
                    style={{
                      margin: '0 0 10px 0',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {c.body}
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {c.status !== 'approved' && (
                      <button
                        type="button"
                        class="ws-e__row-btn"
                        disabled={isBusy}
                        onClick={() => moderate(c.id, 'approved')}
                      >
                        通过
                      </button>
                    )}
                    {c.status !== 'pending' && (
                      <button
                        type="button"
                        class="ws-e__row-btn"
                        disabled={isBusy}
                        onClick={() => moderate(c.id, 'pending')}
                      >
                        移回待审
                      </button>
                    )}
                    {c.status !== 'rejected' && (
                      <button
                        type="button"
                        class="ws-e__row-btn"
                        disabled={isBusy}
                        onClick={() => moderate(c.id, 'rejected')}
                      >
                        拒绝
                      </button>
                    )}
                    {c.status !== 'spam' && (
                      <button
                        type="button"
                        class="ws-e__row-btn"
                        disabled={isBusy}
                        onClick={() => moderate(c.id, 'spam')}
                      >
                        标为垃圾
                      </button>
                    )}
                    <div class="hf-grow" />
                    <button
                      type="button"
                      class="ws-e__row-btn ws-e__row-btn--danger"
                      disabled={isBusy}
                      onClick={() => remove(c.id)}
                    >
                      永久删除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
