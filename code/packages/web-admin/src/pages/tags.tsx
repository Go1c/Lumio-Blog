import { useEffect, useMemo, useState } from 'preact/hooks';
import { Tag } from '@opennote/ui';
import { api, type TagCount, type TaggedNote } from '../api.js';
import { WsEStyles } from '../components/ws-e-styles.js';

interface Props {
  tag?: string;
}

export interface TagTableRow extends TagCount {
  ratio: number;
  ratioLabel: string;
  weightLabel: '高频' | '中频' | '低频';
  weightClass: 'is-big' | 'is-mid' | '';
  trendLabel: '同步聚合';
}

export function TagsPage({ tag }: Props) {
  if (tag) return <TagDetail tag={tag} />;
  return <TagsList />;
}

export function buildTagTableRows(tags: TagCount[]): TagTableRow[] {
  const total = Math.max(1, tags.reduce((sum, tag) => sum + tag.count, 0));
  const max = Math.max(1, ...tags.map((tag) => tag.count));

  return tags.map((tag) => {
    const ratio = (tag.count / total) * 100;
    const weightClass = tag.count >= max * 0.72 ? 'is-big' : tag.count >= max * 0.3 ? 'is-mid' : '';
    return {
      ...tag,
      ratio,
      ratioLabel: `${ratio.toFixed(1)}%`,
      weightLabel: weightClass === 'is-big' ? '高频' : weightClass === 'is-mid' ? '中频' : '低频',
      weightClass,
      trendLabel: '同步聚合',
    };
  });
}

export function filterTagTableRows(rows: TagTableRow[], search: string): TagTableRow[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => row.tag.toLowerCase().includes(q));
}

function TagsList() {
  const [tags, setTags] = useState<TagCount[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.tags
      .list()
      .then((r) => setTags(r.tags))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const rows = useMemo(() => buildTagTableRows(tags ?? []), [tags]);
  const filtered = useMemo(() => filterTagTableRows(rows, search), [rows, search]);

  const totalNotes = useMemo(
    () => (tags ?? []).reduce((s, t) => s + t.count, 0),
    [tags],
  );

  return (
    <div class="ws-e">
      <WsEStyles />
      <div class="ws-e__header">
        <h1 class="ws-e__h1"><span aria-hidden="true">🏷️ </span>标签</h1>
        <p class="ws-e__lead">
          所有从 frontmatter <code>tags:</code> 同步上来的标签。点击进入查看属于该标签的笔记。
        </p>
      </div>

      <section aria-labelledby="tags-h" class="ws-e__panel">
        <header class="ws-e__panel-head">
          <h2 id="tags-h">{tags ? `${tags.length} 个标签` : '加载中…'}</h2>
          <span class="ws-e__panel-hint">{totalNotes} 个 (笔记, 标签) 关联</span>
          <div class="hf-grow" />
          <input
            type="search"
            placeholder="搜索标签…"
            aria-label="搜索标签"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            style={{ width: 200, height: 32, padding: '6px 10px' }}
          />
        </header>

        {error && <p role="alert" class="error">{error}</p>}
        <p
          role="note"
          aria-label="标签来源说明"
          class="hf-sm"
          style={{
            margin: 0,
            padding: '10px 16px',
            borderBottom: '1px solid var(--line)',
            color: 'var(--ink-3)',
            background: 'var(--bg-soft)',
          }}
        >
          标签来自 Obsidian frontmatter <code>tags:</code>。需要调整时请在 Obsidian 中维护笔记 frontmatter,再重新同步。
        </p>

        {tags === null ? (
          <p role="status" aria-live="polite" class="ws-e__empty">loading…</p>
        ) : filtered.length === 0 ? (
          <p class="ws-e__empty">{tags.length === 0 ? '还没有任何标签。' : '没有匹配的标签。'}</p>
        ) : (
          <>
            <div style={{ padding: 16, borderBottom: '1px solid var(--line)' }}>
              <ul
                class="tag-cloud"
                aria-label="标签云"
                style={{
                  listStyle: 'none', padding: 0, margin: 0,
                  display: 'flex', flexWrap: 'wrap', gap: 8,
                }}
              >
                {filtered.map((t) => (
                  <li key={t.tag}>
                    <a
                      class={`tag-pill ${t.weightClass}`}
                      href={`#/tags/${encodeURIComponent(t.tag)}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: t.weightClass === 'is-big' ? '8px 14px' : '6px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius)',
                        background: 'var(--bg-sunk)',
                        fontSize: t.weightClass === 'is-big' ? 15 : t.weightClass === 'is-mid' ? 14 : 13,
                        textDecoration: 'none',
                        color: 'var(--ink-1)',
                      }}
                      aria-label={`查看标签 ${t.tag} (${t.count} 个笔记)`}
                    >
                      <span class="hf-mono">#{t.tag}</span>
                      <span
                        class="hf-mono hf-tiny"
                        style={{
                          padding: '1px 6px',
                          borderRadius: 999,
                          background: 'var(--accent-soft)',
                          color: 'var(--accent)',
                        }}
                      >
                        {t.count}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div class="ws-e__table-wrap">
              <table class="ws-e__table" aria-label="标签列表">
                <thead>
                  <tr>
                    <th scope="col">标签</th>
                    <th scope="col">笔记数</th>
                    <th scope="col" style={{ width: '30%' }}>占比</th>
                    <th scope="col">热度</th>
                    <th scope="col">趋势</th>
                    <th scope="col">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.tag}>
                      <td data-label="标签">
                        <a href={`#/tags/${encodeURIComponent(t.tag)}`} style={{ fontWeight: 600 }}>
                          #{t.tag}
                        </a>
                      </td>
                      <td data-label="笔记数" class="hf-mono hf-tiny">{t.count}</td>
                      <td data-label="占比">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            aria-hidden="true"
                            style={{
                              height: 8,
                              flex: 1,
                              borderRadius: 999,
                              background: 'var(--bg-sunk)',
                              overflow: 'hidden',
                              border: '1px solid var(--line)',
                            }}
                          >
                            <span
                              style={{
                                display: 'block',
                                height: '100%',
                                width: `${Math.max(4, Math.min(100, t.ratio))}%`,
                                background: 'var(--accent)',
                              }}
                            />
                          </div>
                          <span class="hf-mono hf-tiny hf-muted">{t.ratioLabel}</span>
                        </div>
                      </td>
                      <td data-label="热度">
                        <Tag tone={t.weightClass === 'is-big' ? 'ok' : t.weightClass === 'is-mid' ? 'warn' : 'default'}>
                          {t.weightLabel}
                        </Tag>
                      </td>
                      <td data-label="趋势">
                        <Tag tone="default">{t.trendLabel}</Tag>
                      </td>
                      <td data-label="操作">
                        <a
                          class="ws-e__row-btn"
                          href="#/config-docs"
                          title="标签由 Obsidian frontmatter 同步,后台不直接改写源文件"
                        >
                          在 Obsidian 中维护
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function TagDetail({ tag }: { tag: string }) {
  const [notes, setNotes] = useState<TaggedNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotes(null);
    api.tags
      .notesForTag(tag)
      .then((r) => setNotes(r.notes))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [tag]);

  return (
    <div class="ws-e">
      <WsEStyles />
      <div class="ws-e__header">
        <h1 class="ws-e__h1">
          <a href="#/tags" style={{ color: 'inherit', textDecoration: 'none' }}>
            <span aria-hidden="true">🏷️ </span>标签
          </a>
          <span style={{ margin: '0 .4em', color: 'var(--ink-3)' }}>/</span>
          <code class="hf-mono">{tag}</code>
        </h1>
      </div>

      <section aria-labelledby="tag-notes-h" class="ws-e__panel">
        <header class="ws-e__panel-head">
          <h2 id="tag-notes-h">{notes ? `${notes.length} 篇笔记` : '加载中…'}</h2>
        </header>

        {error && <p role="alert" class="error">{error}</p>}

        {notes === null ? (
          <p role="status" aria-live="polite" class="ws-e__empty">loading…</p>
        ) : notes.length === 0 ? (
          <p class="ws-e__empty">没有笔记带这个标签。</p>
        ) : (
          <div class="ws-e__table-wrap">
            <table class="ws-e__table" aria-label={`标签 ${tag} 下的笔记`}>
              <thead>
                <tr>
                  <th scope="col">标题</th>
                  <th scope="col">可见性</th>
                  <th scope="col">最后更新</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((n) => (
                  <tr key={n.slug}>
                    <td>
                      <a href={`#/note/${encodeURIComponent(n.slug)}`}>{n.title || n.slug}</a>
                      <div class="hf-mono hf-tiny hf-faint">{n.slug}</div>
                    </td>
                    <td>
                      {(() => {
                        const t = visTone(n.visibility);
                        return t ? <Tag tone={t}>{n.visibility}</Tag> : <Tag>{n.visibility}</Tag>;
                      })()}
                    </td>
                    <td class="hf-mono hf-tiny hf-muted">
                      <time dateTime={n.updated_at.slice(0, 10)}>{n.updated_at.slice(0, 10)}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function visTone(v: string): 'ok' | 'warn' | 'danger' | undefined {
  if (v === 'public') return 'ok';
  if (v === 'unlisted' || v === 'link-only') return 'warn';
  if (v === 'private') return 'danger';
  return undefined;
}
