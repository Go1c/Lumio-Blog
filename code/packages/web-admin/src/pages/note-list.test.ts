import { describe, expect, it } from 'vitest';
import {
  adjustVisibilityCounts,
  applyNoteVisibilityPatch,
  buildListVisibilityPatch,
  filterFoldersByVisibility,
  folderCountForFilter,
  formatNoteListHeader,
  NOTE_TABLE_CARD_STYLE,
  restoreFlatNote,
  restoreTreeNote,
  updateFlatNotesVisibility,
  updateTreeVisibility,
} from './note-list.js';

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

  it('filters folder cards by descendant visibility counts', () => {
    const folders = [
      {
        name: 'Public',
        path: 'Public',
        note_count: 3,
        updated_at: null,
        visibility_counts: { all: 3, public: 2, unlisted: 1, 'link-only': 0, private: 0 },
      },
      {
        name: 'Private',
        path: 'Private',
        note_count: 2,
        updated_at: null,
        visibility_counts: { all: 2, public: 0, unlisted: 0, 'link-only': 0, private: 2 },
      },
    ];

    expect(filterFoldersByVisibility(folders, 'public').map((folder) => folder.name)).toEqual(['Public']);
    expect(filterFoldersByVisibility(folders, 'private').map((folder) => folder.name)).toEqual(['Private']);
    expect(filterFoldersByVisibility(folders, 'all')).toHaveLength(2);
    expect(folderCountForFilter(folders[0]!, 'public')).toBe(2);
  });
});

describe('note list visibility quick action', () => {
  it('turns off every discoverability flag when switching to link-only or private', () => {
    expect(buildListVisibilityPatch('link-only')).toEqual({
      visibility: 'link-only',
      searchable: false,
      seo_indexable: false,
      rss_includable: false,
      featured_on_home: false,
    });
    expect(buildListVisibilityPatch('private')).toEqual({
      visibility: 'private',
      searchable: false,
      seo_indexable: false,
      rss_includable: false,
      featured_on_home: false,
    });
  });

  it('only changes visibility for public and unlisted quick actions', () => {
    expect(buildListVisibilityPatch('public')).toEqual({ visibility: 'public' });
    expect(buildListVisibilityPatch('unlisted')).toEqual({ visibility: 'unlisted' });
  });

  it('applies private changes locally without waiting for a full reload', () => {
    const source = note({ slug: 'a', visibility: 'public', searchable: true });
    const updated = applyNoteVisibilityPatch(source, 'private');

    expect(updated.visibility).toBe('private');
    expect(updated.searchable).toBe(false);
    expect(updated.updated_at).not.toBe(source.updated_at);
  });

  it('updates flat notes for one slug only', () => {
    const notes = [
      note({ slug: 'a', visibility: 'public' }),
      note({ slug: 'b', visibility: 'private', searchable: false }),
    ];

    const next = updateFlatNotesVisibility(notes, 'a', 'unlisted')!;

    expect(next.map((item) => item.visibility)).toEqual(['unlisted', 'private']);
    expect(next[1]).toBe(notes[1]);
  });

  it('updates current tree notes and visibility counts optimistically', () => {
    const tree = {
      path: '',
      breadcrumbs: [],
      folders: [],
      notes: [
        note({ slug: 'a', visibility: 'public' }),
        note({ slug: 'b', visibility: 'private', searchable: false }),
      ],
      visibility_counts: { all: 2, public: 1, unlisted: 0, 'link-only': 0, private: 1 },
    };

    const next = updateTreeVisibility(tree, 'a', 'private')!;

    expect(next.notes.map((item) => item.visibility)).toEqual(['private', 'private']);
    expect(next.visibility_counts).toEqual({
      all: 2,
      public: 0,
      unlisted: 0,
      'link-only': 0,
      private: 2,
    });
  });

  it('restores a failed optimistic update for the affected note only', () => {
    const previous = note({ slug: 'a', visibility: 'public', searchable: true });
    const flat = [
      applyNoteVisibilityPatch(previous, 'private'),
      note({ slug: 'b', visibility: 'private', searchable: false }),
    ];
    const tree = {
      path: '',
      breadcrumbs: [],
      folders: [],
      notes: flat,
      visibility_counts: { all: 2, public: 0, unlisted: 0, 'link-only': 0, private: 2 },
    };

    expect(restoreFlatNote(flat, previous)?.map((item) => item.visibility)).toEqual(['public', 'private']);
    expect(restoreTreeNote(tree, previous)?.visibility_counts).toEqual({
      all: 2,
      public: 1,
      unlisted: 0,
      'link-only': 0,
      private: 1,
    });
  });

  it('adjusts visibility counts without changing total count', () => {
    expect(adjustVisibilityCounts(
      { all: 3, public: 2, unlisted: 0, 'link-only': 0, private: 1 },
      'public',
      'private',
    )).toEqual({ all: 3, public: 1, unlisted: 0, 'link-only': 0, private: 2 });
  });
});

function note(overrides: Partial<{
  slug: string;
  title: string;
  visibility: 'public' | 'unlisted' | 'link-only' | 'private';
  searchable: boolean;
  short_id: string | null;
  updated_at: string;
  word_count: number;
  source_path: string;
}> = {}) {
  return {
    slug: overrides.slug ?? 'slug',
    title: overrides.title ?? 'Title',
    visibility: overrides.visibility ?? 'public',
    searchable: overrides.searchable ?? true,
    short_id: overrides.short_id ?? null,
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
    word_count: overrides.word_count ?? 10,
    source_path: overrides.source_path ?? 'Work/a.md',
  };
}
