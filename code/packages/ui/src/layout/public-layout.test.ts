import { describe, expect, it } from 'vitest';
import { publicLayout } from './public-layout.js';

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

describe('publicLayout SEO metadata', () => {
  it('emits canonical and Open Graph metadata for index pages', () => {
    const html = publicLayout({
      title: 'Lumio Blog',
      description: 'Lumio notes',
      config,
      body: '<p>Hello</p>',
      path: '/',
    });

    expect(html).toContain('<link rel="canonical" href="https://blog.lumio.games/">');
    expect(html).toContain('<meta property="og:title" content="Lumio Blog">');
    expect(html).toContain('<meta property="og:url" content="https://blog.lumio.games/">');
    expect(html).toContain('<meta property="og:locale" content="zh_CN">');
    expect(html).toContain(
      '<link rel="alternate" hreflang="zh-CN" href="https://blog.lumio.games/">',
    );
    expect(html).toContain(
      '<link rel="alternate" hreflang="x-default" href="https://blog.lumio.games/">',
    );
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it('emits search engine ownership verification in the public document head', () => {
    const html = publicLayout({
      title: 'Lumio Blog',
      description: 'Lumio notes',
      config,
      body: '<p>Hello</p>',
      path: '/',
    });

    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain(
      '<meta name="msvalidate.01" content="48232FF4A9EAB80D49C7A5AE2D009539">',
    );
    expect(head).toContain(
      '<meta name="baidu-site-verification" content="codeva-qKoHKbt10r">',
    );
    expect(head).toContain(
      '<meta name="google-site-verification" content="YlFC2R5DY626I5yH2cA24zxqOOmciWqMHQcuJAw2El8">',
    );
    expect(head).toContain(
      '<meta name="sogou_site_verification" content="zRSOrPjKvt">',
    );
  });

  it('embeds the official Umami tracker in the public document head', () => {
    const html = publicLayout({
      title: 'Lumio Blog',
      description: 'Lumio notes',
      config,
      body: '<p>Hello</p>',
      path: '/',
    });

    const umami = '<script defer src="https://data.lumio.games/script.js" data-website-id="2643aa10-6823-4702-8c18-26c3b4a8b4d3"></script>';
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain(umami);
    expect(html.indexOf(umami)).toBeLessThan(html.indexOf('</head>'));
  });

  it('keeps noindex pages out of robots while still canonicalizing them', () => {
    const html = publicLayout({
      title: 'Draft',
      description: '',
      config,
      body: '<p>Draft</p>',
      path: '/posts/draft.html',
      noindex: true,
    });

    expect(html).toContain('<meta name="robots" content="noindex,nofollow">');
    expect(html).toContain('<link rel="canonical" href="https://blog.lumio.games/posts/draft.html">');
  });

  it('uses site-owned footer copy instead of scaffold branding', () => {
    const html = publicLayout({
      title: 'Lumio Blog',
      description: 'Lumio notes',
      config,
      body: '<p>Hello</p>',
      path: '/',
    });

    expect(html).toContain('Lumio · Lumio Blog');
    expect(html).not.toContain('powered by opennote');
  });

  it('links generated utility pages that are inside the current public scope', () => {
    const html = publicLayout({
      title: 'Lumio Blog',
      description: 'Lumio notes',
      config,
      body: '<p>Hello</p>',
      path: '/',
    });

    expect(html).toContain('href="/graph/index.html"');
    expect(html).toContain('href="/newsletter/index.html"');
    expect(html).toContain('href="/folders/index.html"');
    expect(html).toContain('href="/feed/"');
    expect(html).not.toContain('href="/cli/index.html"');
  });

  it('does not link optional utility pages when the feature is disabled', () => {
    const html = publicLayout({
      title: 'Lumio Blog',
      description: 'Lumio notes',
      config: {
        ...config,
        features: {
          graph: false,
          newsletter: false,
        },
      },
      body: '<p>Hello</p>',
      path: '/',
    });

    expect(html).not.toContain('href="/graph/index.html"');
    expect(html).not.toContain('href="/newsletter/index.html"');
    expect(html).toContain('href="/folders/index.html"');
    expect(html).toContain('href="/feed/"');
    expect(html).not.toContain('href="/cli/index.html"');
  });
});
