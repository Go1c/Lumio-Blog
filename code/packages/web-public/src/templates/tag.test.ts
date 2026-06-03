import { describe, expect, it } from 'vitest';
import { renderTagIndex } from './tag.js';

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

describe('renderTagIndex empty state', () => {
  it('shows the Lumio tag cloud from the design handoff', () => {
    const html = renderTagIndex(new Map(), config);

    expect(html).toContain('page-head');
    expect(html).toContain('tagcloud');
    expect(html).toContain('渲染<span class="tag-pill__n">6</span>');
    expect(html).toContain('#渲染 下的文章');
    expect(html).not.toContain('<li>暂无</li>');
  });
});

describe('renderTagIndex article data', () => {
  it('uses real tags and real post links when backend tags exist', () => {
    const renderPost = note({
      slug: 'render-pipeline',
      title: '真实渲染管线笔记',
      summary: '从后端同步来的文章',
      word_count: 900,
      updated_at: '2026-06-03T00:00:00.000Z',
    });
    const renderPost2 = note({
      slug: 'render-batching',
      title: '真实合批笔记',
      word_count: 700,
      updated_at: '2026-06-01T00:00:00.000Z',
    });
    const toolPost = note({
      slug: 'tooling',
      title: '真实工具链笔记',
      word_count: 600,
      updated_at: '2026-06-02T00:00:00.000Z',
    });

    const html = renderTagIndex(
      new Map([
        ['真实渲染', [renderPost, renderPost2]],
        ['真实工具', [toolPost]],
      ]),
      config,
    );

    expect(html).toContain('真实渲染<span class="tag-pill__n">2</span>');
    expect(html).toContain('#真实渲染 下的文章');
    expect(html).toContain('真实渲染管线笔记');
    expect(html).toContain('href="/posts/render-pipeline.html"');
    expect(html).not.toContain('#渲染 下的文章');
    expect(html).not.toContain('延迟渲染详解');
  });
});
