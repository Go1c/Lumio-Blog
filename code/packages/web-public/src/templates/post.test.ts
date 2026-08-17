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

describe('renderPost cover image (题图)', () => {
  it('renders the CSS hero animation when no cover is set', () => {
    const html = renderPost({ note, byTag: new Map(), series: [] }, config);

    expect(html).toContain('class="post-hero"');
    expect(html).toContain('class="post-hero__art"');
    expect(html).not.toContain('post-hero--cover');
    expect(html).not.toContain('class="post-hero__img"');
  });

  it('renders the cover image and drops the animation when cover is set', () => {
    const withCover = { ...note, cover: 'https://s3.example.com/hi-lumio.png' };
    const html = renderPost({ note: withCover, byTag: new Map(), series: [] }, config);

    expect(html).toContain('class="post-hero post-hero--cover"');
    expect(html).toContain(
      '<img class="post-hero__img" src="https://s3.example.com/hi-lumio.png"',
    );
    expect(html).not.toContain('class="post-hero__art"');
  });
});

describe('renderPost head meta (GEO)', () => {
  it('falls back to the generated OG image when the note has no cover', () => {
    const html = renderPost({ note, byTag: new Map(), series: [] }, config);

    expect(html).toContain(
      '<meta property="og:image" content="https://blog.lumio.games/og/hello.png">',
    );
    expect(html).toContain(
      '<meta name="twitter:image" content="https://blog.lumio.games/og/hello.png">',
    );
  });

  it('prefers an explicit cover over the OG fallback', () => {
    const withCover = { ...note, cover: 'https://s3.example.com/hi-lumio.png' };
    const html = renderPost({ note: withCover, byTag: new Map(), series: [] }, config);

    expect(html).toContain(
      '<meta property="og:image" content="https://s3.example.com/hi-lumio.png">',
    );
    expect(html).not.toContain('/og/hello.png');
  });

  it('publishes article:* meta and a named author', () => {
    const tagged = { ...note, title: 'Tagged' };
    const html = renderPost(
      { note: tagged, byTag: new Map([['Unity', [tagged]]]), series: [] },
      config,
    );

    expect(html).toContain(
      '<meta property="article:published_time" content="2026-06-01T00:00:00.000Z">',
    );
    expect(html).toContain(
      '<meta property="article:modified_time" content="2026-06-01T00:00:00.000Z">',
    );
    expect(html).toContain('<meta property="article:tag" content="Unity">');
    expect(html).toContain('<meta name="author" content="Lumio">');
  });

  it('advertises the raw markdown endpoint for markdown notes only', () => {
    const markdown = renderPost({ note, byTag: new Map(), series: [] }, config);
    const canvas = renderPost(
      { note: { ...note, kind: 'canvas' }, byTag: new Map(), series: [] },
      config,
    );

    expect(markdown).toContain(
      '<link rel="alternate" type="text/markdown" href="/posts/hello.md"',
    );
    expect(canvas).not.toContain('type="text/markdown"');
  });

  it('reads twitter:card from site config', () => {
    const html = renderPost(
      { note, byTag: new Map(), series: [] },
      { ...config, seo: { twitter_card: 'summary' } },
    );

    expect(html).toContain('<meta name="twitter:card" content="summary">');
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
