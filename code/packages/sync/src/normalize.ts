import {
  type NormalizedNote,
  type ParsedNote,
  type Visibility,
  countWords,
  enforceVisibilityRules,
  slugify,
  stripMarkdown,
} from '@opennote/core';

export interface NormalizeWarning {
  source_path: string;
  message: string;
}

/**
 * 把 ParsedNote 补默认值、跑约束、算字数。
 * 不分配 short_id（那要查 db，留给 pipeline）。
 */
export function normalize(p: ParsedNote): {
  note: NormalizedNote;
  warnings: NormalizeWarning[];
} {
  const warnings: NormalizeWarning[] = [];

  const fm = p.frontmatter;
  const title =
    fm.title ??
    // fallback: 第一个 h1
    p.body.match(/^#\s+(.+)$/m)?.[1]?.trim() ??
    // fallback fallback: 文件名
    p.source_path.split('/').pop()?.replace(/\.md$/, '') ??
    'untitled';

  const slug = fm.slug ?? slugify(title);
  const visibility: Visibility = fm.visibility ?? 'public';

  const requestedSearchable = fm.searchable ?? visibility === 'public';
  const { searchable, warning } = enforceVisibilityRules(visibility, requestedSearchable);
  if (warning) warnings.push({ source_path: p.source_path, message: warning });

  const tags = (fm.tags ?? []).filter((t) => typeof t === 'string');
  const plain = stripMarkdown(p.body);
  const { words, minutes } = countWords(plain);

  return {
    note: {
      ...p,
      slug,
      title,
      visibility,
      searchable,
      short_id: fm.short_id ?? null,
      tags,
      word_count: words,
      reading_minutes: minutes,
    },
    warnings,
  };
}
