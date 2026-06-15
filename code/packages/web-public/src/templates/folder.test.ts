import { describe, expect, it } from 'vitest';
import { renderFolderIndex, renderFolderPage } from './folder.js';

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
    source_path: 'Rendering/a.md',
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

describe('renderFolderIndex', () => {
  it('renders real vault folders as the generated folder index', () => {
    const html = renderFolderIndex([
      { name: 'Rendering', count: 2 },
      { name: 'Game AI', count: 1 },
    ], config);

    expect(html).toContain('所有文件夹');
    expect(html).toContain('共 2 个文件夹');
    expect(html).toContain('href="/folders/Rendering.html"');
    expect(html).toContain('href="/folders/Game%20AI.html"');
    expect(html).not.toContain('渲染管线精讲');
    expect(html).not.toContain('性能优化之道');
  });
});

describe('renderFolderPage', () => {
  it('renders public notes from one top-level vault folder grouped by year', () => {
    const current = note({
      slug: 'render-current',
      title: '今年的真实渲染笔记',
      summary: '来自 Rendering 目录',
      source_path: 'Rendering/current.md',
      published_at: '2026-06-01T00:00:00.000Z',
      word_count: 1200,
      reading_minutes: 5,
    });
    const older = note({
      slug: 'render-older',
      title: '去年的真实渲染笔记',
      source_path: 'Rendering/older.md',
      published_at: '2025-04-01T00:00:00.000Z',
      word_count: 800,
      reading_minutes: 3,
    });

    const html = renderFolderPage(
      'Rendering',
      [older, current],
      [
        { name: 'Rendering', count: 2 },
        { name: 'Game AI', count: 1 },
      ],
      config,
    );

    expect(html).toContain('首页</a> / <a href="/folders/index.html">所有文件夹</a>');
    expect(html).toContain('今年的真实渲染笔记');
    expect(html).toContain('href="/posts/render-current.html"');
    expect(html).toContain('去年的真实渲染笔记');
    expect(html).toContain('href="/posts/render-older.html"');
    expect(html.indexOf('wsa-y-2026')).toBeLessThan(html.indexOf('wsa-y-2025'));
    expect(html).toContain('href="/folders/Game%20AI.html"');
    expect(html).not.toContain('#渲染 下的文章');
    expect(html).not.toContain('延迟渲染详解');
  });
});
