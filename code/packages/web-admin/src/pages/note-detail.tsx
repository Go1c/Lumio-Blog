import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Button, HfIcon, Tag, Toggle } from '@opennote/ui';
import { api, type NoteDetail, type ShortLinkInfo, type Visibility } from '../api.js';

const VISIBILITIES: { id: Visibility; label: string; sub: string }[] = [
  { id: 'public', label: '公开', sub: '任何人可访问 URL' },
  { id: 'unlisted', label: '不列出', sub: '不出现在列表/Feed,可直接访问' },
  { id: 'link-only', label: '仅链接', sub: '需要短链才能看到' },
  { id: 'private', label: '私有', sub: '只在后台可见' },
];

type SearchFlagId = 'searchable' | 'seo_indexable' | 'rss_includable' | 'featured_on_home';
const SEARCH_FLAGS: { id: SearchFlagId; label: string; sub: string }[] = [
  { id: 'searchable', label: '站内搜索', sub: '出现在 /search' },
  { id: 'seo_indexable', label: 'SEO robots', sub: '允许搜索引擎抓取 / 收入 sitemap' },
  { id: 'rss_includable', label: 'RSS 收录', sub: '出现在 /feed.xml' },
  { id: 'featured_on_home', label: '首页推荐', sub: '上首页推荐位' },
];

export const NOTE_DETAIL_RESPONSIVE_STYLE = `
.note-detail { min-width: 0; }
.note-detail__title-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 6px;
}
.note-detail__title {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
  flex: 1;
  min-width: 0;
}
.note-detail__source { margin-bottom: 8px; }
.note-detail__controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.note-detail__meta-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.note-detail__links-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}
.note-detail__links-split {
  border-left: 1px solid var(--line);
  padding-left: 12px;
}
.note-detail__preview { min-width: 0; }
@media (max-width: 720px) {
  .note-detail__title-row { flex-wrap: wrap; gap: 8px; }
  .note-detail__title { flex: 1 0 100%; font-size: 20px; }
  .note-detail__title-row .ui-btn { flex: 1 1 132px; }
  .note-detail__source {
    line-height: 1.6;
    overflow-wrap: anywhere;
  }
  .note-detail__controls,
  .note-detail__meta-grid,
  .note-detail__links-card {
    grid-template-columns: 1fr;
  }
  .note-detail__links-split {
    border-left: 0;
    border-top: 1px solid var(--line);
    padding-left: 0;
    padding-top: 12px;
  }
  .note-detail__preview-head {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 6px;
  }
  .note-detail__preview {
    max-width: 100%;
    overflow-x: hidden;
  }
  .note-detail__preview pre,
  .note-detail__preview table {
    max-width: 100%;
    overflow-x: auto;
  }
}
`;

let noteDetailStyleInjected = false;

function NoteDetailStyles(): null {
  if (typeof document !== 'undefined' && !noteDetailStyleInjected) {
    noteDetailStyleInjected = true;
    const tag = document.createElement('style');
    tag.setAttribute('data-note-detail', '1');
    tag.textContent = NOTE_DETAIL_RESPONSIVE_STYLE;
    document.head.appendChild(tag);
  }
  return null;
}

export function NoteDetailPage({ slug }: { slug: string }): JSX.Element {
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [backlinks, setBacklinks] = useState<{ src_slug: string; title: string }[]>([]);
  const [outlinks, setOutlinks] = useState<{ dst_slug: string; title: string }[]>([]);
  const [shortLink, setShortLink] = useState<ShortLinkInfo | null>(null);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [scheduledOn, setScheduledOn] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwInput, setPwInput] = useState('');

  const load = (): Promise<void> =>
    api.getNote(slug).then((r) => {
      setNote(r.note);
      setBacklinks(r.backlinks);
      setOutlinks(r.outlinks ?? []);
      setShortLink(r.short_link ?? null);
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
      const patch: {
        visibility: Visibility;
        searchable?: boolean;
        seo_indexable?: boolean;
        rss_includable?: boolean;
        featured_on_home?: boolean;
      } = { visibility: v };
      if (v === 'link-only' || v === 'private') {
        if (note.searchable) patch.searchable = false;
        if (note.seo_indexable) patch.seo_indexable = false;
        if (note.rss_includable) patch.rss_includable = false;
        if (note.featured_on_home) patch.featured_on_home = false;
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

  const toggleSearchFlag = async (flag: SearchFlagId): Promise<void> => {
    setBusy(true);
    try {
      const current = (note as unknown as Record<SearchFlagId, 0 | 1>)[flag];
      await api.patchMeta(slug, { [flag]: !current });
      setToast({ msg: `${flag}: ${!current}` });
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

  const generateLink = async (): Promise<void> => {
    setBusy(true);
    try {
      const r = await api.createShortLink(slug, { rotate: false });
      setToast({ msg: `已生成短链 /n/${r.short_id}` });
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
      const r = await api.rotateShortLink(slug);
      setToast({ msg: `已旋转短链 /n/${r.short_id}` });
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

  const savePassword = async (): Promise<void> => {
    if (!note.short_id) return;
    if (pwInput.length < 4) {
      setToast({ msg: '密码至少 4 字符', err: true });
      return;
    }
    setBusy(true);
    try {
      await api.setShortLinkPassword(note.short_id, pwInput);
      setToast({ msg: '已设置密码' });
      setPwModalOpen(false);
      setPwInput('');
      await load();
    } catch (e) {
      setToast({ msg: (e as Error).message, err: true });
    } finally {
      setBusy(false);
    }
  };

  const removePassword = async (): Promise<void> => {
    if (!note.short_id) return;
    if (!confirm('移除密码后任何人凭短链都能访问,确定?')) return;
    setBusy(true);
    try {
      await api.setShortLinkPassword(note.short_id, null);
      setToast({ msg: '已移除密码' });
      setPwModalOpen(false);
      setPwInput('');
      await load();
    } catch (e) {
      setToast({ msg: (e as Error).message, err: true });
    } finally {
      setBusy(false);
    }
  };

  const searchableDisabled = note.visibility === 'link-only' || note.visibility === 'private';
  const updatedAgo = timeAgoZh(note.updated_at);

  return (
    <div class="note-detail">
      <NoteDetailStyles />
      <nav aria-label="面包屑" class="hf-tiny" style={{ marginBottom: 8 }}>
        <a href="#/notes" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          <span aria-hidden="true">← </span>笔记列表
        </a>
      </nav>

      {/* title row */}
      <div class="note-detail__title-row">
        <h1 class="note-detail__title">{note.title}</h1>
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
      <div class="hf-mono hf-tiny hf-muted note-detail__source">
        {note.source_path} · 修改 {updatedAgo} · {note.reading_minutes} min · {note.word_count} 字
      </div>

      {/* 3 control cards */}
      <div class="note-detail__controls">
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

        {/* searchable — 4 维 */}
        <div class="ui-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <HfIcon name="search" size={14} color="var(--accent)" />
            <span style={{ fontWeight: 600, fontSize: 13 }}>可发现性</span>
          </div>
          <div role="group" aria-label="文章可发现性">
            {SEARCH_FLAGS.map((f) => {
              const checked = !!(note as unknown as Record<SearchFlagId, 0 | 1>)[f.id];
              const helpId = `${f.id}-help`;
              return (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '6px 0',
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div class="hf-sm" style={{ fontWeight: 500 }}>{f.label}</div>
                    <div
                      id={helpId}
                      class="hf-tiny hf-muted"
                      style={{ marginTop: 1, lineHeight: 1.4 }}
                    >
                      {f.sub}
                    </div>
                  </div>
                  <button
                    type="button"
                    class="ui-toggle"
                    role="switch"
                    aria-checked={checked ? 'true' : 'false'}
                    aria-pressed={checked ? 'true' : 'false'}
                    aria-label={`切换 ${f.label}`}
                    aria-describedby={helpId}
                    disabled={busy || searchableDisabled}
                    onClick={() => void toggleSearchFlag(f.id)}
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 10,
                      border: '1px solid var(--line-strong)',
                      background: checked ? 'var(--accent)' : 'var(--bg-sunk)',
                      position: 'relative',
                      cursor: busy || searchableDisabled ? 'not-allowed' : 'pointer',
                      opacity: busy || searchableDisabled ? 0.55 : 1,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: 1,
                        left: checked ? 17 : 1,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                        transition: 'left 0.15s',
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
          {searchableDisabled && (
            <p id="searchable-help" class="hf-tiny hf-muted" style={{ marginTop: 8 }}>
              {note.visibility} 自动关闭以上 4 个维度
            </p>
          )}
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
            {note.short_id ? (
              <>
                <button
                  type="button"
                  class="ui-btn ui-btn--sm"
                  onClick={() => void copyShort()}
                >
                  <HfIcon name="copy" size={11} /> 复制
                </button>
                <button
                  type="button"
                  class="ui-btn ui-btn--sm"
                  disabled={busy}
                  onClick={() => {
                    setPwInput('');
                    setPwModalOpen(true);
                  }}
                  aria-label="设置短链密码"
                >
                  <HfIcon name="lock" size={11} /> {shortLink?.has_password ? '改密码' : '设密码'}
                </button>
                <button
                  type="button"
                  class="ui-btn ui-btn--sm ui-btn--danger"
                  disabled={busy}
                  onClick={() => void rotateLink()}
                >
                  <HfIcon name="sync" size={11} /> 旋转
                </button>
              </>
            ) : (
              <button
                type="button"
                class="ui-btn ui-btn--sm ui-btn--primary"
                disabled={busy}
                onClick={() => void generateLink()}
              >
                <HfIcon name="link" size={11} /> 生成短链
              </button>
            )}
          </div>
          {note.short_id && shortLink && (
            <p class="hf-tiny hf-muted" style={{ marginTop: 8 }}>
              访问 {shortLink.access_count} 次{shortLink.last_accessed_at ? ` · 上次 ${timeAgoZh(shortLink.last_accessed_at)}` : ''}
              {shortLink.has_password ? ' · 已加密' : ''}
            </p>
          )}
          <p class="hf-tiny hf-muted" style={{ marginTop: 4 }}>
            {note.short_id ? '旋转后,旧链接立即 404 (会留墓碑)。' : '生成后会得到一个 5 字符短链 /n/xxxxx,旋转可换新。'}
          </p>
        </div>
      </div>

      {/* metadata + backlinks */}
      <div class="note-detail__meta-grid">
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

        <div class="ui-card note-detail__links-card" style={{ padding: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
              <HfIcon name="link" size={13} color="var(--accent)" style={{ marginRight: 4 }} /> 反向链接 ({backlinks.length})
            </div>
            {backlinks.length === 0 ? (
              <p class="hf-tiny hf-muted" style={{ margin: 0 }}>暂无引用本笔记的笔记</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {backlinks.map((b) => (
                  <li key={b.src_slug} style={{ padding: '4px 0', borderTop: '1px solid var(--line)' }}>
                    <a class="hf-sm" href={`#/notes/${encodeURIComponent(b.src_slug)}`} style={{ color: 'var(--accent)' }}>
                      {b.title || b.src_slug}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class="note-detail__links-split">
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
              <HfIcon name="link" size={13} color="var(--warn)" style={{ marginRight: 4 }} /> 出链 ({outlinks.length})
            </div>
            {outlinks.length === 0 ? (
              <p class="hf-tiny hf-muted" style={{ margin: 0 }}>本笔记没有内部链接</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {outlinks.map((o) => (
                  <li key={o.dst_slug} style={{ padding: '4px 0', borderTop: '1px solid var(--line)' }}>
                    <a class="hf-sm" href={`#/notes/${encodeURIComponent(o.dst_slug)}`} style={{ color: 'var(--warn)' }}>
                      {o.title || o.dst_slug}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* preview */}
      <div class="ui-card" style={{ padding: 16 }}>
        <div class="note-detail__preview-head" style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>内容预览</span>
          <Tag style={{ marginLeft: 8 }}>read-only</Tag>
          <span class="hf-tiny hf-muted" style={{ marginLeft: 8 }}>编辑去 Obsidian</span>
        </div>
        <div
          class="hf-prose note-detail__preview"
          style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 720 }}
          dangerouslySetInnerHTML={{ __html: note.body_html }}
        />
      </div>

      {pwModalOpen && note.short_id && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="设置短链密码"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPwModalOpen(false);
          }}
        >
          <div
            class="ui-card"
            style={{ padding: 18, width: 360, maxWidth: '90vw', background: 'var(--bg)' }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              短链密码 — /n/{note.short_id}
            </div>
            <p class="hf-tiny hf-muted" style={{ marginTop: 0, marginBottom: 12 }}>
              访问者需输入密码才能跳转。已加密短链仍会计入访问统计。
            </p>
            <input
              type="password"
              class="ui-input"
              placeholder="新密码 (至少 4 字符)"
              value={pwInput}
              autoFocus
              onInput={(e) => setPwInput((e.currentTarget as HTMLInputElement).value)}
              style={{ width: '100%', padding: '8px 10px', fontSize: 14 }}
              aria-label="新密码"
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {shortLink?.has_password && (
                <button
                  type="button"
                  class="ui-btn ui-btn--sm ui-btn--danger"
                  disabled={busy}
                  onClick={() => void removePassword()}
                  style={{ marginRight: 'auto' }}
                >
                  移除密码
                </button>
              )}
              <button
                type="button"
                class="ui-btn ui-btn--sm ui-btn--ghost"
                disabled={busy}
                onClick={() => {
                  setPwModalOpen(false);
                  setPwInput('');
                }}
              >
                取消
              </button>
              <button
                type="button"
                class="ui-btn ui-btn--sm"
                disabled={busy || pwInput.length < 4}
                onClick={() => void savePassword()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

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
