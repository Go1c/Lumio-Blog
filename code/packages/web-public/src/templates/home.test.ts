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

describe('renderHome design fidelity', () => {
  it('keeps the Lumio handoff article cards instead of leaking live post titles into the showcase', () => {
    const livePost = note({
      slug: 'live',
      title: '一个提示词,让 Codex 自动写代码',
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

    expect(html).toContain('渲染优化实战');
    expect(html).toContain('Unity 性能调优');
    expect(html).toContain('工具链提效');
    expect(html).not.toContain('一个提示词,让 Codex 自动写代码');
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
