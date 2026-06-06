import { describe, expect, it } from 'vitest';
import { buildFolderTree } from './routes/sync-meta.js';

describe('buildFolderTree', () => {
  it('adds descendant visibility counts to each folder entry', () => {
    const repo = {
      listAll: () => [
        note('a-public', 'A public', 'Guides/a.md', 'public'),
        note('a-private', 'A private', 'Guides/private.md', 'private'),
        note('b-link', 'B link', 'Drafts/b.md', 'link-only'),
      ],
    };

    const tree = buildFolderTree(repo as unknown as Parameters<typeof buildFolderTree>[0], '');

    expect(tree.visibility_counts).toEqual({
      all: 3,
      public: 1,
      unlisted: 0,
      'link-only': 1,
      private: 1,
    });
    expect(tree.folders.find((folder) => folder.name === 'Guides')?.visibility_counts).toEqual({
      all: 2,
      public: 1,
      unlisted: 0,
      'link-only': 0,
      private: 1,
    });
    expect(tree.folders.find((folder) => folder.name === 'Drafts')?.visibility_counts).toEqual({
      all: 1,
      public: 0,
      unlisted: 0,
      'link-only': 1,
      private: 0,
    });
  });
});

function note(slug: string, title: string, sourcePath: string, visibility: string) {
  return {
    slug,
    title,
    visibility,
    searchable: visibility === 'public',
    short_id: null,
    updated_at: '2026-01-01T00:00:00.000Z',
    word_count: 10,
    source_path: sourcePath,
  };
}
