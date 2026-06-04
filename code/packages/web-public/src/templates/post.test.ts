import { describe, expect, it } from 'vitest';
import { renderPost } from './post.js';

const config = {
  site: {
    title: 'Lumio Blog',
    url: 'https://blog.lumio.games',
    description: 'Lumio notes',
    language: 'zh-CN',
  },
  author: { name: 'Lumio' },
  features: { comments: false },
  paths: { vault: '/vault', out: '/out', db: '/db.sqlite' },
} as const;

const note = {
  slug: 'hello',
  title: 'Hello',
  visibility: 'public',
  searchable: 1,
  seo_indexable: 1,
  rss_includable: 1,
  featured_on_home: 0,
  short_id: null,
  summary: 'Summary',
  body_html: '<h2 id="intro">Intro</h2><p>Body</p>',
  body_text: 'Body',
  updated_at: '2026-06-01T00:00:00.000Z',
  created_at: '2026-06-01T00:00:00.000Z',
  published_at: null,
  scheduled_at: null,
  reading_minutes: 1,
  word_count: 100,
  kind: 'markdown',
  source_path: 'Work/hello.md',
  cover: null,
  hash: 'hash',
} as any;

describe('renderPost mobile actions', () => {
  it('does not render non-functional favorite and feedback buttons', () => {
    const html = renderPost({ note, byTag: new Map(), series: [] }, config);

    expect(html).not.toContain('id="wsc-pill-fav"');
    expect(html).not.toContain('id="wsc-pill-feedback"');
    expect(html).toContain('id="wsc-pill-link"');
    expect(html).toContain('id="wsc-pill-share"');
  });
});

describe('renderPost Lumio layout', () => {
  it('renders the article detail page with Lumio page structure and real body content', () => {
    const taggedNote = { ...note, title: 'HUD3DUI 中 TMP 独立 Canvas 排序异常分析' };
    const html = renderPost(
      {
        note: taggedNote,
        byTag: new Map([['Unity', [taggedNote]]]),
        series: [{ ...taggedNote, slug: 'related', title: 'Related Post' }],
      },
      config,
    );

    expect(html).toContain('HUD3DUI 中 TMP 独立 Canvas 排序异常分析');
    expect(html).toContain('class="crumb"');
    expect(html).toContain('href="/articles/index.html">文章</a>');
    expect(html).toContain('class="page post-page"');
    expect(html).toContain('class="layout layout--post"');
    expect(html).toContain('class="post-title"');
    expect(html).toContain('class="post-hero"');
    expect(html).toContain('class="wsa-prose post-prose prose hf-prose"');
    expect(html).toContain('class="side-card toc"');
    expect(html).toContain('<h2 id="intro">Intro</h2><p>Body</p>');
    expect(html).toContain('href="/tags/Unity.html"');
    expect(html).toContain('href="/posts/related.html"');
    expect(html).toContain('aria-current="page">文章</a>');
    expect(html).not.toContain('class="page-head post-head"');
    expect(html).not.toContain('class="post-layout"');
    expect(html).not.toContain('wsa-post__grid');
    expect(html).not.toContain('wsa-post__main');
  });
});

describe('post mobile CSS', () => {
  it('contains defensive overflow rules for code blocks and tables', async () => {
    const { POST_MOBILE_CSS } = await import('./post.js');

    expect(POST_MOBILE_CSS).toContain('.wsa-prose pre');
    expect(POST_MOBILE_CSS).toContain('max-width: calc(100vw - 32px)');
    expect(POST_MOBILE_CSS).toContain('.wsa-prose table');
    expect(POST_MOBILE_CSS).toContain('display: block');
  });
});
