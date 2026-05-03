import type { NoteRow, SiteConfig } from '@opennote/core';
import { esc } from './layout.js';

export function renderFeed(posts: NoteRow[], config: SiteConfig): string {
  const items = posts
    .slice(0, 50)
    .map(
      (p) => `
    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(config.site.url)}/posts/${esc(p.slug)}.html</link>
      <guid>${esc(config.site.url)}/posts/${esc(p.slug)}.html</guid>
      <pubDate>${new Date(p.published_at ?? p.updated_at).toUTCString()}</pubDate>
      ${p.summary ? `<description>${esc(p.summary)}</description>` : ''}
    </item>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/feed.xsl"?>
<rss version="2.0">
  <channel>
    <title>${esc(config.site.title)}</title>
    <link>${esc(config.site.url)}</link>
    <description>${esc(config.site.description ?? '')}</description>
    <language>${esc(config.site.language ?? 'zh-CN')}</language>
    ${items}
  </channel>
</rss>`;
}
