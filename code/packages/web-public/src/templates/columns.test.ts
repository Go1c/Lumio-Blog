import { describe, expect, it } from 'vitest';
import { renderColumns } from './columns.js';

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

describe('renderColumns article data', () => {
  it('uses real category counts when backend posts exist', () => {
    const renderPost = note({
      slug: 'render-pipeline',
      title: '真实渲染管线笔记',
    });

    const html = renderColumns(
      [renderPost],
      new Map([['渲染', [renderPost]]]),
      config,
    );

    expect(html).toContain('渲染管线精讲');
    expect(html).toContain('1 篇文章');
    expect(html).toContain('性能优化之道');
    expect(html).toContain('0 篇文章');
    expect(html).not.toContain('9 篇文章');
    expect(html).not.toContain('7 篇文章');
  });

  it('keeps Lumio design counts for the empty-state fallback', () => {
    const html = renderColumns([], new Map(), config);

    expect(html).toContain('9 篇文章');
    expect(html).toContain('7 篇文章');
  });
});
