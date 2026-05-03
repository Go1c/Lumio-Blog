import { useEffect, useMemo, useState } from 'preact/hooks';
import { Tag } from '@opennote/ui';
import { api, type TagCount, type TaggedNote } from '../api.js';
import { WsEStyles } from '../components/ws-e-styles.js';

interface Props {
  tag?: string;
}

export function TagsPage({ tag }: Props) {
  if (tag) return <TagDetail tag={tag} />;
  return <TagsList />;
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

  const filtered = useMemo(() => {
    if (!tags) return [];
    const q = search.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.tag.toLowerCase().includes(q));
  }, [tags, search]);

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

        {tags === null ? (
          <p role="status" aria-live="polite" class="ws-e__empty">loading…</p>
        ) : filtered.length === 0 ? (
          <p class="ws-e__empty">{tags.length === 0 ? '还没有任何标签。' : '没有匹配的标签。'}</p>
        ) : (
          <ul
            class="tag-cloud"
            style={{
              listStyle: 'none', padding: 0, margin: 0,
              display: 'flex', flexWrap: 'wrap', gap: 8,
            }}
          >
            {filtered.map((t) => (
              <li key={t.tag}>
                <a
                  href={`#/tags/${encodeURIComponent(t.tag)}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg-sunk)',
                    fontSize: 13,
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
                      <a href={`#/notes/${encodeURIComponent(n.slug)}`}>{n.title || n.slug}</a>
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
