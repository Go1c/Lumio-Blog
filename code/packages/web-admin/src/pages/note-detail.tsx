import { useEffect, useState } from 'preact/hooks';
import { api, type NoteDetail, type Visibility } from '../api.js';

const VISIBILITIES: Visibility[] = ['public', 'unlisted', 'link-only', 'private'];

export function NoteDetailPage({ slug }: { slug: string }) {
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [backlinks, setBacklinks] = useState<{ src_slug: string; title: string }[]>([]);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.getNote(slug).then((r) => {
      setNote(r.note);
      setBacklinks(r.backlinks);
    });

  useEffect(() => {
    load();
  }, [slug]);

  if (!note) return <p role="status" aria-live="polite">loading…</p>;

  const setVisibility = async (v: Visibility) => {
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

  const toggleSearchable = async () => {
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

  const searchableDisabled =
    note.visibility === 'link-only' || note.visibility === 'private';

  return (
    <div class="detail">
      <nav class="crumbs" aria-label="面包屑"><a href="#/"><span aria-hidden="true">← </span>笔记列表</a></nav>
      <h2>{note.title}</h2>
      <p class="meta">
        <span class={`badge ${note.visibility}`} aria-label={`可见性:${note.visibility}`}>{note.visibility}</span>
        {note.short_id && <> <span aria-hidden="true">·</span> <code>/n/{note.short_id}</code></>}
        <span aria-hidden="true">{' · '}</span>
        <span aria-label={`${note.word_count} 字`}>{note.word_count} 字</span>
        <span aria-hidden="true"> · </span>
        <span aria-label={`阅读时长 ${note.reading_minutes} 分钟`}>{note.reading_minutes} 分钟</span>
      </p>

      <div class="controls">
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ margin: '0 0 8px 0', fontSize: 12, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>可见性</legend>
          <div class="radio-group" role="radiogroup" aria-label="文章可见性">
            {VISIBILITIES.map((v) => (
              <label key={v}>
                <input
                  type="radio"
                  name="visibility"
                  checked={note.visibility === v}
                  disabled={busy}
                  onChange={() => setVisibility(v)}
                />
                {v}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <h3 id="searchable-h">可搜索</h3>
          <label>
            <input
              type="checkbox"
              checked={!!note.searchable}
              disabled={busy || searchableDisabled}
              aria-describedby={searchableDisabled ? 'searchable-help' : undefined}
              onChange={toggleSearchable}
            />
            {note.searchable ? '是' : '否'}
          </label>
          {searchableDisabled && (
            <p id="searchable-help" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              {note.visibility} 不允许 searchable
            </p>
          )}
        </div>

        <div>
          <h3>短链</h3>
          <code aria-label="短链">{note.short_id ?? '—'}</code>
        </div>
      </div>

      {backlinks.length > 0 && (
        <section aria-labelledby="backlinks-h">
          <h3 id="backlinks-h">反向链接</h3>
          <ul>
            {backlinks.map((b) => (
              <li key={b.src_slug}>
                <a href={`#/notes/${encodeURIComponent(b.src_slug)}`}>{b.title}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="preview-h">
        <h3 id="preview-h">预览</h3>
        <div dangerouslySetInnerHTML={{ __html: note.body_html }} />
      </section>

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
