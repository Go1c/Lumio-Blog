import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { HfIcon, Tag } from '@opennote/ui';
import { api, type NoteSummary, type Visibility } from '../api.js';

const VISIBILITY_FILTERS: Array<{ id: Visibility | 'all'; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'public', label: '公开' },
  { id: 'unlisted', label: '不列出' },
  { id: 'link-only', label: '仅链接' },
  { id: 'private', label: '私有' },
];

type SortKey = 'updated' | 'words' | 'title';

export function NoteList(): JSX.Element {
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Visibility | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('updated');
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const load = (): Promise<void> =>
    api
      .listNotes()
      .then((r) => {
        setNotes(r.notes);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!notes) return [];
    let arr = notes;
    if (filter !== 'all') arr = arr.filter((n) => n.visibility === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (n) => n.title.toLowerCase().includes(q) || n.slug.toLowerCase().includes(q),
      );
    }
    arr = [...arr];
    if (sort === 'words') arr.sort((a, b) => b.word_count - a.word_count);
    else if (sort === 'title') arr.sort((a, b) => a.title.localeCompare(b.title));
    else arr.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    return arr;
  }, [notes, query, filter, sort]);

  const counts = useMemo(() => {
    const out: Record<Visibility | 'all', number> = {
      all: 0,
      public: 0,
      unlisted: 0,
      'link-only': 0,
      private: 0,
    };
    if (!notes) return out;
    out.all = notes.length;
    for (const n of notes) out[n.visibility] = (out[n.visibility] ?? 0) + 1;
    return out;
  }, [notes]);

  const cycleVisibility = async (n: NoteSummary): Promise<void> => {
    const order: Visibility[] = ['public', 'unlisted', 'link-only', 'private'];
    const idx = order.indexOf(n.visibility);
    const next = order[(idx + 1) % order.length]!;
    setBusySlug(n.slug);
    try {
      const patch: { visibility: Visibility; searchable?: boolean } = { visibility: next };
      if ((next === 'link-only' || next === 'private') && n.searchable) patch.searchable = false;
      await api.patchMeta(n.slug, patch);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusySlug(null);
    }
  };

  if (!notes && !error) return <p role="status" aria-live="polite">载入中…</p>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>笔记库</h1>
        <span class="hf-mono hf-tiny hf-faint">{counts.all} 篇</span>
      </div>

      {error && (
        <div role="alert" class="hf-tiny" style={{ padding: 10, marginBottom: 12, background: 'var(--danger-soft)', borderRadius: 6, color: 'var(--danger-text)' }}>
          {error}
        </div>
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
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}
          >
            <HfIcon name="search" size={13} />
          </span>
          <input
            type="search"
            class="ui-input"
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            placeholder="搜索标题或 slug…"
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

        <label class="hf-tiny hf-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
          </select>
        </label>
      </div>

      {/* list */}
      {filtered.length === 0 ? (
        <p class="hf-sm hf-muted" style={{ padding: 24, textAlign: 'center' }}>
          没有匹配的笔记
        </p>
      ) : (
        <div class="ui-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }} aria-label="所有笔记">
            <caption class="sr-only">所有笔记的列表,共 {filtered.length} 条</caption>
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
              {filtered.map((n, i) => (
                <NoteRow
                  key={n.slug}
                  note={n}
                  isBusy={busySlug === n.slug}
                  onCycle={() => void cycleVisibility(n)}
                  zebra={i % 2 === 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
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
          {note.slug}
        </div>
      </td>
      <td style={td()}>
        <span class={`ui-badge ui-badge--${note.visibility}`} aria-label={`可见性:${visLabel(note.visibility)}`}>
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
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', visibility: hover ? 'visible' : 'hidden' }}>
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
