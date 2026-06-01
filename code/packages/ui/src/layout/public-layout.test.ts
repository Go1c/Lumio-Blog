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
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
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
});
