import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';

export function renderPost(note: NoteRow, config: SiteConfig): string {
  const visibilityBadge =
    note.visibility !== 'public'
      ? `<span class="badge" aria-label="可见性:${esc(visibilityLabel(note.visibility))}">${esc(note.visibility)}</span>`
      : '';
  const isoDate = (note.published_at ?? note.updated_at).slice(0, 10);

  return layout({
    title: `${note.title} · ${config.site.title}`,
    description: note.summary ?? '',
    config,
    noindex: note.visibility !== 'public',
    body: `
      <article>
        <h1>${esc(note.title)}</h1>
        <p class="meta">
          ${visibilityBadge}
          <time datetime="${isoDate}">${isoDate}</time>
          <span aria-hidden="true"> · </span>
          <span aria-label="阅读时长 ${note.reading_minutes} 分钟">${note.reading_minutes} 分钟</span>
          <span aria-hidden="true"> · </span>
          <span aria-label="${note.word_count} 字">${note.word_count} 字</span>
        </p>
        ${note.body_html}
      </article>
    `,
  });
}

function visibilityLabel(v: string): string {
  if (v === 'public') return '公开';
  if (v === 'unlisted' || v === 'link-only' || v === 'link') return '仅链接';
  if (v === 'private') return '私有';
  return v;
}
