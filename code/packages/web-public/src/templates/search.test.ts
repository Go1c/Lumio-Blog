import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
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

  it('exposes implemented search filters backed by the public search API', () => {
    const post = note({ slug: 'unity-render', title: 'Unity Render' });
    const html = renderSearch(config, {
      posts: [post],
      byTag: new Map([['Unity', [post]], ['Shader', [post]]]),
    });

    expect(html).toContain('data-search-filters');
    expect(html).toContain('name="type"');
    expect(html).toContain('value="post"');
    expect(html).toContain('value="note"');
    expect(html).not.toContain('value="tag"');
    expect(html).not.toContain('value="media"');
    expect(html).toContain('data-filter-from');
    expect(html).toContain('data-filter-to');
    expect(html).toContain('data-filter-tags');
    expect(html).toContain('<option value="Unity">Unity</option>');
    expect(html).toContain('<option value="Shader">Shader</option>');
    expect(html).not.toContain('<option value="性能优化">性能优化</option>');
  });

  it('does not derive fake read counts from search relevance score', async () => {
    const js = await readFile(new URL('../../public/search.js', import.meta.url), 'utf-8');

    expect(js).not.toContain('((hit && hit.score) || 1) * 1.2');
    expect(js).toContain('typeof hit.views ===');
  });

  it('passes filter controls through to /api/search and URL state', async () => {
    const js = await readFile(new URL('../../public/search.js', import.meta.url), 'utf-8');

    expect(js).toContain('function buildSearchUrl');
    expect(js).toContain("params.set('type', filters.type)");
    expect(js).toContain("params.set('from', filters.from)");
    expect(js).toContain("params.set('to', filters.to)");
    expect(js).toContain("params.set('tags', filters.tags)");
    expect(js).toContain('fetch(buildSearchUrl(q)');
    expect(js).toContain('writeUrlState(q)');
    expect(js).not.toContain("fetch('/api/search?q=' + encodeURIComponent(q)");
  });
});
