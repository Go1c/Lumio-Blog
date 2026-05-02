import { useEffect, useState } from 'preact/hooks';
import { api, type NoteSummary } from '../api.js';

export function NoteList() {
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);

  useEffect(() => {
    api.listNotes().then((r) => setNotes(r.notes));
  }, []);

  if (!notes) return <p>loading…</p>;

  const counts: Record<NoteSummary['visibility'], number> = { public: 0, unlisted: 0, 'link-only': 0, private: 0 };
  for (const n of notes) counts[n.visibility] = (counts[n.visibility] ?? 0) + 1;

  return (
    <>
      <div class="kpis">
        <Kpi label="总笔记" value={notes.length} />
        <Kpi label="公开" value={counts.public} />
        <Kpi label="不列出" value={counts.unlisted} />
        <Kpi label="私有" value={counts.private} />
      </div>
      <table>
        <thead>
          <tr>
            <th>标题</th>
            <th>可见性</th>
            <th>搜索</th>
            <th>短链</th>
            <th>字数</th>
            <th>更新</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((n) => (
            <tr key={n.slug}>
              <td class="title"><a href={`#/notes/${encodeURIComponent(n.slug)}`}>{n.title}</a></td>
              <td><span class={`badge ${n.visibility}`}>{n.visibility}</span></td>
              <td>{n.searchable ? '✓' : '—'}</td>
              <td><code>{n.short_id ?? '—'}</code></td>
              <td>{n.word_count}</td>
              <td style={{ color: 'var(--muted)' }}>{n.updated_at.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div class="kpi">
      <div class="label">{label}</div>
      <div class="value">{value}</div>
    </div>
  );
}
