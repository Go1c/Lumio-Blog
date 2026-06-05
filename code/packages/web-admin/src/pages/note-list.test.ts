import { describe, expect, it } from 'vitest';
import { formatNoteListHeader, NOTE_TABLE_CARD_STYLE } from './note-list.js';

describe('note list header', () => {
  it('summarizes the current tree path without hiding descendant notes', () => {
    const label = formatNoteListHeader('tree', {
      path: '',
      breadcrumbs: [],
      folders: new Array(8).fill(null).map((_, i) => ({
        name: `folder-${i}`,
        path: `folder-${i}`,
        note_count: 1,
        updated_at: null,
      })),
      notes: [],
      visibility_counts: {
        all: 258,
        public: 3,
        unlisted: 0,
        'link-only': 0,
        private: 255,
      },
    }, null);

    expect(label).toBe('8 目录 · 258 篇');
  });

  it('keeps the flat view summary focused on note count', () => {
    expect(formatNoteListHeader('flat', null, [{ slug: 'a' }, { slug: 'b' }] as any)).toBe('2 篇');
  });

  it('does not clip visibility dropdown menus inside the table card', () => {
    expect(NOTE_TABLE_CARD_STYLE.overflow).toBe('visible');
  });
});
