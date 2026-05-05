import {
  type NormalizedNote,
  type NoteKind,
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
export function normalize(p: ParsedNote & { kind?: NoteKind }): {
  note: NormalizedNote;
  warnings: NormalizeWarning[];
} {
  const warnings: NormalizeWarning[] = [];

  const fm = p.frontmatter;
  const kind: NoteKind = p.kind ?? 'markdown';
  const fileStem = p.source_path.split('/').pop()?.replace(/\.(md|markdown|canvas|html|htm)$/i, '') ?? 'untitled';
  const title =
    fm.title ??
    // markdown 走 # 一级标题;非 markdown 直接用文件名
    (kind === 'markdown' ? p.body.match(/^#\s+(.+)$/m)?.[1]?.trim() : undefined) ??
    fileStem;

  const slug = fm.slug ?? slugify(title);
  const visibility: Visibility = fm.visibility ?? 'private';

  const requestedSearchable = fm.searchable ?? visibility === 'public';
  const { searchable, warning } = enforceVisibilityRules(visibility, requestedSearchable);
  if (warning) warnings.push({ source_path: p.source_path, message: warning });

  // 4 维 searchable — frontmatter 没显式给 → 跟 searchable 走;link-only/private 强制 false。
  const restricted = visibility === 'link-only' || visibility === 'private';
  const seoIndexable = restricted ? false : (fm.seo_indexable ?? searchable);
  const rssIncludable = restricted ? false : (fm.rss_includable ?? searchable);
  const featuredOnHome = restricted ? false : (fm.featured_on_home ?? false);

  const tags = (fm.tags ?? []).filter((t) => typeof t === 'string');
  // canvas / html 走自己的字数估算(后面 pipeline 渲染好后,从 plain text 重新算)
  const plain = kind === 'markdown' ? stripMarkdown(p.body) : '';
  const { words, minutes } = countWords(plain);

  return {
    note: {
      ...p,
      kind,
      slug,
      title,
      visibility,
      searchable,
      seo_indexable: seoIndexable,
      rss_includable: rssIncludable,
      featured_on_home: featuredOnHome,
      short_id: fm.short_id ?? null,
      tags,
      word_count: words,
      reading_minutes: minutes,
    },
    warnings,
  };
}
