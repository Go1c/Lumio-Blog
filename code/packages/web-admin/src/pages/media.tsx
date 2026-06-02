import { useEffect, useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { Button, Tag } from '@opennote/ui';
import { api, type MediaItem, type MediaReference, type VaultAttachment } from '../api.js';
import { Uploader } from '../components/uploader.js';

type ViewMode = 'grid' | 'list';
type SourceTab = 'media' | 'vault';

export const MEDIA_PAGE_STYLE = `
.media-page { min-width: 0; }
.media-page__hero {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 18px;
  margin-bottom: 18px;
  background:
    radial-gradient(circle at 12% 16%, rgba(0,102,255,.14), transparent 28%),
    linear-gradient(135deg, var(--bg) 0%, var(--bg-soft) 100%);
}
.media-page__hero::after {
  content: "";
  position: absolute;
  right: -42px;
  top: -54px;
  width: 190px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: rgba(22,163,74,.11);
  pointer-events: none;
}
.media-page__title-row,
.media-page__toolbar,
.media-page__stats {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.media-page__title-row { justify-content: space-between; gap: 16px; }
.media-page__title { margin: 0; font-size: 24px; line-height: 1.15; letter-spacing: -.02em; }
.media-page__eyebrow {
  margin: 0 0 4px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: .1em;
}
.media-page__lead {
  margin: 6px 0 0;
  color: var(--ink-3);
  font-size: 13px;
  line-height: 1.6;
  max-width: 620px;
}
.media-page__stat {
  min-width: 92px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255,255,255,.68);
  box-shadow: var(--shadow-1);
}
.media-page__stat strong { display: block; font-size: 18px; line-height: 1; }
.media-page__stat span {
  display: block;
  margin-top: 4px;
  color: var(--ink-4);
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
}
.media-page__toolbar {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.media-page__tabs,
.media-page__view-toggle {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
}
.media-page__search {
  width: min(260px, 100%);
  height: 34px;
  min-height: 34px;
  padding: 6px 10px;
  background: var(--bg);
}
.media-page__upload { margin-bottom: 16px; }
.media-page__content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
  gap: 16px;
  align-items: start;
  margin-top: 18px;
}
.media-page__content--solo { grid-template-columns: minmax(0, 1fr); }
.media-page__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}
.media-page__table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius-lg); }
.media-page__table,
.media-page__vault-table { margin: 0; font-size: 13px; }
.media-page__table tbody tr,
.media-page__vault-table tbody tr { transition: background .12s ease; }
.media-page__table tbody tr:hover,
.media-page__vault-table tbody tr:hover { background: var(--bg-soft); }
.media-page__detail {
  position: sticky;
  top: 12px;
  align-self: start;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 80px);
  overflow: auto;
  box-shadow: var(--shadow-2);
}
.media-page__bulk {
  position: sticky;
  bottom: 12px;
  margin-top: 18px;
  padding: 10px 14px;
  background: var(--bg);
  border: 1px solid var(--accent);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.media-page__vault-meta { margin: 0 0 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
@media (max-width: 720px) {
  .media-page__hero { padding: 16px; border-radius: 18px; margin-bottom: 14px; }
  .media-page__title-row { align-items: flex-start; }
  .media-page__stats { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .media-page__stat { min-width: 0; padding: 9px; }
  .media-page__stat strong { font-size: 16px; }
  .media-page__toolbar { align-items: stretch; }
  .media-page__tabs,
  .media-page__view-toggle,
  .media-page__search { width: 100%; }
  .media-page__tabs > *,
  .media-page__view-toggle > * { flex: 1 1 0; justify-content: center; }
  .media-page__content { grid-template-columns: 1fr; gap: 14px; margin-top: 14px; }
  .media-page__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .media-page__detail { position: static; max-height: none; }
  .media-page__bulk { bottom: 8px; align-items: stretch; }
  .media-page__bulk > .hf-grow { display: none; }
  .media-page__bulk .ui-btn { flex: 1 1 auto; justify-content: center; }
  .media-page__table-wrap { overflow: visible; border: 0; }
  .media-page__table,
  .media-page__table tbody,
  .media-page__table tr,
  .media-page__table td,
  .media-page__vault-table,
  .media-page__vault-table tbody,
  .media-page__vault-table tr,
  .media-page__vault-table td { display: block; width: 100%; }
  .media-page__table thead,
  .media-page__vault-table thead { display: none; }
  .media-page__table tr,
  .media-page__vault-table tr {
    display: grid;
    gap: 8px;
    padding: 12px 14px;
    margin-bottom: 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--bg);
  }
  .media-page__table td,
  .media-page__vault-table td {
    display: grid;
    grid-template-columns: minmax(78px, .36fr) minmax(0, 1fr);
    gap: 8px;
    align-items: center;
    padding: 0;
    border: 0;
    word-break: break-word;
  }
  .media-page__table td::before,
  .media-page__vault-table td::before {
    content: attr(data-label);
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-4);
    text-transform: uppercase;
    letter-spacing: .04em;
  }
}
`;

let mediaPageStyleInjected = false;

function MediaPageStyles(): null {
  if (typeof document !== 'undefined' && !mediaPageStyleInjected) {
    mediaPageStyleInjected = true;
    const tag = document.createElement('style');
    tag.setAttribute('data-media-page', '1');
    tag.textContent = MEDIA_PAGE_STYLE;
    document.head.appendChild(tag);
  }
  return null;
}

export function MediaPage(): JSX.Element {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRefs, setActiveRefs] = useState<MediaReference[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const [tab, setTab] = useState<SourceTab>('media');
  const [vault, setVault] = useState<{
    enabled: boolean;
    vault: string | null;
    items: VaultAttachment[];
  } | null>(null);
  const [autoVaultChecked, setAutoVaultChecked] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const page = await api.media.list(null, 100);
      setItems(page.items);
      setCursor(page.next_cursor);
      setHasMore(!!page.next_cursor);
    } catch (e) {
      setToast({ msg: (e as Error).message, err: true });
    } finally {
      setBusy(false);
    }
  };

  const loadMore = async () => {
    if (!cursor) return;
    setBusy(true);
    try {
      const page = await api.media.list(cursor, 100);
      setItems((prev) => [...(prev ?? []), ...page.items]);
      setCursor(page.next_cursor);
      setHasMore(!!page.next_cursor);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (tab !== 'vault' || vault) return;
    api.media
      .vault()
      .then(setVault)
      .catch((e: Error) => setToast({ msg: e.message, err: true }));
  }, [tab, vault]);

  useEffect(() => {
    if (items === null || items.length > 0 || autoVaultChecked) return;
    setAutoVaultChecked(true);
    api.media
      .vault()
      .then((data) => {
        setVault(data);
        if (data.enabled && data.items.length > 0) setTab('vault');
      })
      .catch(() => undefined);
  }, [items, autoVaultChecked]);

  // 详情侧栏 — 拉引用
  useEffect(() => {
    if (!activeId) {
      setActiveRefs(null);
      return;
    }
    setActiveRefs(null);
    api.media
      .refs(activeId)
      .then((r) => setActiveRefs(r.refs))
      .catch(() => setActiveRefs([]));
  }, [activeId]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) => m.filename.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
  }, [items, search]);

  const totalBytes = useMemo(() => (items ?? []).reduce((s, m) => s + (m.bytes ?? 0), 0), [items]);
  const totalRefs = useMemo(() => (items ?? []).reduce((s, m) => s + (m.reference_count ?? 0), 0), [items]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const onUploaded = (m: MediaItem) => {
    setItems((prev) => (prev ? [m, ...prev.filter((x) => x.id !== m.id)] : [m]));
    setToast({ msg: `已上传 ${m.filename}` });
  };

  const onDelete = async (id: string, force = false) => {
    try {
      await api.media.delete(id, force);
      setItems((prev) => (prev ?? []).filter((m) => m.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (activeId === id) setActiveId(null);
      setToast({ msg: '已删除' });
    } catch (e) {
      setToast({ msg: (e as Error).message, err: true });
    }
  };

  const onBatchDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`确定删除选中的 ${ids.length} 个文件?有引用的会被跳过。`)) return;
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await api.media.delete(id, false);
        ok++;
      } catch {
        fail++;
      }
    }
    setToast({ msg: `删除完成:成功 ${ok} 失败 ${fail}`, err: fail > 0 });
    clearSelection();
    await load();
  };

  const onCopyUrl = async () => {
    const ids = Array.from(selected);
    const urls = (items ?? []).filter((m) => ids.includes(m.id)).map((m) => m.url).join('\n');
    if (!urls) return;
    try {
      await navigator.clipboard.writeText(urls);
      setToast({ msg: `已复制 ${ids.length} 个 URL` });
    } catch {
      setToast({ msg: '复制失败', err: true });
    }
  };

  const active = useMemo(() => (items ?? []).find((m) => m.id === activeId) ?? null, [items, activeId]);

  if (items === null) return <p role="status" aria-live="polite">loading…</p>;

  return (
    <div class="media-page">
      <MediaPageStyles />
      <header class="media-page__hero">
        <div class="media-page__title-row">
          <div>
            <p class="media-page__eyebrow">Asset desk</p>
            <h2 class="media-page__title">媒体库</h2>
            <p class="media-page__lead">
              集中处理上传媒体和 FNS / Vault 附件。空媒体库时会自动提示 Vault 附件，避免后台像“什么都没有”的半成品。
            </p>
          </div>
          <div class="media-page__stats" aria-label="媒体概览">
            <div class="media-page__stat">
              <strong>{tab === 'vault' && vault ? vault.items.length : items.length}</strong>
              <span>{tab === 'vault' ? 'Vault' : 'Files'}</span>
            </div>
            <div class="media-page__stat">
              <strong>{formatBytes(totalBytes)}</strong>
              <span>Stored</span>
            </div>
            <div class="media-page__stat">
              <strong>{totalRefs}</strong>
              <span>Refs</span>
            </div>
          </div>
        </div>

        <div class="media-page__toolbar">
          <div role="tablist" aria-label="来源" class="media-page__tabs">
            <Button
              size="sm"
              variant={tab === 'media' ? 'primary' : 'default'}
              onClick={() => setTab('media')}
              aria-pressed={tab === 'media'}
            >
              上传媒体
            </Button>
            <Button
              size="sm"
              variant={tab === 'vault' ? 'primary' : 'default'}
              onClick={() => setTab('vault')}
              aria-pressed={tab === 'vault'}
            >
              FNS / Vault 附件
            </Button>
          </div>
          {tab === 'media' && <Tag>{items.length} 个文件</Tag>}
          {tab === 'media' && <Tag>{formatBytes(totalBytes)}</Tag>}
          {tab === 'media' && <Tag tone="ok">引用 {totalRefs}</Tag>}
          {tab === 'vault' && vault && <Tag>{vault.items.length} 个附件</Tag>}
          <div class="hf-grow" />
          {tab === 'media' && (
            <>
              <input
                type="search"
                class="media-page__search"
                placeholder="搜索文件名…"
                aria-label="搜索文件"
                value={search}
                onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
              />
              <div role="group" aria-label="视图切换" class="media-page__view-toggle">
                <Button size="sm" variant={view === 'grid' ? 'primary' : 'default'} onClick={() => setView('grid')} aria-pressed={view === 'grid'}>
                  网格
                </Button>
                <Button size="sm" variant={view === 'list' ? 'primary' : 'default'} onClick={() => setView('list')} aria-pressed={view === 'list'}>
                  列表
                </Button>
              </div>
            </>
          )}
        </div>
      </header>

      {tab === 'vault' && (
        <VaultPanel data={vault} onReload={() => { setVault(null); }} />
      )}

      {tab === 'media' && (
        <div class="media-page__upload">
          <Uploader
            accept="image/*,video/*,audio/*,.pdf,.svg,.webp"
            onUploaded={onUploaded}
            pageOverlay={true}
            label="拖入或点击上传到媒体库"
          />
        </div>
      )}

      {tab === 'media' && (
      <div class={`media-page__content${activeId ? '' : ' media-page__content--solo'}`}>
        <section aria-label="媒体列表">
          {view === 'grid' ? (
            <ul
              class="media-page__grid"
            >
              {filtered.map((m) => (
                <MediaTile
                  key={m.id}
                  item={m}
                  selected={selected.has(m.id)}
                  active={m.id === activeId}
                  onActivate={() => setActiveId(m.id)}
                  onToggle={() => toggleSelect(m.id)}
                />
              ))}
            </ul>
          ) : (
            <div class="media-page__table-wrap">
              <table aria-label="媒体文件" class="media-page__table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 32 }}>
                      <span class="sr-only">选择</span>
                    </th>
                    <th scope="col">文件名</th>
                    <th scope="col">类型</th>
                    <th scope="col">大小</th>
                    <th scope="col">引用</th>
                    <th scope="col">上传</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setActiveId(m.id)}
                      style={{ cursor: 'pointer', background: m.id === activeId ? 'var(--accent-soft)' : 'transparent' }}
                    >
                      <td data-label="选择">
                        <input
                          type="checkbox"
                          checked={selected.has(m.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelect(m.id)}
                          aria-label={`选择 ${m.filename}`}
                        />
                      </td>
                      <td data-label="文件名" class="title">{m.filename}</td>
                      <td data-label="类型"><code style={{ fontSize: 11 }}>{m.mime}</code></td>
                      <td data-label="大小">{formatBytes(m.bytes)}</td>
                      <td data-label="引用">
                        {m.reference_count > 0 ? (
                          <Tag tone="ok">{m.reference_count}</Tag>
                        ) : (
                          <Tag>未引用</Tag>
                        )}
                      </td>
                      <td data-label="上传" style={{ color: 'var(--ink-3)' }}>
                        <time dateTime={m.uploaded_at.slice(0, 10)}>{m.uploaded_at.slice(0, 10)}</time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length === 0 && (
            <p class="hf-muted" style={{ textAlign: 'center', padding: 36 }}>没有匹配的文件。</p>
          )}

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button type="button" class="ui-btn ui-btn--sm" onClick={loadMore} disabled={busy}>
                {busy ? '加载中…' : '加载更多'}
              </button>
            </div>
          )}
        </section>

        {active && (
          <DetailSidebar
            item={active}
            refs={activeRefs}
            onClose={() => setActiveId(null)}
            onDelete={() => onDelete(active.id, false)}
            onForceDelete={() => onDelete(active.id, true)}
            onCopyUrl={() => {
              navigator.clipboard.writeText(active.url).catch(() => undefined);
              setToast({ msg: '已复制 URL' });
            }}
            onCopyMarkdown={() => {
              const alt = active.filename.replace(/\.[^.]+$/, '');
              navigator.clipboard.writeText(`![${alt}](${active.url})`).catch(() => undefined);
              setToast({ msg: '已复制 markdown' });
            }}
          />
        )}
      </div>
      )}

      {/* 底部批量操作栏 */}
      {tab === 'media' && selected.size > 0 && (
        <div
          role="region"
          aria-label="批量操作"
          class="media-page__bulk"
        >
          <span style={{ fontWeight: 600 }}>已选 {selected.size} 项</span>
          <div class="hf-grow" />
          <Button size="sm" onClick={onCopyUrl} aria-label="复制选中 URL">复制 URL</Button>
          <Button size="sm" variant="danger" onClick={onBatchDelete} aria-label="批量删除">删除</Button>
          <Button size="sm" variant="ghost" onClick={clearSelection} aria-label="清空选择">取消</Button>
        </div>
      )}

      {toast && (
        <div
          class={`toast${toast.err ? ' error' : ''}`}
          role={toast.err ? 'alert' : 'status'}
          aria-live={toast.err ? 'assertive' : 'polite'}
          onClick={() => setToast(null)}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ---- subcomponents -----------------------------------------------------

function MediaTile({
  item,
  selected,
  active,
  onActivate,
  onToggle,
}: {
  item: MediaItem;
  selected: boolean;
  active: boolean;
  onActivate: () => void;
  onToggle: () => void;
}): JSX.Element {
  const isImage = item.mime.startsWith('image/');
  const tileStyle: JSX.CSSProperties = {
    position: 'relative',
    aspectRatio: '1',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    cursor: 'pointer',
    background: isImage ? 'var(--bg-sunk)' : 'linear-gradient(135deg, var(--accent-soft), var(--bg-sunk))',
    outline: active ? '2px solid var(--accent)' : selected ? '2px solid var(--ok)' : '1px solid var(--line)',
    outlineOffset: 0,
  };
  return (
    <li style={tileStyle}>
      <button
        type="button"
        onClick={onActivate}
        aria-label={`查看 ${item.filename}`}
        style={{
          all: 'unset',
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {isImage ? (
          <img
            src={item.url}
            alt={item.filename}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--ink-3)' }}>
            <div style={{ fontSize: 28, fontFamily: 'var(--mono)' }}>{extOf(item.filename) || '?'}</div>
            <div class="hf-tiny hf-muted">{shortMime(item.mime)}</div>
          </div>
        )}
      </button>

      {/* 选择 checkbox */}
      <label
        style={{
          position: 'absolute', top: 6, left: 6,
          background: 'rgba(255,255,255,.85)',
          borderRadius: 4, padding: '1px 4px',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          cursor: 'pointer', fontSize: 11,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`选择 ${item.filename}`}
          style={{ margin: 0 }}
        />
      </label>

      {/* 引用 badge */}
      {item.reference_count > 0 ? (
        <span
          aria-label={`被 ${item.reference_count} 处引用`}
          style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,.6)', color: '#fff',
            fontFamily: 'var(--mono)', fontSize: 10,
            padding: '1px 6px', borderRadius: 3,
          }}
        >
          ↗ {item.reference_count}
        </span>
      ) : (
        <span
          aria-label="未引用"
          style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(220,38,38,.85)', color: '#fff',
            fontFamily: 'var(--mono)', fontSize: 10,
            padding: '1px 6px', borderRadius: 3,
          }}
        >
          未引用
        </span>
      )}

      {/* 文件名条 */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '6px 8px',
          background: 'linear-gradient(to top, rgba(0,0,0,.78), transparent)',
          color: '#fff', fontFamily: 'var(--mono)', fontSize: 10,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {item.filename}
      </div>
    </li>
  );
}

function DetailSidebar({
  item,
  refs,
  onClose,
  onDelete,
  onForceDelete,
  onCopyUrl,
  onCopyMarkdown,
}: {
  item: MediaItem;
  refs: MediaReference[] | null;
  onClose: () => void;
  onDelete: () => void;
  onForceDelete: () => void;
  onCopyUrl: () => void;
  onCopyMarkdown: () => void;
}): JSX.Element {
  const [alt, setAlt] = useState<string>(() => item.filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
  const isImage = item.mime.startsWith('image/');

  // 同步 item 切换
  useEffect(() => {
    setAlt(item.filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
  }, [item.id]);

  const exif = parseFromName(item);

  return (
    <aside
      aria-label="媒体详情"
      class="media-page__detail"
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>详情</h3>
        <div class="hf-grow" />
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="关闭详情">
          <span aria-hidden="true">×</span>
        </Button>
      </header>

      <div
        style={{
          aspectRatio: '16 / 9',
          borderRadius: 'var(--radius)',
          background: 'var(--bg-sunk)',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isImage ? (
          <img src={item.url} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--ink-3)' }}>
            <div style={{ fontSize: 36, fontFamily: 'var(--mono)' }}>{extOf(item.filename) || '?'}</div>
            <div class="hf-tiny hf-muted">{item.mime}</div>
          </div>
        )}
      </div>

      <div>
        <div style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-all', marginBottom: 4 }}>{item.filename}</div>
        <div class="hf-mono hf-tiny hf-muted" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span>{formatBytes(item.bytes)}</span>
          <span aria-hidden="true">·</span>
          <span>{shortMime(item.mime)}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={item.uploaded_at.slice(0, 10)}>{item.uploaded_at.slice(0, 10)}</time>
        </div>
      </div>

      <div>
        <label htmlFor="media-alt" class="hf-tiny" style={{ color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>
          替代文本 (alt)
        </label>
        <input
          id="media-alt"
          type="text"
          value={alt}
          onInput={(e) => setAlt((e.target as HTMLInputElement).value)}
          aria-describedby="media-alt-hint"
          style={{ width: '100%', minHeight: 32, padding: '6px 8px', fontSize: 12 }}
        />
        <p id="media-alt-hint" class="hf-tiny hf-muted" style={{ margin: '4px 0 0 0' }}>
          供屏幕阅读器使用,粘贴 markdown 时会带上。
        </p>
      </div>

      {/* EXIF / 文件信息 */}
      <details>
        <summary class="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.05em' }}>▸ EXIF / 元数据</summary>
        <dl style={{ margin: '8px 0 0 0', fontSize: 12, display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 4, columnGap: 8 }}>
          {exif.map(([k, v]) => (
            <>
              <dt key={`k-${k}`} style={{ color: 'var(--ink-3)' }}>{k}</dt>
              <dd key={`v-${k}`} style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 11, wordBreak: 'break-all' }}>{v}</dd>
            </>
          ))}
        </dl>
      </details>

      {/* 引用列表 */}
      <div>
        <div class="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
          ▸ 引用 ({item.reference_count})
        </div>
        {refs === null ? (
          <p class="hf-tiny hf-muted" role="status" aria-live="polite">加载中…</p>
        ) : refs.length === 0 ? (
          <p class="hf-tiny hf-muted">未被任何笔记引用。可安全删除。</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {refs.map((r) => (
              <li key={r.slug}>
                <a href={`#/notes/${encodeURIComponent(r.slug)}`} style={{ fontSize: 12 }}>{r.title}</a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        <Button size="sm" variant="primary" onClick={onCopyMarkdown}>复制 markdown</Button>
        <Button size="sm" onClick={onCopyUrl}>复制 URL</Button>
        <a href={item.url} target="_blank" rel="noreferrer noopener" class="ui-btn ui-btn--sm" aria-label="在新标签打开">
          在新标签打开
        </a>
        <div class="hf-grow" />
        {item.reference_count > 0 ? (
          <Button size="sm" variant="danger" onClick={onForceDelete} aria-label="强制删除(忽略引用)">
            强制删除
          </Button>
        ) : (
          <Button size="sm" variant="danger" onClick={onDelete} aria-label="删除文件">
            删除
          </Button>
        )}
      </div>
    </aside>
  );
}

// ---- helpers ----

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return '';
  return name.slice(dot + 1).toUpperCase();
}

function shortMime(m: string): string {
  return m.replace(/^application\//, '').replace(/^image\//, '').replace(/^video\//, '');
}

function parseFromName(item: MediaItem): [string, string][] {
  const out: [string, string][] = [];
  out.push(['ID', item.id]);
  out.push(['MIME', item.mime]);
  out.push(['大小', formatBytes(item.bytes)]);
  out.push(['上传时间', item.uploaded_at]);
  // 尝试从文件名识别尺寸 (e.g. cover_1920x1080.png)
  const dim = item.filename.match(/(\d{2,5})x(\d{2,5})/);
  if (dim) out.push(['尺寸', `${dim[1]} × ${dim[2]} px`]);
  return out;
}

// ---- VaultPanel ---------------------------------------------------------
// "媒体库链接 FNS 附件库" — vaultDir 是 FNS 同步进来的笔记 + 附件根。
// 这里只读地列出 vaultDir 下的非 .md 文件。
function VaultPanel({
  data,
  onReload,
}: {
  data: { enabled: boolean; vault: string | null; items: VaultAttachment[] } | null;
  onReload: () => void;
}): JSX.Element {
  if (!data) {
    return <p role="status" aria-live="polite" style={{ padding: '24px 0' }}>扫描中…</p>;
  }
  if (!data.enabled) {
    return (
      <div class="ui-card" style={{ padding: 18, marginTop: 8 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700 }}>未启用 Vault 扫描</h3>
        <p class="hf-tiny hf-muted" style={{ margin: 0, lineHeight: 1.6 }}>
          后端没拿到 vaultDir(通常是因为 OPENNOTE_CONFIG / paths.vault 没配)。FNS 同步来的笔记 + 附件应该写到这个目录。
          配上之后,这里会列出所有同步进来的非 .md 文件。
        </p>
      </div>
    );
  }
  return (
    <section aria-label="Vault 附件" style={{ marginTop: 8 }}>
      <p class="hf-tiny hf-muted media-page__vault-meta">
        来源:<code>{data.vault}</code> · 共 {data.items.length} 个附件 ·{' '}
        <button
          type="button"
          class="ui-btn ui-btn--sm ui-btn--ghost"
          onClick={onReload}
          style={{ minHeight: 24, padding: '2px 8px' }}
        >
          刷新
        </button>
      </p>
      {data.items.length === 0 ? (
        <p class="hf-muted" style={{ padding: '24px 0' }}>vault 里还没有附件。</p>
      ) : (
        <div class="media-page__table-wrap">
          <table aria-label="Vault 附件列表" class="media-page__vault-table">
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: 'left' }}>路径</th>
                <th scope="col" style={{ textAlign: 'left', width: 110 }}>类型</th>
                <th scope="col" style={{ textAlign: 'right', width: 90 }}>大小</th>
                <th scope="col" style={{ textAlign: 'right', width: 150 }}>修改时间</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.rel_path}>
                  <td data-label="路径" style={{ wordBreak: 'break-all' }}>{it.rel_path}</td>
                  <td data-label="类型" class="hf-mono hf-tiny">{it.mime}</td>
                  <td data-label="大小" class="hf-mono hf-tiny" style={{ textAlign: 'right' }}>{formatBytes(it.bytes)}</td>
                  <td data-label="修改时间" class="hf-mono hf-tiny hf-muted" style={{ textAlign: 'right' }}>
                    {it.modified_at.slice(0, 16).replace('T', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
