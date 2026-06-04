import { describe, expect, it } from 'vitest';
import { normalize } from './normalize.js';

describe('normalize', () => {
  it('fills defaults (private by default since PR #15)', () => {
    const { note } = normalize({
      source_path: 'posts/x.md',
      frontmatter: { title: 'Hello' },
      body: '# Hello\n\ncontent',
      hash: 'abc',
    });
    expect(note.slug).toBe('hello');
    // 默认 private — 隐私优先;用户必须 frontmatter 显式 visibility: public 才公开
    expect(note.visibility).toBe('private');
    expect(note.searchable).toBe(false);
    expect(note.seo_indexable).toBe(false);
    expect(note.rss_includable).toBe(false);
    expect(note.featured_on_home).toBe(false);
    expect(note.tags).toEqual([]);
  });

  it('respects frontmatter visibility: public', () => {
    const { note } = normalize({
      source_path: 'x.md',
      frontmatter: { title: 'X', visibility: 'public' },
      body: 'content',
      hash: 'abc',
    });
    expect(note.visibility).toBe('public');
    expect(note.searchable).toBe(true);
  });

  it('strips leading h1 from body when it matches title', () => {
    const { note } = normalize({
      source_path: 'x.md',
      frontmatter: {},
      body: '# Same Title\n\nbody text',
      hash: 'abc',
    });
    expect(note.title).toBe('Same Title');
    expect(note.body).toBe('body text');
  });

  it('keeps leading h1 if it does not match the (frontmatter) title', () => {
    const { note } = normalize({
      source_path: 'x.md',
      frontmatter: { title: 'Different' },
      body: '# Some Heading\n\nbody',
      hash: 'abc',
    });
    expect(note.title).toBe('Different');
    expect(note.body).toContain('# Some Heading');
  });

  it('forces searchable=false on link-only', () => {
    const { note, warnings } = normalize({
      source_path: 'x.md',
      frontmatter: { title: 'X', visibility: 'link-only', searchable: true },
      body: 'content',
      hash: 'abc',
    });
    expect(note.searchable).toBe(false);
    expect(warnings).toHaveLength(1);
  });

  it('forces searchable=false on private', () => {
    const { note } = normalize({
      source_path: 'x.md',
      frontmatter: { title: 'X', visibility: 'private', searchable: true },
      body: 'content',
      hash: 'abc',
    });
    expect(note.searchable).toBe(false);
  });

  it('falls back to filename for title', () => {
    const { note } = normalize({
      source_path: 'posts/my-note.md',
      frontmatter: {},
      body: 'no h1 here',
      hash: 'abc',
    });
    expect(note.title).toBe('my-note');
  });

  it('uses h1 if no title in frontmatter', () => {
    const { note } = normalize({
      source_path: 'x.md',
      frontmatter: {},
      body: '# From H1\n\ncontent',
      hash: 'abc',
    });
    expect(note.title).toBe('From H1');
  });
});
