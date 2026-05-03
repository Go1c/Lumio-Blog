import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Button, HfIcon, Tag, Toggle } from '@opennote/ui';
import { api, type NoteDetail, type Visibility } from '../api.js';

const VISIBILITIES: { id: Visibility; label: string; sub: string }[] = [
  { id: 'public', label: '公开', sub: '任何人可访问 URL' },
  { id: 'unlisted', label: '不列出', sub: '不出现在列表/Feed,可直接访问' },
  { id: 'link-only', label: '仅链接', sub: '需要短链才能看到' },
  { id: 'private', label: '私有', sub: '只在后台可见' },
];

export function NoteDetailPage({ slug }: { slug: string }): JSX.Element {
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [backlinks, setBacklinks] = useState<{ src_slug: string; title: string }[]>([]);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [scheduledOn, setScheduledOn] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  const load = (): Promise<void> =>
    api.getNote(slug).then((r) => {
      setNote(r.note);
      setBacklinks(r.backlinks);
      if (r.note.scheduled_at) {
        setScheduledOn(true);
        setScheduledAt(toLocalInput(r.note.scheduled_at));
      } else {
        setScheduledOn(false);
        setScheduledAt('');
      }
    });

  useEffect(() => {
    void load();
  }, [slug]);

  if (!note) return <p role="status" aria-live="polite">载入中…</p>;

  const setVisibility = async (v: Visibility): Promise<void> => {
    if (v === note.visibility) return;
    setBusy(true);
    try {
      const patch: { visibility: Visibility; searchable?: boolean } = { visibility: v };
      if ((v === 'link-only' || v === 'private') && note.searchable) {
        patch.searchable = false;
      }
      await api.patchMeta(slug, patch);
      setToast({ msg: `已改为 ${v}` });
      await load();
    } catch (e) {
      setToast({ msg: (e as Error).message, err: true });
    } finally {
      setBusy(false);
    }
  };

  const toggleSearchable = async (): Promise<void> => {
    setBusy(true);
    try {
      await api.patchMeta(slug, { searchable: !note.searchable });
      setToast({ msg: `searchable: ${!note.searchable}` });
      await load();
    } catch (e) {
      setToast({ msg: (e as Error).message, err: true });
    } finally {
      setBusy(false);
    }
  };

  const saveSchedule = async (): Promise<void> => {
    setBusy(true);
    try {
      const value = scheduledOn && scheduledAt ? new Date(scheduledAt).toISOString() : null;
      await api.patchMeta(slug, { scheduled_at: value });
      setToast({ msg: value ? `定时发布:${scheduledAt}` : '已取消定时发布' });
      await load();
    } catch (e) {
      setToast({ msg: (e as Error).message, err: true });
    } finally {
      setBusy(false);
    }
  };

  const rotateLink = async (): Promise<void> => {
    if (!confirm('旋转短链会让旧链接 404,确定?')) return;
    setBusy(true);
    try {
      await api.rotateShortLink(slug);
      setToast({ msg: '已旋转短链' });
      await load();
    } catch (e) {
      setToast({ msg: (e as Error).message, err: true });
    } finally {
      setBusy(false);
    }
  };

  const copyShort = async (): Promise<void> => {
    if (!note.short_id) return;
    const url = `${location.origin}/n/${note.short_id}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast({ msg: '短链已复制' });
    } catch {
      setToast({ msg: '复制失败', err: true });
    }
  };

  const searchableDisabled = note.visibility === 'link-only' || note.visibility === 'private';
  const updatedAgo = timeAgoZh(note.updated_at);

  return (
    <div>
      <nav aria-label="面包屑" class="hf-tiny" style={{ marginBottom: 8 }}>
        <a href="#/notes" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          <span aria-hidden="true">← </span>笔记列表
        </a>
      </nav>

      {/* title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1.3, flex: 1 }}>{note.title}</h1>
        <Button size="sm" onClick={() => window.open(`/posts/${encodeURIComponent(note.slug)}.html`, '_blank')}>
          <HfIcon name="eye" size={11} /> 前台预览
        </Button>
        <a
          class="ui-btn ui-btn--sm"
          href={`#/notes/${encodeURIComponent(slug)}/analytics`}
          aria-label="单篇 analytics"
        >
          <HfIcon name="chart" size={11} /> 数据
        </a>
      </div>
      <div class="hf-mono hf-tiny hf-muted" style={{ marginBottom: 8 }}>
        {note.source_path} · 修改 {updatedAgo} · {note.reading_minutes} min · {note.word_count} 字
      </div>

      {/* 3 control cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {/* visibility + schedule */}
        <div class="ui-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <HfIcon name="eye" size={14} color="var(--ok)" />
            <span style={{ fontWeight: 600, fontSize: 13 }}>可见性</span>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend class="sr-only">文章可见性</legend>
            <div role="radiogroup" aria-label="文章可见性">
              {VISIBILITIES.map((v) => {
                const on = note.visibility === v.id;
                return (
                  <label
                    key={v.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: 8,
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: on ? 'var(--accent-soft)' : 'transparent',
                      marginBottom: 2,
                    }}
                  >
                    <input
                      type="radio"
                      name={`visibility-${slug}`}
                      checked={on}
                      disabled={busy}
                      onChange={() => void setVisibility(v.id)}
                      style={{ marginTop: 2, accentColor: 'var(--accent)' }}
                    />
                    <div>
                      <div class="hf-sm" style={{ fontWeight: 500, color: on ? 'var(--accent-2)' : 'var(--ink)' }}>
                        {v.label}
                      </div>
                      <div class="hf-tiny hf-muted" style={{ marginTop: 1 }}>{v.sub}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* schedule */}
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 6,
              background: 'var(--bg-sunk)',
              border: '1px dashed var(--line-strong)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span class="hf-sm" style={{ fontWeight: 500 }}>定时发布</span>
              <div class="hf-grow" />
              <Toggle
                checked={scheduledOn}
                aria-label="切换定时发布"
                onChange={() => setScheduledOn((v) => !v)}
              />
            </div>
            <input
              type="datetime-local"
              value={scheduledAt}
              disabled={!scheduledOn || busy}
              onInput={(e) => setScheduledAt((e.currentTarget as HTMLInputElement).value)}
              class="ui-input"
              aria-label="发布时间"
              style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '5px 8px' }}
            />
            <button
              type="button"
              class="ui-btn ui-btn--sm ui-btn--ghost"
              disabled={busy}
              onClick={() => void saveSchedule()}
              style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
            >
              保存
            </button>
          </div>
        </div>

        {/* searchable */}
        <div class="ui-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <HfIcon name="search" size={14} color="var(--accent)" />
            <span style={{ fontWeight: 600, fontSize: 13 }}>可搜索</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 0',
              borderTop: 'none',
            }}
          >
            <span class="hf-sm hf-grow">站内搜索可见</span>
            <input
              type="checkbox"
              role="switch"
              class="ui-toggle"
              checked={!!note.searchable}
              aria-checked={note.searchable ? 'true' : 'false'}
              disabled={busy || searchableDisabled}
              aria-label="切换可搜索"
              aria-describedby={searchableDisabled ? 'searchable-help' : undefined}
              onChange={() => void toggleSearchable()}
            />
          </div>
          {searchableDisabled && (
            <p id="searchable-help" class="hf-tiny hf-muted" style={{ marginTop: 8 }}>
              {note.visibility} 不允许 searchable
            </p>
          )}
          <p class="hf-tiny hf-muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
            私有 / 仅链接 自动从搜索索引中移除。
          </p>
        </div>

        {/* short link */}
        <div class="ui-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <HfIcon name="link" size={14} color="var(--warn)" />
            <span style={{ fontWeight: 600, fontSize: 13 }}>分享链接</span>
          </div>
          <div
            class="hf-mono"
            style={{
              fontSize: 12,
              padding: '6px 10px',
              background: 'var(--bg-sunk)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              color: 'var(--accent-2)',
              wordBreak: 'break-all',
            }}
            aria-label="短链"
          >
            {note.short_id ? `/n/${note.short_id}` : '尚未生成短链'}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              class="ui-btn ui-btn--sm"
              disabled={!note.short_id}
              onClick={() => void copyShort()}
            >
              <HfIcon name="copy" size={11} /> 复制
            </button>
            <button
              type="button"
              class="ui-btn ui-btn--sm ui-btn--danger"
              disabled={busy}
              onClick={() => void rotateLink()}
            >
              <HfIcon name="sync" size={11} /> 旋转
            </button>
          </div>
          <p class="hf-tiny hf-muted" style={{ marginTop: 8 }}>
            旋转后,旧链接立即 404 (会留墓碑)。
          </p>
        </div>
      </div>

      {/* metadata + backlinks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div class="ui-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>元数据</div>
          <dl class="hf-sm" style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: '6px 12px', margin: 0 }}>
            <dt class="hf-muted">slug</dt>
            <dd class="hf-mono" style={{ margin: 0, wordBreak: 'break-all' }}>{note.slug}</dd>
            <dt class="hf-muted">source</dt>
            <dd class="hf-mono" style={{ margin: 0, wordBreak: 'break-all' }}>{note.source_path}</dd>
            <dt class="hf-muted">created</dt>
            <dd class="hf-mono" style={{ margin: 0 }}>
              <time dateTime={note.created_at}>{note.created_at.slice(0, 10)}</time>
            </dd>
            <dt class="hf-muted">updated</dt>
            <dd class="hf-mono" style={{ margin: 0 }}>
              <time dateTime={note.updated_at}>{note.updated_at.slice(0, 10)}</time>
            </dd>
            <dt class="hf-muted">published</dt>
            <dd class="hf-mono" style={{ margin: 0 }}>
              {note.published_at ? <time dateTime={note.published_at}>{note.published_at.slice(0, 10)}</time> : '—'}
            </dd>
            <dt class="hf-muted">scheduled</dt>
            <dd class="hf-mono" style={{ margin: 0 }}>
              {note.scheduled_at ? <time dateTime={note.scheduled_at}>{toLocalInput(note.scheduled_at)}</time> : '—'}
            </dd>
            <dt class="hf-muted">字数</dt>
            <dd class="hf-mono" style={{ margin: 0 }}>{note.word_count}</dd>
            <dt class="hf-muted">阅读</dt>
            <dd class="hf-mono" style={{ margin: 0 }}>{note.reading_minutes} min</dd>
          </dl>
        </div>

        <div class="ui-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>反向链接 ({backlinks.length})</div>
          {backlinks.length === 0 ? (
            <p class="hf-tiny hf-muted" style={{ margin: 0 }}>暂无引用本笔记的笔记</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {backlinks.map((b) => (
                <li key={b.src_slug} style={{ padding: '4px 0' }}>
                  <a class="hf-sm" href={`#/notes/${encodeURIComponent(b.src_slug)}`} style={{ color: 'var(--accent)' }}>
                    {b.title || b.src_slug}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* preview */}
      <div class="ui-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>内容预览</span>
          <Tag style={{ marginLeft: 8 }}>read-only</Tag>
          <span class="hf-tiny hf-muted" style={{ marginLeft: 8 }}>编辑去 Obsidian</span>
        </div>
        <div
          class="hf-prose"
          style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 720 }}
          dangerouslySetInnerHTML={{ __html: note.body_html }}
        />
      </div>

      {toast && (
        <div
          class={`ui-toast${toast.err ? ' ui-toast--error' : ' ui-toast--success'}`}
          role={toast.err ? 'alert' : 'status'}
          aria-live={toast.err ? 'assertive' : 'polite'}
          style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 200, cursor: 'pointer' }}
          onClick={() => setToast(null)}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function toLocalInput(iso: string): string {
  // YYYY-MM-DDTHH:mm  for <input type="datetime-local">
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number): string => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function timeAgoZh(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} 小时前`;
  return `${Math.round(diff / 86_400_000)} 天前`;
}
