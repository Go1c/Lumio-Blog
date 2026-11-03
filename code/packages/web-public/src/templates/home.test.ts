import { describe, expect, it } from 'vitest';
import { homeAdsFromConfig } from './lumio-design.js';
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

  it('replaces the decorative hero with the Lumio studio card and keeps the site title as h1', () => {
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

    expect(html).toContain('class="home-hub"');
    expect(html).toContain('一起做出好玩的游戏');
    expect(html).toContain('utm_medium=home_rail');
    expect(html).toMatch(/<h1 class="home-hub__h1">[^<]+<\/h1>/);
    expect(html).not.toContain('class="hero"');
    expect(html).not.toContain('GameTech');
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

  it('does not render a demo sponsored carousel when no home ads are configured', () => {
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

    expect(homeAdsFromConfig(config)).toEqual([]);
    expect(html).not.toContain('class="adcar"');
    expect(html).not.toContain('data-adcar-track');
    expect(html).not.toContain('赞助 · Sponsored');
    expect(html).not.toContain('https://example.com/unity6');
    expect(html).not.toContain('https://example.com/your-ad-target');
    expect(html).not.toContain('Unity 6 性能套件');
    expect(html).not.toContain('云渲染农场 RenderX');
    expect(html).not.toContain('GameConf 2026');
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
    expect(html).toContain('https://example.com/home');
    expect(html).not.toContain('Article Ad');
    expect(html).not.toContain('Paused Home Ad');
    expect(html).not.toContain('Unity 6 性能套件');
  });

  it('skips home ads without a valid http(s) CTA instead of inventing a link', () => {
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
              tone: 'blue',
              title: 'No Link Ad',
            },
            {
              enabled: true,
              variant: 'native',
              slot: 'home',
              tone: 'mint',
              title: 'Bad Link Ad',
              cta_href: 'javascript:alert(1)',
            },
            {
              enabled: true,
              variant: 'native',
              slot: 'home',
              tone: 'rose',
              title: 'Good Ad',
              cta_label: '打开',
              cta_href: 'https://blog.lumio.games/about.html',
            },
          ],
        },
      },
    );

    expect(html.match(/class="adcar__slide/g)).toHaveLength(1);
    expect(html).toContain('Good Ad');
    expect(html).toContain('https://blog.lumio.games/about.html');
    expect(html).not.toContain('No Link Ad');
    expect(html).not.toContain('Bad Link Ad');
    expect(html).not.toContain('https://example.com/your-ad-target');
    expect(html).not.toContain('data-adcar-dots');
  });

  it('hides the sponsored slot when every configured home ad lacks a valid CTA', () => {
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
              tone: 'blue',
              title: 'No Link Ad',
            },
          ],
        },
      },
    );

    expect(html).not.toContain('class="adcar"');
    expect(html).not.toContain('赞助 · Sponsored');
    expect(html).not.toContain('No Link Ad');
    expect(html).not.toContain('https://example.com/your-ad-target');
  });
});

describe('renderHome article list', () => {
  it('shows every public post on the home page with pinned posts first', () => {
    const posts = Array.from({ length: 8 }, (_, i) =>
      note({
        slug: `p${i}`,
        title: `文章 ${i}`,
        word_count: 500,
        updated_at: `2026-10-0${i + 1}T00:00:00.000Z`,
        featured_on_home: i === 0 ? 1 : 0,
      }),
    );
    const html = renderHome({ posts, byTag: new Map(), recentNotes: [], totalArticles: 8, totalNotes: 8, folders: [] }, config);
    for (let i = 0; i < 8; i++) expect(html).toContain(`文章 ${i}`);
    expect(html).not.toContain('/api/newsletter/subscribe');
    // 最早的 p0 被置顶,排在最新的 p7 前面,并带「置顶」标
    expect(html.indexOf('文章 0')).toBeLessThan(html.indexOf('文章 7'));
    expect(html.match(/badge badge--pin/g)).toHaveLength(1);
  });
});
