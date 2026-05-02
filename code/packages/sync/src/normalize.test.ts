import { describe, expect, it } from 'vitest';
import { normalize } from './normalize.js';

describe('normalize', () => {
  it('fills defaults', () => {
    const { note } = normalize({
      source_path: 'posts/x.md',
      frontmatter: { title: 'Hello' },
      body: '# Hello\n\ncontent',
      hash: 'abc',
    });
    expect(note.slug).toBe('hello');
    expect(note.visibility).toBe('public');
    expect(note.searchable).toBe(true);
    expect(note.tags).toEqual([]);
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
