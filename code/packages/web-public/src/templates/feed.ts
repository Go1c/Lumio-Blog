import type { NoteRow, SiteConfig } from '@opennote/core';
import { esc } from './layout.js';
import { tagsForSlug } from '../partials/shared.js';

/** cover 可能是站内路径(/static/media/...)或外链;RSS 里一律输出绝对地址,只收 http(s)。 */
function absoluteCover(cover: string | null, siteUrl: string): string | null {
  if (!cover) return null;
  try {
    const u = new URL(cover, `${siteUrl.replace(/\/+$/, '')}/`);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * RSS 2.0。除标题 / 链接 / 时间 / 摘要外,每篇带:
 *  - <category>:文章标签,订阅方(如创作中心「官方动态」)按它筛选
 *  - <media:content medium="image">:封面图(frontmatter cover)
 * 由 server 以 application/rss+xml 返回(见 security-headers.ts)。
 */
export function renderFeed(posts: NoteRow[], config: SiteConfig, byTag: Map<string, NoteRow[]> = new Map()): string {
  const siteUrl = config.site.url.replace(/\/+$/, '');
  const items = posts
    .slice(0, 50)
    .map((p) => {
      const categories = tagsForSlug(byTag, p.slug)
        .map((t) => `<category>${esc(t)}</category>`)
        .join('');
      const cover = absoluteCover(p.cover, siteUrl);
      return `
    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(siteUrl)}/posts/${esc(p.slug)}.html</link>
      <guid>${esc(siteUrl)}/posts/${esc(p.slug)}.html</guid>
      <pubDate>${new Date(p.published_at ?? p.updated_at).toUTCString()}</pubDate>
      ${p.summary ? `<description>${esc(p.summary)}</description>` : ''}
      ${categories}
      ${cover ? `<media:content url="${esc(cover)}" medium="image" />` : ''}
    </item>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/feed.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${esc(config.site.title)}</title>
    <link>${esc(siteUrl)}</link>
    <atom:link href="${esc(siteUrl)}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${esc(config.site.description ?? '')}</description>
    <language>${esc(config.site.language ?? 'zh-CN')}</language>
    ${items}
  </channel>
</rss>`;
}
