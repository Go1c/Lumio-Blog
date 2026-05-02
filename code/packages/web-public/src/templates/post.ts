import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';

export function renderPost(note: NoteRow, config: SiteConfig): string {
  const visibilityBadge =
    note.visibility !== 'public'
      ? `<span class="badge">${esc(note.visibility)}</span>`
      : '';

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
          ${formatDate(note.published_at ?? note.updated_at)} · ${note.reading_minutes} 分钟 · ${note.word_count} 字
        </p>
        ${note.body_html}
      </article>
    `,
  });
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}
