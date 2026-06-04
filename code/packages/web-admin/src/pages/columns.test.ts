import { describe, expect, it } from 'vitest';
import type { NoteSummary } from '../api.js';
import { groupNotesByColumn } from './columns.js';

function note(slug: string, sourcePath: string): NoteSummary {
  return {
    slug,
    title: slug,
    visibility: 'private',
    searchable: false,
    short_id: null,
    updated_at: '2026-06-01T00:00:00.000Z',
    word_count: 100,
    source_path: sourcePath,
  };
}

describe('columns grouping', () => {
  it('groups real notes by first source_path segment', () => {
    const columns = groupNotesByColumn([
      note('render-a', 'render/a.md'),
      note('render-b', 'render/b.md'),
      note('tools-a', 'tools/a.md'),
      note('root-a', 'root.md'),
    ]);

    expect(columns.map((c) => [c.label, c.notes.length])).toEqual([
      ['render', 2],
      ['tools', 1],
      ['未归档', 1],
    ]);
  });
});
