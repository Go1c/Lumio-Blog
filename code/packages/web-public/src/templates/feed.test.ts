import { describe, expect, it } from 'vitest';
import type { NoteRow } from '@opennote/core';
import { renderFeed } from './feed.js';

const config = {
  site: { title: 'Lumio Blog', url: 'https://blog.lumio.games/', description: 'notes', language: 'zh-CN' },
  author: { name: 'Lumio' },
  paths: { vault: '/v', out: '/o', db: '/d' },
} as any;

const note = (over: Partial<NoteRow>): NoteRow =>
  ({
    slug: 'a',
    title: 'A <title>',
    summary: '摘要',
    published_at: '2026-11-03T00:00:00.000Z',
    updated_at: '2026-11-03T00:00:00.000Z',
    cover: null,
    ...over,
  }) as NoteRow;

describe('renderFeed', () => {
  it('includes categories from tags and the cover as media:content with absolute urls', () => {
    const a = note({ slug: 'a', cover: '/static/media/c.png' });
    const b = note({ slug: 'b', cover: 'https://lumiogames.cn/media/x' });
    const xml = renderFeed([a, b], config, new Map([['教程', [a]], ['opc', [a, b]]]));
    expect(xml).toContain('xmlns:media="http://search.yahoo.com/mrss/"');
    expect(xml).toContain('<atom:link href="https://blog.lumio.games/feed.xml" rel="self" type="application/rss+xml" />');
    expect(xml).toContain('<link>https://blog.lumio.games/posts/a.html</link>');
    expect(xml).toMatch(/<category>教程<\/category><category>opc<\/category>/);
    expect(xml).toContain('<media:content url="https://blog.lumio.games/static/media/c.png" medium="image" />');
    expect(xml).toContain('<media:content url="https://lumiogames.cn/media/x" medium="image" />');
    expect(xml).toContain('A &lt;title&gt;');
  });

  it('orders items by publish date, not by last edit', () => {
    const old = note({ slug: 'old', published_at: '2026-06-01T00:00:00.000Z', updated_at: '2026-11-03T09:00:00.000Z' });
    const fresh = note({ slug: 'fresh', published_at: '2026-11-01T00:00:00.000Z', updated_at: '2026-11-01T00:00:00.000Z' });
    const xml = renderFeed([old, fresh], config);
    expect(xml.indexOf('/posts/fresh.html')).toBeLessThan(xml.indexOf('/posts/old.html'));
    expect(xml).toContain('<pubDate>Mon, 01 Jun 2026 00:00:00 GMT</pubDate>');
  });

  it('omits the cover when it is missing or not http(s)', () => {
    const xml = renderFeed([note({ cover: 'javascript:alert(1)' }), note({ slug: 'b' })], config);
    expect(xml).not.toContain('media:content');
    expect(xml).not.toContain('<category>');
  });
});
