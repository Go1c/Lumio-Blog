import { useEffect, useState } from 'preact/hooks';
import { api, type NoteSummary } from '../api.js';

export function NoteList() {
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);

  useEffect(() => {
    api.listNotes().then((r) => setNotes(r.notes));
  }, []);

  if (!notes) return <p role="status" aria-live="polite">loading…</p>;

  const counts: Record<NoteSummary['visibility'], number> = { public: 0, unlisted: 0, 'link-only': 0, private: 0 };
  for (const n of notes) counts[n.visibility] = (counts[n.visibility] ?? 0) + 1;

  return (
    <>
      <h2 class="sr-only">笔记概览</h2>
      <ul class="kpis" aria-label="笔记统计">
        <Kpi label="总笔记" value={notes.length} />
        <Kpi label="公开" value={counts.public} />
        <Kpi label="不列出" value={counts.unlisted} />
        <Kpi label="私有" value={counts.private} />
      </ul>
      <table aria-label="所有笔记">
        <caption class="sr-only">所有笔记的列表,共 {notes.length} 条</caption>
        <thead>
          <tr>
            <th scope="col">标题</th>
            <th scope="col">可见性</th>
            <th scope="col">搜索</th>
            <th scope="col">短链</th>
            <th scope="col">字数</th>
            <th scope="col">更新</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((n) => (
            <tr key={n.slug}>
              <td class="title"><a href={`#/notes/${encodeURIComponent(n.slug)}`}>{n.title}</a></td>
              <td><span class={`badge ${n.visibility}`} aria-label={`可见性:${visibilityLabel(n.visibility)}`}>{n.visibility}</span></td>
              <td><span aria-label={n.searchable ? '可搜索' : '不可搜索'}>{n.searchable ? '✓' : '—'}</span></td>
              <td><code>{n.short_id ?? '—'}</code></td>
              <td>{n.word_count}</td>
              <td style={{ color: 'var(--muted)' }}><time dateTime={n.updated_at.slice(0, 10)}>{n.updated_at.slice(0, 10)}</time></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function visibilityLabel(v: NoteSummary['visibility']): string {
  if (v === 'public') return '公开';
  if (v === 'unlisted') return '不列出';
  if (v === 'link-only') return '仅链接';
  if (v === 'private') return '私有';
  return v;
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <li class="kpi">
      <div class="label">{label}</div>
      <div class="value" aria-label={`${label}:${value}`}>{value}</div>
    </li>
  );
}
