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

  it('renders a real empty state when there are no public posts', () => {
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

    expect(html).toContain('暂无公开文章');
    expect(html).not.toContain('渲染优化实战');
    expect(html).not.toContain('Unity 性能调优');
    expect(html).not.toContain('href="#"');
  });
});

describe('renderHome brand polish', () => {
  it('ships cache-busted Lumio contrast CSS from the document head', () => {
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

    expect(html).toContain('href="/styles.css?v=20260604-lumio-contrast"');
    expect(html).toContain('body.ui-public.lumio-public {');
    expect(html).toContain('--ink: #1E2A3A;');
  });

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

  it('renders the latest sponsored ad carousel on the home feed', () => {
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

    expect(html).toContain('class="adcar"');
    expect(html).toContain('data-adcar-track');
    expect(html.match(/class="adcar__slide/g)).toHaveLength(3);
    expect(html).toContain('data-adcar-dots');
    expect(html).toContain('setInterval(next, 4500)');
  });

  it('uses enabled home ads from config as carousel slides', () => {
    const html = renderHome(
      {
        posts: [],
        byTag: new Map(),
        recentNotes: [],
        totalArticles: 0,
        totalNotes: 0,
        folders: [],
      },
      {
        ...config,
        home: {
          ads: [
            {
              enabled: true,
              variant: 'native',
              slot: 'home',
              tone: 'rose',
              title: 'Home Ad',
              body: '首页广告',
              cta_label: '打开',
              cta_href: 'https://example.com/home',
            },
            {
              enabled: true,
              variant: 'native',
              slot: 'article',
              tone: 'mint',
              title: 'Article Ad',
            },
            {
              enabled: false,
              variant: 'native',
              slot: 'home',
              tone: 'blue',
              title: 'Paused Home Ad',
            },
          ],
        },
      },
    );

    expect(html.match(/class="adcar__slide/g)).toHaveLength(1);
    expect(html).toContain('Home Ad');
    expect(html).not.toContain('Article Ad');
    expect(html).not.toContain('Paused Home Ad');
  });
});
