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
  it('renders real vault-backed columns instead of static design columns when folder data exists', () => {
    const renderPost = note({
      slug: 'render-pipeline',
      title: '真实渲染管线笔记',
      source_path: 'Rendering/pipeline.md',
      word_count: 2400,
    });
    const aiPost = note({
      slug: 'agent-notes',
      title: 'Agent 工作流笔记',
      source_path: 'AI/agent.md',
      word_count: 1200,
    });

    const html = renderColumns(
      [renderPost, aiPost],
      new Map([['渲染', [renderPost]]]),
      config,
    );

    expect(html).toContain('Rendering');
    expect(html).toContain('AI');
    expect(html).toContain('2 个真实专栏');
    expect(html).toContain('真实渲染管线笔记');
    expect(html).not.toContain('渲染管线精讲');
  });

  it('does not invent design columns when backend posts exist without folder-backed columns', () => {
    const renderPost = note({
      slug: 'render-pipeline',
      title: '真实渲染管线笔记',
      source_path: 'render-pipeline.md',
    });

    const html = renderColumns(
      [renderPost],
      new Map([['渲染', [renderPost]]]),
      config,
    );

    expect(html).toContain('还没有专栏');
    expect(html).toContain('Obsidian vault 一级目录');
    expect(html).not.toContain('渲染管线精讲');
    expect(html).not.toContain('性能优化之道');
    expect(html).not.toContain('9 篇文章');
    expect(html).not.toContain('7 篇文章');
  });

  it('shows an empty state instead of design demo counts when there are no public posts', () => {
    const html = renderColumns([], new Map(), config);

    expect(html).toContain('暂无公开专栏');
    expect(html).toContain('class="home-empty"');
    expect(html).not.toContain('9 篇文章');
    expect(html).not.toContain('7 篇文章');
  });

  it('renders configured column-slot ads above the column grid', () => {
    const html = renderColumns(
      [],
      new Map(),
      {
        ...config,
        home: {
          ads: [
            {
              id: 'column-agent',
              enabled: true,
              slot: 'column',
              tone: 'mint',
              title: '专栏共创计划',
              body: '把你的技术系列投递给 Lumio',
              cta_label: '投递',
              cta_href: 'https://blog.lumio.games/submit',
            },
          ],
        },
      } as any,
    );

    expect(html).toContain('data-ad-slot="column"');
    expect(html).toContain('专栏共创计划');
    expect(html).toContain('把你的技术系列投递给 Lumio');
    expect(html).toContain('href="https://blog.lumio.games/submit"');
  });
});
