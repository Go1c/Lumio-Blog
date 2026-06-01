import { describe, expect, it } from 'vitest';
import { normalize } from './normalize.js';
import { applyPublicationOverrides } from './publication-state.js';

function existing(overrides: Record<string, unknown>) {
  return {
    slug: 'hello',
    title: 'Hello',
    summary: '',
    body_html: '',
    body_text: '',
    kind: 'markdown',
    visibility: 'private',
    searchable: 0,
    seo_indexable: 0,
    rss_includable: 0,
    featured_on_home: 0,
    short_id: null,
    source_path: 'Work/hello.md',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    published_at: null,
    scheduled_at: null,
    word_count: 0,
    reading_minutes: 1,
    cover: null,
    hash: 'old',
    ...overrides,
  } as any;
}

describe('publication override resolution', () => {
  it('preserves admin publication state when source omits publication frontmatter', () => {
    const { note } = normalize({
      source_path: 'Work/hello.md',
      frontmatter: { title: 'Hello' },
      body: '# Hello\n\nBody',
      hash: 'new',
    });

    const resolved = applyPublicationOverrides(note, existing({
      visibility: 'public',
      searchable: 1,
      seo_indexable: 1,
      rss_includable: 1,
      featured_on_home: 1,
    }));

    expect(resolved).toMatchObject({
      visibility: 'public',
      searchable: true,
      seo_indexable: true,
      rss_includable: true,
      featured_on_home: true,
    });
  });

  it('lets explicit source visibility win over admin state', () => {
    const { note } = normalize({
      source_path: 'Work/hello.md',
      frontmatter: { title: 'Hello', visibility: 'private', searchable: true },
      body: '# Hello\n\nBody',
      hash: 'new',
    });

    const resolved = applyPublicationOverrides(note, existing({
      visibility: 'public',
      searchable: 1,
      seo_indexable: 1,
      rss_includable: 1,
      featured_on_home: 1,
    }));

    expect(resolved).toMatchObject({
      visibility: 'private',
      searchable: false,
      seo_indexable: false,
      rss_includable: false,
      featured_on_home: false,
    });
  });
});
