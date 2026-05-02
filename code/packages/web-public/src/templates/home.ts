import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';

export function renderHome(posts: NoteRow[], config: SiteConfig): string {
  const items = posts.length
    ? posts
        .map(
          (p) => `
        <li>
          <h2><a href="/posts/${esc(p.slug)}.html">${esc(p.title)}</a></h2>
          ${p.summary ? `<p class="summary">${esc(p.summary)}</p>` : ''}
          <p class="meta">${formatDate(p.published_at ?? p.updated_at)} · ${p.reading_minutes} 分钟</p>
        </li>`,
        )
        .join('')
    : '<li><p class="summary">还没有公开的文章。</p></li>';

  return layout({
    title: config.site.title,
    description: config.site.description ?? '',
    config,
    body: `
      <ul class="post-list">${items}</ul>
    `,
  });
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}
