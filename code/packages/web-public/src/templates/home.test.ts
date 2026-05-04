/**
 * home 模板 — PR-B 行为测试。
 *
 * 不依赖 better-sqlite3(纯函数模板),覆盖:
 *   - 行 data-tags / data-published-at / data-word-count 都正确写入
 *   - 顶部 pill 行只在 rest.length > 1 且有标签时出现
 *   - sort 下拉只在 rest.length > 1 时出现
 *   - viewsBySlug 提供时,在行 meta 渲染 千分位 N views
 *   - viewsBySlug 不提供 / 值为 0,行 meta 不出现 views
 *   - 内联 JS 包含 wsa-feed-rows / activeTag / activeSort 等关键标识
 */
import { describe, expect, it } from 'vitest';
import type { NoteRow, SiteConfig } from '@opennote/core';
import { renderHome, type HomeData } from './home.js';

function makeNote(overrides: Partial<NoteRow> & { slug: string; title: string }): NoteRow {
  return {
    slug: overrides.slug,
    title: overrides.title,
    summary: overrides.summary ?? null,
    body_html: overrides.body_html ?? '<p>x</p>',
    body_text: overrides.body_text ?? 'x',
    visibility: overrides.visibility ?? 'public',
    searchable: overrides.searchable ?? 1,
    short_id: overrides.short_id ?? null,
    source_path: overrides.source_path ?? `posts/${overrides.slug}.md`,
    created_at: overrides.created_at ?? '2025-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2025-01-01T00:00:00.000Z',
    published_at: overrides.published_at ?? '2025-01-01T00:00:00.000Z',
    scheduled_at: overrides.scheduled_at ?? null,
    word_count: overrides.word_count ?? 100,
    reading_minutes: overrides.reading_minutes ?? 1,
    cover: overrides.cover ?? null,
    hash: overrides.hash ?? 'h',
  };
}

function makeConfig(): SiteConfig {
  return {
    site: { title: 'Lumio', url: 'https://example.com', description: 'desc' },
    author: { name: 'L', bio: '', social: [] },
    theme: {} as SiteConfig['theme'],
    seo: {} as SiteConfig['seo'],
    home: {} as SiteConfig['home'],
    features: {} as SiteConfig['features'],
    paths: {} as SiteConfig['paths'],
  } as unknown as SiteConfig;
}

describe('renderHome (PR-B)', () => {
  const a = makeNote({
    slug: 'a', title: 'A', published_at: '2025-05-01T00:00:00.000Z', word_count: 500,
  });
  const b = makeNote({
    slug: 'b', title: 'B', published_at: '2025-04-01T00:00:00.000Z', word_count: 1500,
  });
  const c = makeNote({
    slug: 'c', title: 'C', published_at: '2025-03-01T00:00:00.000Z', word_count: 300,
  });
  const d = makeNote({
    slug: 'd', title: 'D', published_at: '2025-02-01T00:00:00.000Z', word_count: 800,
  });

  const byTag = new Map<string, NoteRow[]>([
    ['life', [b, c]],
    ['tech', [a, c, d]],
  ]);

  const baseData: HomeData = {
    posts: [a, b, c, d],
    byTag,
    recentNotes: [a, b],
    totalArticles: 4,
    totalNotes: 4,
  };

  it('writes data-tags / data-published-at / data-word-count on each row', () => {
    const html = renderHome(baseData, makeConfig());
    // a is pinned (posts[0]); b/c/d are rest rows
    // tagsForSlug order = byTag Map insertion order ("life" then "tech")
    expect(html).toContain('data-tags="life"');
    expect(html).toContain('data-tags="life tech"');
    expect(html).toContain('data-tags="tech"');
    expect(html).toContain('data-published-at="2025-04-01"');
    expect(html).toContain('data-word-count="1500"');
  });

  it('renders the pill bar with 全部 + counts when there are rows', () => {
    const html = renderHome(baseData, makeConfig());
    expect(html).toContain('class="wsa-feed__pills"');
    expect(html).toContain('data-active="all"');
    expect(html).toContain('data-tag="__all__"');
    expect(html).toContain('全部');
    // tag pills include count spans
    expect(html).toMatch(/data-tag="tech"[^>]*>tech\s*<span class="wsa-pill__count">2<\/span>/);
    expect(html).toMatch(/data-tag="life"[^>]*>life\s*<span class="wsa-pill__count">2<\/span>/);
  });

  it('renders the sort dropdown with three options', () => {
    const html = renderHome(baseData, makeConfig());
    expect(html).toContain('class="wsa-feed__sort-select"');
    expect(html).toContain('value="newest"');
    expect(html).toContain('value="oldest"');
    expect(html).toContain('value="longest"');
  });

  it('hides pill bar and sort dropdown when only 0 or 1 rows in rest', () => {
    const html = renderHome({ ...baseData, posts: [a] }, makeConfig());
    expect(html).not.toContain('wsa-feed__pills');
    expect(html).not.toContain('wsa-feed__sort-select');
  });

  it('renders views meta with thousands separator when > 0', () => {
    const viewsBySlug = new Map<string, number>([
      ['b', 1234],
      ['c', 0],
      ['d', 42],
    ]);
    const html = renderHome({ ...baseData, viewsBySlug }, makeConfig());
    expect(html).toContain('1,234 views');
    expect(html).toContain('42 views');
    // c has 0 views → no views span
    // b's row contains the views span; check c's row doesn't
    const cMatch = html.match(/data-tags="life tech"[\s\S]*?<\/article>/);
    expect(cMatch).toBeTruthy();
    expect(cMatch![0]).not.toContain('views</span>');
  });

  it('omits views meta when viewsBySlug not provided', () => {
    const html = renderHome(baseData, makeConfig());
    expect(html).not.toContain('wsa-row__views');
  });

  it('inlines client-side filter+sort script', () => {
    const html = renderHome(baseData, makeConfig());
    expect(html).toContain("getElementById('wsa-feed-rows')");
    expect(html).toContain("activeTag = '__all__'");
    expect(html).toContain("activeSort = 'newest'");
    expect(html).toContain('data-published-at');
    expect(html).toContain('data-word-count');
  });
});
