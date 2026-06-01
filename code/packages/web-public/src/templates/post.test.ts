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
  body_html: '<p>Body</p>',
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
