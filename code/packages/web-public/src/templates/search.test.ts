import { describe, expect, it } from 'vitest';
import { renderSearch } from './search.js';

const config = {
  site: {
    title: 'Lumio Blog',
    url: 'https://blog.lumio.games',
    description: 'Lumio notes',
    language: 'zh-CN',
  },
  author: { name: 'Lumio' },
  paths: { vault: '/vault', out: '/out', db: '/db.sqlite' },
} as const;

function note(overrides: Partial<Record<string, unknown>>) {
  return {
    slug: 'slug',
    title: 'Title',
    visibility: 'public',
    searchable: 1,
    seo_indexable: 1,
    rss_includable: 1,
    featured_on_home: 0,
    short_id: null,
    source_path: 'Work/a.md',
    summary: '',
    body_html: '',
    body_text: '',
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    published_at: null,
    scheduled_at: null,
    reading_minutes: 1,
    word_count: 100,
    cover: null,
    hash: 'hash',
    ...overrides,
  } as any;
}

describe('renderSearch Lumio shell', () => {
  it('renders real tag and post suggestions instead of design fixture suggestions', () => {
    const post = note({
      slug: 'hud3dui-canvas',
      title: 'HUD3DUI Canvas 排序分析',
    });
    const html = renderSearch(config, {
      posts: [post],
      byTag: new Map([['Unity', [post]]]),
    });

    expect(html).toContain('data-component="search"');
    expect(html).toContain('id="wsb-search-query"');
    expect(html).toContain('data-results hidden');
    expect(html).toContain('src="/search.js"');
    expect(html).toContain('href="/search/index.html?q=Unity"');
    expect(html).toContain('href="/tags/Unity.html"');
    expect(html).toContain('HUD3DUI Canvas 排序分析');
    expect(html).not.toContain('渲染优化 Unity');
    expect(html).not.toContain('移动端渲染优化');
  });

  it('shows empty sidebar states when backend data has no tags or posts', () => {
    const html = renderSearch(config, { posts: [], byTag: new Map() });

    expect(html).toContain('暂无搜索建议');
    expect(html).toContain('暂无标签');
    expect(html).not.toContain('性能优化');
  });
});
