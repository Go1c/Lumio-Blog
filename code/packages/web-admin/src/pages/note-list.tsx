import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { HfIcon, Tag } from '@opennote/ui';
import {
  api,
  type FolderTreeResponse,
  type NoteSummary,
  type Visibility,
} from '../api.js';

const VISIBILITY_FILTERS: Array<{ id: Visibility | 'all'; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'public', label: '公开' },
  { id: 'unlisted', label: '不列出' },
  { id: 'link-only', label: '仅链接' },
  { id: 'private', label: '私有' },
];

type SortKey = 'updated' | 'words' | 'title' | 'path';
type ViewMode = 'tree' | 'flat';

const VIEW_STORAGE_KEY = 'opennote.note-list.view';
const PATH_STORAGE_KEY = 'opennote.note-list.path';

function readView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    if (v === 'flat' || v === 'tree') return v;
  } catch {
    /* SSR / restricted env */
  }
  return 'tree';
}

function readPath(): string {
  try {
    return localStorage.getItem(PATH_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function NoteList(): JSX.Element {
  const [view, setView] = useState<ViewMode>(readView);
  const [path, setPath] = useState<string>(readPath);
  const [tree, setTree] = useState<FolderTreeResponse | null>(null);
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Visibility | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('updated');
  const [busySlug, setBusySlug] = useState<string | null>(null);

  // 持久化 view + path
  useEffect(() => {
    try { localStorage.setItem(VIEW_STORAGE_KEY, view); } catch { /* ignore */ }
  }, [view]);
  useEffect(() => {
    try { localStorage.setItem(PATH_STORAGE_KEY, path); } catch { /* ignore */ }
  }, [path]);

  const loadFlat = (): Promise<void> =>
    api
      .listNotes()
      .then((r) => setNotes(r.notes))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));

  const loadTree = (p: string): Promise<void> =>
    api
      .notesTree(p)
      .then((r) => {
        setTree(r);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));

  useEffect(() => {
    if (view === 'flat') void loadFlat();
    else void loadTree(path);
  }, [view, path]);

  const reload = (): Promise<void> =>
    view === 'flat' ? loadFlat() : loadTree(path);

  // 平铺视图筛选
  const filteredFlat = useMemo(() => {
    if (!notes) return [];
    let arr = notes;
    if (filter !== 'all') arr = arr.filter((n) => n.visibility === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.slug.toLowerCase().includes(q) ||
          (n.source_path ?? '').toLowerCase().includes(q),
      );
    }
    return sortNotes(arr, sort);
  }, [notes, query, filter, sort]);

  // 目录视图筛选(只在当前层笔记上跑)
  const filteredTreeNotes = useMemo(() => {
    if (!tree) return [];
    let arr = tree.notes;
    if (filter !== 'all') arr = arr.filter((n) => n.visibility === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (n) => n.title.toLowerCase().includes(q) || n.slug.toLowerCase().includes(q),
      );
    }
    return sortNotes(arr, sort);
  }, [tree, query, filter, sort]);

  const counts = useMemo(() => {
    const out: Record<Visibility | 'all', number> = {
      all: 0, public: 0, unlisted: 0, 'link-only': 0, private: 0,
    };
    const src = view === 'flat' ? notes : tree?.notes ?? null;
    if (!src) return out;
    out.all = src.length;
    for (const n of src) out[n.visibility] = (out[n.visibility] ?? 0) + 1;
    return out;
  }, [view, notes, tree]);

  const totalForHeader = view === 'flat'
    ? notes?.length ?? 0
    : (tree?.folders.length ?? 0) + (tree?.notes.length ?? 0);

  const cycleVisibility = async (n: NoteSummary): Promise<void> => {
    const order: Visibility[] = ['public', 'unlisted', 'link-only', 'private'];
    const idx = order.indexOf(n.visibility);
    const next = order[(idx + 1) % order.length]!;
    setBusySlug(n.slug);
    try {
      const patch: { visibility: Visibility; searchable?: boolean } = { visibility: next };
      if ((next === 'link-only' || next === 'private') && n.searchable) patch.searchable = false;
      await api.patchMeta(n.slug, patch);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusySlug(null);
    }
  };

  const loading = view === 'flat' ? !notes && !error : !tree && !error;
  if (loading) return <p role="status" aria-live="polite">载入中…</p>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>笔记库</h1>
        <span class="hf-mono hf-tiny hf-faint">
          {view === 'tree' ? `${tree?.folders.length ?? 0} 目录 · ${tree?.notes.length ?? 0} 笔记` : `${totalForHeader} 篇`}
        </span>
        <div class="hf-grow" />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {error && (
        <div
          role="alert"
          class="hf-tiny"
          style={{
            padding: 10,
            marginBottom: 12,
            background: 'var(--danger-soft)',
            borderRadius: 6,
            color: 'var(--danger-text)',
          }}
        >
          {error}
        </div>
      )}

      {view === 'tree' && tree && (
        <Breadcrumbs
          path={tree.path}
          breadcrumbs={tree.breadcrumbs}
          onJump={(p) => setPath(p)}
        />
      )}

      {/* toolbar */}
      <div
        class="ui-card"
        style={{
          padding: 12,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-3)',
            }}
          >
            <HfIcon name="search" size={13} />
          </span>
          <input
            type="search"
            class="ui-input"
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            placeholder={view === 'tree' ? '搜索本目录笔记…' : '搜索标题 / slug / 路径…'}
            aria-label="搜索笔记"
            style={{ paddingLeft: 28 }}
          />
        </div>

        <div role="radiogroup" aria-label="可见性筛选" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {VISIBILITY_FILTERS.map((f) => (
            <Tag
              key={f.id}
              pressable
              pressed={filter === f.id}
              tone={filter === f.id ? 'accent' : 'default'}
              onClick={() => setFilter(f.id)}
              aria-label={`筛选 ${f.label}`}
            >
              {f.label} ({counts[f.id] ?? 0})
            </Tag>
          ))}
        </div>

        <div class="hf-grow" />

        <label
          class="hf-tiny hf-muted"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          排序
          <select
            class="ui-input"
            style={{ padding: '4px 8px', minHeight: 30, width: 'auto' }}
            value={sort}
            onChange={(e) => setSort((e.currentTarget as HTMLSelectElement).value as SortKey)}
            aria-label="排序"
          >
            <option value="updated">最近更新</option>
            <option value="title">标题 A→Z</option>
            <option value="words">字数 多→少</option>
            {view === 'flat' && <option value="path">路径</option>}
          </select>
        </label>
      </div>

      {view === 'tree' ? (
        <TreeView
          tree={tree!}
          notes={filteredTreeNotes}
          busySlug={busySlug}
          onEnterFolder={(p) => setPath(p)}
          onCycle={cycleVisibility}
        />
      ) : (
        <FlatTable
          notes={filteredFlat}
          busySlug={busySlug}
          onCycle={cycleVisibility}
        />
      )}
    </div>
  );
}

function sortNotes(arr: NoteSummary[], sort: SortKey): NoteSummary[] {
  const out = [...arr];
  if (sort === 'words') out.sort((a, b) => b.word_count - a.word_count);
  else if (sort === 'title') out.sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === 'path') {
    out.sort((a, b) => (a.source_path ?? '').localeCompare(b.source_path ?? ''));
  } else out.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  return out;
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}): JSX.Element {
  return (
    <div role="radiogroup" aria-label="浏览方式" style={{ display: 'flex', gap: 4 }}>
      <Tag
        pressable
        pressed={view === 'tree'}
        tone={view === 'tree' ? 'accent' : 'default'}
        onClick={() => onChange('tree')}
        aria-label="目录浏览"
      >
        <HfIcon name="folder" size={11} /> 目录
      </Tag>
      <Tag
        pressable
        pressed={view === 'flat'}
        tone={view === 'flat' ? 'accent' : 'default'}
        onClick={() => onChange('flat')}
        aria-label="平铺浏览"
      >
        <HfIcon name="layers" size={11} /> 平铺
      </Tag>
    </div>
  );
}

function Breadcrumbs({
  path,
  breadcrumbs,
  onJump,
}: {
  path: string;
  breadcrumbs: { name: string; path: string }[];
  onJump: (p: string) => void;
}): JSX.Element {
  const tailName = path === '' ? null : path.split('/').slice(-1)[0]!;
  return (
    <nav
      aria-label="面包屑"
      class="hf-sm"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}
    >
      <BreadcrumbLink label="vault" active={path === ''} onClick={() => onJump('')} />
      {breadcrumbs.map((b) => (
        <span key={b.path} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span class="hf-faint" aria-hidden="true">/</span>
          <BreadcrumbLink label={b.name} active={false} onClick={() => onJump(b.path)} />
        </span>
      ))}
      {tailName && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span class="hf-faint" aria-hidden="true">/</span>
          <BreadcrumbLink label={tailName} active onClick={() => { /* no-op */ }} />
        </span>
      )}
    </nav>
  );
}

function BreadcrumbLink({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  if (active) {
    return <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{label}</span>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        color: 'var(--ink-3)',
        cursor: 'pointer',
        font: 'inherit',
      }}
    >
      {label}
    </button>
  );
}

function TreeView({
  tree,
  notes,
  busySlug,
  onEnterFolder,
  onCycle,
}: {
  tree: FolderTreeResponse;
  notes: NoteSummary[];
  busySlug: string | null;
  onEnterFolder: (path: string) => void;
  onCycle: (n: NoteSummary) => void;
}): JSX.Element {
  const showFolders = tree.folders.length > 0;
  const showNotes = notes.length > 0;

  return (
    <>
      {showFolders && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 10,
            marginBottom: showNotes ? 16 : 0,
          }}
        >
          {tree.folders.map((f) => (
            <FolderCard key={f.path} entry={f} onEnter={() => onEnterFolder(f.path)} />
          ))}
        </div>
      )}

      {showNotes && (
        <FlatTable notes={notes} busySlug={busySlug} onCycle={onCycle} />
      )}

      {!showFolders && !showNotes && (
        <p
          class="hf-sm hf-muted"
          style={{ padding: 24, textAlign: 'center' }}
        >
          这个目录下没有笔记
        </p>
      )}
    </>
  );
}

function FolderCard({
  entry,
  onEnter,
}: {
  entry: { name: string; path: string; note_count: number; updated_at: string | null };
  onEnter: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onEnter}
      class="ui-card"
      aria-label={`进入目录 ${entry.name},含 ${entry.note_count} 篇笔记`}
      style={{
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
        cursor: 'pointer',
        background: 'var(--bg)',
        border: '1px solid var(--line)',
        font: 'inherit',
        color: 'inherit',
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'var(--accent-soft, var(--bg-soft))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <HfIcon name="folder" size={18} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {entry.name}
        </div>
        <div class="hf-tiny hf-muted" style={{ marginTop: 2 }}>
          {entry.note_count} 篇
          {entry.updated_at && (
            <>
              {' · '}
              <time dateTime={entry.updated_at.slice(0, 10)}>
                {entry.updated_at.slice(0, 10)}
              </time>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function FlatTable({
  notes,
  busySlug,
  onCycle,
}: {
  notes: NoteSummary[];
  busySlug: string | null;
  onCycle: (n: NoteSummary) => void;
}): JSX.Element {
  if (notes.length === 0) {
    return (
      <p class="hf-sm hf-muted" style={{ padding: 24, textAlign: 'center' }}>
        没有匹配的笔记
      </p>
    );
  }
  return (
    <div class="ui-card" style={{ padding: 0, overflow: 'hidden' }}>
      <table
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
        aria-label="所有笔记"
      >
        <caption class="sr-only">笔记列表,共 {notes.length} 条</caption>
        <thead>
          <tr style={{ background: 'var(--bg-soft)', textAlign: 'left' }}>
            <th scope="col" style={th()}>标题</th>
            <th scope="col" style={th(80)}>可见性</th>
            <th scope="col" style={th(56)}>搜索</th>
            <th scope="col" style={th(96)}>短链</th>
            <th scope="col" style={th(60)}>字数</th>
            <th scope="col" style={th(120)}>更新</th>
            <th scope="col" style={th(120)} aria-label="操作"></th>
          </tr>
        </thead>
        <tbody>
          {notes.map((n, i) => (
            <NoteRow
              key={n.slug}
              note={n}
              isBusy={busySlug === n.slug}
              onCycle={() => onCycle(n)}
              zebra={i % 2 === 1}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function th(width?: number): JSX.CSSProperties {
  return {
    padding: '10px 12px',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '.04em',
    color: 'var(--ink-3)',
    borderBottom: '1px solid var(--line)',
    width: width !== undefined ? `${width}px` : undefined,
  };
}

function NoteRow({
  note,
  isBusy,
  onCycle,
  zebra,
}: {
  note: NoteSummary;
  isBusy: boolean;
  onCycle: () => void;
  zebra: boolean;
}): JSX.Element {
  const [hover, setHover] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        background: zebra ? 'var(--bg-soft)' : 'transparent',
        opacity: isBusy ? 0.5 : 1,
        borderBottom: '1px solid var(--line)',
      }}
    >
      <td style={td()}>
        <a
          href={`#/notes/${encodeURIComponent(note.slug)}`}
          style={{ color: 'var(--ink)', textDecoration: 'none', fontWeight: 500 }}
        >
          {note.title}
        </a>
        <div class="hf-mono hf-tiny hf-faint" style={{ marginTop: 2 }}>
          {note.source_path ?? note.slug}
        </div>
      </td>
      <td style={td()}>
        <span
          class={`ui-badge ui-badge--${note.visibility}`}
          aria-label={`可见性:${visLabel(note.visibility)}`}
        >
          {visLabel(note.visibility)}
        </span>
      </td>
      <td style={td()} aria-label={note.searchable ? '可搜索' : '不可搜索'}>
        {note.searchable ? '✓' : '—'}
      </td>
      <td style={td()}>
        {note.short_id ? (
          <code class="hf-mono hf-tiny" style={{ color: 'var(--accent)' }}>
            /n/{note.short_id}
          </code>
        ) : (
          <span class="hf-tiny hf-muted">—</span>
        )}
      </td>
      <td style={td()} class="hf-mono hf-tiny">
        {note.word_count}
      </td>
      <td style={td()} class="hf-mono hf-tiny hf-muted">
        <time dateTime={note.updated_at.slice(0, 10)}>{note.updated_at.slice(0, 10)}</time>
      </td>
      <td style={{ ...td(), textAlign: 'right' }}>
        <div
          style={{
            display: 'flex',
            gap: 4,
            justifyContent: 'flex-end',
            visibility: hover ? 'visible' : 'hidden',
          }}
        >
          <button
            type="button"
            class="ui-btn ui-btn--sm ui-btn--ghost"
            onClick={onCycle}
            disabled={isBusy}
            aria-label={`切换可见性,当前 ${note.visibility}`}
          >
            <HfIcon name="eye" size={11} />
          </button>
          <a
            class="ui-btn ui-btn--sm ui-btn--ghost"
            href={`#/notes/${encodeURIComponent(note.slug)}/analytics`}
            aria-label="单篇 analytics"
          >
            <HfIcon name="chart" size={11} />
          </a>
        </div>
      </td>
    </tr>
  );
}

function td(): JSX.CSSProperties {
  return { padding: '10px 12px', verticalAlign: 'middle' };
}

function visLabel(v: Visibility): string {
  if (v === 'public') return '公开';
  if (v === 'unlisted') return '不列出';
  if (v === 'link-only') return '仅链接';
  if (v === 'private') return '私有';
  return v;
}
