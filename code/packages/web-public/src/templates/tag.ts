import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';

export function renderTagIndex(byTag: Map<string, NoteRow[]>, config: SiteConfig): string {
  const entries = [...byTag.entries()].sort((a, b) => b[1].length - a[1].length);
  const items = entries.map(([t, notes]) =>
    `<li><a href="/tags/${esc(encodeURIComponent(t))}.html">#${esc(t)}</a> <span style="color:var(--muted)">(${notes.length})</span></li>`).join('');
  return layout({
    title: `标签 · ${config.site.title}`,
    description: '所有标签',
    config,
    body: `<h1>标签</h1><ul class="post-list">${items || '<li>暂无</li>'}</ul>`,
  });
}

export function renderTagPage(tag: string, notes: NoteRow[], config: SiteConfig): string {
  const items = notes.map((n) => `
    <li>
      <h2><a href="/posts/${esc(n.slug)}.html">${esc(n.title)}</a></h2>
      ${n.summary ? `<p class="summary">${esc(n.summary)}</p>` : ''}
      <p class="meta">${(n.published_at ?? n.updated_at).slice(0, 10)} · ${n.reading_minutes} 分钟</p>
    </li>`).join('');
  return layout({
    title: `#${tag} · ${config.site.title}`,
    description: `标签 ${tag} 下的笔记`,
    config,
    body: `<h1>#${esc(tag)}</h1><ul class="post-list">${items}</ul>`,
  });
}
