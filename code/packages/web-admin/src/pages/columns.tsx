import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { HfIcon, Tag } from '@opennote/ui';
import { api, type NoteSummary, type Visibility } from '../api.js';
import { WsEStyles } from '../components/ws-e-styles.js';

export interface ColumnSummary {
  id: string;
  label: string;
  path: string;
  notes: NoteSummary[];
  latest: string | null;
  visibility: Record<Visibility, number>;
}

const VISIBILITIES: Visibility[] = ['public', 'unlisted', 'link-only', 'private'];

export function groupNotesByColumn(notes: NoteSummary[]): ColumnSummary[] {
  const map = new Map<string, ColumnSummary>();

  for (const note of notes) {
    const path = note.source_path ?? note.slug;
    const first = path.includes('/') ? path.split('/')[0]!.trim() : '';
    const id = first || '__root__';
    const label = first || '未归档';
    let column = map.get(id);
    if (!column) {
      column = {
        id,
        label,
        path: first,
        notes: [],
        latest: null,
        visibility: { public: 0, unlisted: 0, 'link-only': 0, private: 0 },
      };
      map.set(id, column);
    }
    column.notes.push(note);
    column.visibility[note.visibility] += 1;
    if (!column.latest || note.updated_at > column.latest) column.latest = note.updated_at;
  }

  return [...map.values()]
    .map((column) => ({
      ...column,
      notes: [...column.notes].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)),
    }))
    .sort((a, b) => {
      if (a.id === '__root__') return 1;
      if (b.id === '__root__') return -1;
      return b.notes.length - a.notes.length || a.label.localeCompare(b.label);
    });
}

export function ColumnsPage(): JSX.Element {
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listNotes()
      .then((r) => {
        setNotes(r.notes);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const columns = useMemo(() => groupNotesByColumn(notes ?? []), [notes]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return columns;
    return columns.filter((column) => (
      column.label.toLowerCase().includes(q) ||
      column.notes.some((note) =>
        note.title.toLowerCase().includes(q) ||
        note.slug.toLowerCase().includes(q) ||
        (note.source_path ?? '').toLowerCase().includes(q),
      )
    ));
  }, [columns, query]);

  return (
    <div class="ws-e">
      <WsEStyles />
      <div class="ws-e__header">
        <h1 class="ws-e__h1"><span aria-hidden="true">▸ </span>专栏</h1>
        <p class="ws-e__lead">按同步文件的一级目录聚合文章。新文章默认私有,需要在笔记库里手动公开。</p>
      </div>

      <section class="ws-e__panel" aria-labelledby="columns-h">
        <header class="ws-e__panel-head">
          <h2 id="columns-h">{notes ? `${columns.length} 个专栏` : '加载中…'}</h2>
          <span class="ws-e__panel-hint">{notes?.length ?? 0} 篇文章</span>
          <div class="hf-grow" />
          <input
            type="search"
            placeholder="搜索专栏 / 文章…"
            aria-label="搜索专栏"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            style={{ width: 220, height: 32, padding: '6px 10px' }}
          />
        </header>

        {error && <p role="alert" class="error" style={{ padding: '0 16px' }}>{error}</p>}

        {notes === null ? (
          <p class="ws-e__empty" role="status" aria-live="polite">loading…</p>
        ) : filtered.length === 0 ? (
          <p class="ws-e__empty">{columns.length === 0 ? '还没有同步文章。' : '没有匹配的专栏。'}</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
              padding: 16,
            }}
          >
            {filtered.map((column) => (
              <ColumnCard key={column.id} column={column} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ColumnCard({ column }: { column: ColumnSummary }): JSX.Element {
  const latestNotes = column.notes.slice(0, 4);
  return (
    <article
      class="ui-card"
      style={{
        padding: 16,
        display: 'grid',
        gap: 14,
        background: '#fff',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--primary-d)',
            background: 'var(--accent-soft)',
            flexShrink: 0,
          }}
        >
          <HfIcon name="book" size={18} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 16, lineHeight: 1.3, color: 'var(--ink)' }}>{column.label}</h2>
          <div class="hf-mono hf-tiny hf-faint" style={{ marginTop: 3 }}>
            {column.path || 'vault root'}
          </div>
        </div>
        <Tag tone="accent">{column.notes.length} 篇</Tag>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {VISIBILITIES.map((visibility) => (
          <span key={visibility} class={`ui-badge ui-badge--${visibility}`}>
            {visLabel(visibility)} {column.visibility[visibility]}
          </span>
        ))}
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {latestNotes.map((note) => (
          <li key={note.slug} style={{ display: 'grid', gap: 2 }}>
            <a
              href={`#/note/${encodeURIComponent(note.slug)}`}
              style={{
                color: 'var(--ink)',
                fontWeight: 600,
                fontSize: 13,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {note.title || note.slug}
            </a>
            <span class="hf-mono hf-tiny hf-faint">{note.updated_at.slice(0, 10)}</span>
          </li>
        ))}
      </ul>

      <footer style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {column.latest && (
          <span class="hf-mono hf-tiny hf-muted">
            最近更新 <time dateTime={column.latest}>{column.latest.slice(0, 10)}</time>
          </span>
        )}
        <div class="hf-grow" />
        <a class="ui-btn ui-btn--sm ui-btn--ghost" href="#/vault">
          <HfIcon name="note" size={12} /> 管理文章
        </a>
      </footer>
    </article>
  );
}

function visLabel(v: Visibility): string {
  if (v === 'public') return '公开';
  if (v === 'unlisted') return '不列出';
  if (v === 'link-only') return '仅链接';
  return '私有';
}
