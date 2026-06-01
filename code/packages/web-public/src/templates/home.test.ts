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

describe('renderHome feed quality', () => {
  it('demotes empty untitled notes behind substantial titled posts', () => {
    const emptyUntitled = note({
      slug: 'empty',
      title: '未命名',
      word_count: 0,
      updated_at: '2026-06-02T00:00:00.000Z',
    });
    const good = note({
      slug: 'good',
      title: '有标题的文章',
      word_count: 800,
      updated_at: '2026-05-01T00:00:00.000Z',
    });

    const html = renderHome(
      {
        posts: [emptyUntitled, good],
        byTag: new Map(),
        recentNotes: [],
        totalArticles: 2,
        totalNotes: 2,
        folders: [],
      },
      config,
    );

    expect(html.indexOf('有标题的文章')).toBeLessThan(html.indexOf('未命名'));
  });
});
