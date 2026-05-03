import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';

export function renderHome(posts: NoteRow[], config: SiteConfig): string {
  const items = posts.length
    ? posts
        .map((p) => {
          const iso = (p.published_at ?? p.updated_at).slice(0, 10);
          return `
        <li>
          <h2><a href="/posts/${esc(p.slug)}.html">${esc(p.title)}</a></h2>
          ${p.summary ? `<p class="summary">${esc(p.summary)}</p>` : ''}
          <p class="meta"><time datetime="${iso}">${iso}</time><span aria-hidden="true"> · </span><span aria-label="阅读时长 ${p.reading_minutes} 分钟">${p.reading_minutes} 分钟</span></p>
        </li>`;
        })
        .join('')
    : '<li><p class="summary">还没有公开的文章。</p></li>';

  return layout({
    title: config.site.title,
    description: config.site.description ?? '',
    config,
    body: `
      <h2 class="sr-only">最近发布</h2>
      <ul class="post-list" aria-label="文章列表">${items}</ul>
    `,
  });
}
