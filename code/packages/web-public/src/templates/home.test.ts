import { describe, expect, it } from 'vitest';
import { renderHome } from './home.js';

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

describe('renderHome article data', () => {
  it('renders backend posts with clickable post links when posts exist', () => {
    const livePost = note({
      slug: 'live',
      title: '一个提示词,让 Codex 自动写代码',
      summary: '真实后端文章摘要',
      word_count: 800,
      updated_at: '2026-06-02T00:00:00.000Z',
    });

    const html = renderHome(
      {
        posts: [livePost],
        byTag: new Map(),
        recentNotes: [],
        totalArticles: 1,
        totalNotes: 1,
        folders: [],
      },
      config,
    );

    expect(html).toContain('一个提示词,让 Codex 自动写代码');
    expect(html).toContain('真实后端文章摘要');
    expect(html).toContain('href="/posts/live.html"');
    expect(html).not.toContain('Unity 性能调优');
  });

  it('uses Lumio design cards only as the empty-state fallback', () => {
    const html = renderHome(
      {
        posts: [],
        byTag: new Map(),
        recentNotes: [],
        totalArticles: 0,
        totalNotes: 0,
        folders: [],
      },
      config,
    );

    expect(html).toContain('渲染优化实战');
    expect(html).toContain('Unity 性能调优');
    expect(html).not.toContain('href="#"');
  });
});

describe('renderHome brand polish', () => {
  it('uses a purposeful Lumio eyebrow instead of a generated title-length version badge', () => {
    const html = renderHome(
      {
        posts: [],
        byTag: new Map(),
        recentNotes: [],
        totalArticles: 0,
        totalNotes: 0,
        folders: [],
      },
      config,
    );

    expect(html).toContain('Lumio Dev Notes');
    expect(html).not.toContain('v10 · Lumio Blog');
  });

  it('links the hero CTA into the articles experience', () => {
    const html = renderHome(
      {
        posts: [],
        byTag: new Map(),
        recentNotes: [],
        totalArticles: 0,
        totalNotes: 0,
        folders: [],
      },
      config,
    );

    expect(html).not.toContain('(0)');
    expect(html).toContain('href="/articles/index.html"');
  });
});
