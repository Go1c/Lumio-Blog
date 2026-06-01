import type { Frontmatter, NormalizedNote, NoteRow } from '@opennote/core';

export type PublicationState = Pick<
  NormalizedNote,
  'visibility' | 'searchable' | 'seo_indexable' | 'rss_includable' | 'featured_on_home'
>;

function hasFrontmatterKey(fm: Frontmatter, key: keyof Frontmatter): boolean {
  return Object.prototype.hasOwnProperty.call(fm, key);
}

/**
 * Admin publication toggles are stored in SQLite. Keep them across forced syncs
 * unless the source file explicitly declares publication frontmatter.
 */
export function applyPublicationOverrides(
  note: NormalizedNote,
  existing?: NoteRow,
): PublicationState {
  const fm = note.frontmatter;
  const sourceOwnsVisibility = hasFrontmatterKey(fm, 'visibility');
  const visibility = sourceOwnsVisibility ? note.visibility : (existing?.visibility ?? note.visibility);
  const restricted = visibility === 'private' || visibility === 'link-only';

  const flag = (
    key: 'searchable' | 'seo_indexable' | 'rss_includable' | 'featured_on_home',
  ): boolean => {
    if (restricted) return false;
    if (hasFrontmatterKey(fm, key)) return note[key];
    if (!sourceOwnsVisibility && existing) return Boolean(existing[key]);
    return note[key];
  };

  return {
    visibility,
    searchable: flag('searchable'),
    seo_indexable: flag('seo_indexable'),
    rss_includable: flag('rss_includable'),
    featured_on_home: flag('featured_on_home'),
  };
}
