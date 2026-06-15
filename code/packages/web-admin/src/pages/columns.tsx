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

type ColumnTone = 'blue' | 'mint' | 'amber' | 'violet' | 'sky' | 'rose';

export interface ColumnDisplayMeta {
  category: string;
  tone: ColumnTone;
  intro: string;
  visibilityLabel: string;
  visibilityTone: 'ok' | 'warn' | 'danger' | 'default';
  includedCount: number;
  publicCount: number;
  limitedCount: number;
  privateCount: number;
}

const VISIBILITIES: Visibility[] = ['public', 'unlisted', 'link-only', 'private'];
const TONE_BY_CATEGORY: Record<string, ColumnTone> = {
  渲染: 'blue',
  性能: 'mint',
  图形学: 'amber',
  架构: 'violet',
  AI: 'sky',
  工作: 'rose',
  知识库: 'violet',
  综合: 'blue',
};

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

export function columnDisplayMeta(column: ColumnSummary): ColumnDisplayMeta {
  const category = columnCategory(column.label);
  const publicCount = column.visibility.public;
  const limitedCount = column.visibility.unlisted + column.visibility['link-only'];
  const privateCount = column.visibility.private;
  const discoverableCount = publicCount + limitedCount;

  let visibilityLabel = '草稿';
  let visibilityTone: ColumnDisplayMeta['visibilityTone'] = 'danger';
  if (publicCount > 0) {
    visibilityLabel = '公开';
    visibilityTone = 'ok';
  } else if (discoverableCount > 0) {
    visibilityLabel = '半公开';
    visibilityTone = 'warn';
  } else if (column.visibility.private === column.notes.length) {
    visibilityLabel = '私密';
    visibilityTone = 'danger';
  }

  return {
    category,
    tone: TONE_BY_CATEGORY[category] ?? 'blue',
    intro: `${column.label} 目录下的 ${column.notes.length} 篇笔记,按 Obsidian vault 一级目录自动聚合。`,
    visibilityLabel,
    visibilityTone,
    includedCount: column.notes.length,
    publicCount,
    limitedCount,
    privateCount,
  };
}

export function publicColumnHref(column: ColumnSummary): string {
  const path = column.path.trim();
  if (!path) return '/columns/index.html';
  return `/folders/${encodeURIComponent(path)}.html`;
}

export function ColumnsPage(): JSX.Element {
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const selectedColumn = selectedId ? columns.find((column) => column.id === selectedId) ?? null : null;

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
          <a
            class="ui-btn ui-btn--sm ui-btn--ghost"
            href="#/vault"
            title="专栏来自 vault 一级目录"
          >
            <HfIcon name="folder" size={12} /> 打开笔记库
          </a>
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
              <ColumnCard key={column.id} column={column} onManage={() => setSelectedId(column.id)} />
            ))}
          </div>
        )}
      </section>

      {selectedColumn && (
        <ColumnDrawer column={selectedColumn} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function ColumnCard({ column, onManage }: { column: ColumnSummary; onManage: () => void }): JSX.Element {
  const meta = columnDisplayMeta(column);
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
            color: toneInk(meta.tone),
            background: toneBg(meta.tone),
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
        <Tag tone={meta.visibilityTone}>{meta.visibilityLabel}</Tag>
      </header>

      <p class="hf-sm hf-muted" style={{ margin: 0, lineHeight: 1.55 }}>
        {meta.intro}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
        <Metric label="收录" value={`${meta.includedCount}`} />
        <Metric label="公开" value={`${meta.publicCount}`} />
        <Metric label="半公开" value={`${meta.limitedCount}`} />
        <Metric label="私密" value={`${meta.privateCount}`} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <span class="ui-badge">{meta.category}</span>
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
        <button type="button" class="ui-btn ui-btn--sm" onClick={onManage}>
          <HfIcon name="settings" size={12} /> 查看详情
        </button>
        <a class="ui-btn ui-btn--sm ui-btn--ghost" href={`#/vault/${encodeURIComponent(column.path)}`}>
          <HfIcon name="note" size={12} /> 打开目录
        </a>
      </footer>
    </article>
  );
}

function ColumnDrawer({ column, onClose }: { column: ColumnSummary; onClose: () => void }): JSX.Element {
  const meta = columnDisplayMeta(column);
  return (
    <aside class="ws-e__sidebar" aria-label={`${column.label} 专栏设置`}>
      <header class="ws-e__sidebar-head">
        <div>
          <h2>{column.label}</h2>
          <div class="hf-mono hf-tiny hf-faint">{column.path || 'vault root'}</div>
        </div>
        <button type="button" class="ws-e__row-btn" onClick={onClose} aria-label="关闭专栏设置">
          关闭
        </button>
      </header>
      <div class="ws-e__sidebar-body">
        <section class="ws-e__field">
          <span class="ws-e__field-label">封面主题色</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['blue', 'mint', 'amber', 'violet', 'sky', 'rose'] as ColumnTone[]).map((tone) => (
              <span
                key={tone}
                aria-label={tone === meta.tone ? `当前主题 ${tone}` : `可选主题 ${tone}`}
                title={tone}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: `2px solid ${tone === meta.tone ? 'var(--accent)' : 'var(--line)'}`,
                  background: toneBg(tone),
                  display: 'inline-block',
                }}
              />
            ))}
          </div>
        </section>

        <section class="ws-e__field">
          <span class="ws-e__field-label">专栏名称</span>
          <input class="ui-input" value={column.label} readOnly aria-label="专栏名称" />
          <p class="hf-tiny hf-muted" style={{ margin: '6px 0 0' }}>
            当前专栏由 vault 一级目录驱动。需要调整专栏名称或归属时,请在 Obsidian 中维护目录后同步。
          </p>
        </section>

        <section class="ws-e__field">
          <span class="ws-e__field-label">专栏简介</span>
          <textarea class="ui-input" readOnly rows={3} value={meta.intro} aria-label="专栏简介" />
        </section>

        <div class="ws-e__form-grid2">
          <section class="ws-e__field">
            <span class="ws-e__field-label">分类</span>
            <input class="ui-input" value={meta.category} readOnly aria-label="专栏分类" />
          </section>
          <section class="ws-e__field">
            <span class="ws-e__field-label">可见性</span>
            <input class="ui-input" value={meta.visibilityLabel} readOnly aria-label="专栏可见性" />
          </section>
        </div>

        <section class="ws-e__panel" aria-labelledby={`col-${column.id}-notes`}>
          <header class="ws-e__panel-head">
            <h2 id={`col-${column.id}-notes`}>已收录笔记</h2>
            <span class="ws-e__panel-hint">{column.notes.length} 篇</span>
          </header>
          {column.notes.length === 0 ? (
            <p class="ws-e__empty">本专栏暂无笔记。</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {column.notes.slice(0, 12).map((note) => (
                <li
                  key={note.slug}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <a
                      class="hf-sm"
                      href={`#/note/${encodeURIComponent(note.slug)}`}
                      style={{ color: 'var(--ink)', fontWeight: 600 }}
                    >
                      {note.title || note.slug}
                    </a>
                    <div class="hf-mono hf-tiny hf-faint">{note.source_path ?? note.slug}</div>
                  </div>
                  <Tag tone={note.visibility === 'public' ? 'ok' : note.visibility === 'private' ? 'danger' : 'warn'}>
                    {visLabel(note.visibility)}
                  </Tag>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a class="ui-btn ui-btn--sm" href={publicColumnHref(column)} target="_blank" rel="noreferrer">
            <HfIcon name="eye" size={12} /> 前台查看
          </a>
          <a class="ui-btn ui-btn--sm ui-btn--ghost" href={`#/vault/${encodeURIComponent(column.path)}`}>
            <HfIcon name="folder" size={12} /> 打开目录
          </a>
        </div>
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg-sunk)' }}>
      <div class="hf-mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{value}</div>
      <div class="hf-tiny hf-muted" style={{ marginTop: 2 }}>{label}</div>
    </div>
  );
}

function visLabel(v: Visibility): string {
  if (v === 'public') return '公开';
  if (v === 'unlisted') return '不列出';
  if (v === 'link-only') return '仅链接';
  return '私有';
}

function columnCategory(label: string): string {
  const key = label.toLowerCase();
  if (/渲染|render|urp|shader/.test(key)) return key.includes('shader') ? '图形学' : '渲染';
  if (/性能|perf|优化/.test(key)) return '性能';
  if (/架构|architecture|system|系统/.test(key)) return '架构';
  if (/\bai\b|agent|智能/.test(key)) return 'AI';
  if (/work|周报|会议/.test(key)) return '工作';
  if (/docs|知识|wiki|笔记/.test(key)) return '知识库';
  return '综合';
}

function toneBg(tone: ColumnTone): string {
  const bg: Record<ColumnTone, string> = {
    blue: 'linear-gradient(135deg, #E4E9FF, #C9D3FF)',
    mint: 'linear-gradient(135deg, #DCFDF4, #B8F4E5)',
    amber: 'linear-gradient(135deg, #FFF0D9, #FFD9A8)',
    violet: 'linear-gradient(135deg, #EDE7FF, #D5C8FF)',
    sky: 'linear-gradient(135deg, #DFF4FF, #B9E4FF)',
    rose: 'linear-gradient(135deg, #FFE3EA, #FFC2D0)',
  };
  return bg[tone];
}

function toneInk(tone: ColumnTone): string {
  const ink: Record<ColumnTone, string> = {
    blue: '#4457D7',
    mint: '#087F6D',
    amber: '#9A5A00',
    violet: '#6650C8',
    sky: '#126E96',
    rose: '#B33A5A',
  };
  return ink[tone];
}
